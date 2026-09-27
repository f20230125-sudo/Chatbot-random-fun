// The Claude integration, tested against a fake SDK that can fail in every
// way the real API can. No network calls.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createClaudeBrain, toMessages, systemPrompt, BrainError, DEFAULT_MODEL } from '../src/engine/claude.js';
import { friendlyBot } from './helpers.js';

class APIError extends Error { constructor(status, message) { super(message); this.status = status; } }
class APIUserAbortError extends APIError { constructor() { super(undefined, 'aborted'); } }
class APIConnectionError extends APIError { constructor() { super(undefined, 'Connection error.'); } }
class BadRequestError extends APIError {}
class AuthenticationError extends APIError {}
class PermissionDeniedError extends APIError {}
class NotFoundError extends APIError {}
class RateLimitError extends APIError {}
class InternalServerError extends APIError {}

const text = (t) => ({ type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: t } });
function fakeStream({ chunks = [], final, error, after = 0 }) {
  return {
    async *[Symbol.asyncIterator]() {
      let i = 0;
      for (const c of chunks) {
        if (error && i++ === after) throw error;
        yield typeof c === 'string' ? text(c) : c;
      }
      if (error && after >= chunks.length) throw error;
    },
    finalMessage: async () => final ?? { stop_reason: 'end_turn', model: DEFAULT_MODEL, content: [{ type: 'text', text: chunks.filter((c) => typeof c === 'string').join('') }] },
  };
}

/** Builds a fake SDK module whose streams are produced by `script`. */
function fakeSdk(script) {
  const calls = [];
  class Anthropic {
    static APIError = APIError; static APIUserAbortError = APIUserAbortError; static APIConnectionError = APIConnectionError;
    static BadRequestError = BadRequestError; static AuthenticationError = AuthenticationError; static PermissionDeniedError = PermissionDeniedError;
    static NotFoundError = NotFoundError; static RateLimitError = RateLimitError; static InternalServerError = InternalServerError;
    constructor(opts) {
      this.opts = opts;
      this.beta = { messages: { stream: (params, reqOpts) => { calls.push({ api: 'beta', params, reqOpts }); return script(params, 'beta', calls.length); } } };
      this.messages = { stream: (params, reqOpts) => { calls.push({ api: 'plain', params, reqOpts }); return script(params, 'plain', calls.length); } };
      this.models = { retrieve: async (id) => { calls.push({ api: 'models', id }); if (opts.apiKey === 'sk-ant-bad') throw new AuthenticationError(401, 'invalid x-api-key'); return { id }; } };
    }
  }
  return { module: { default: Anthropic }, calls };
}

const brainWith = (script, extra = {}) => {
  const sdk = fakeSdk(script);
  return { brain: createClaudeBrain({ apiKey: 'sk-ant-test', loadSdk: async () => sdk.module, browser: true, ...extra }), calls: sdk.calls };
};

test('streams text and sends the right request', async () => {
  const { brain, calls } = brainWith(() => fakeStream({ chunks: ['Hello', ' there', '!'] }));
  const seen = [];
  const out = await brain.respond({ system: 'sys', messages: [{ role: 'user', content: 'hi' }], onText: (s) => seen.push(s) });
  assert.equal(out.text, 'Hello there!');
  assert.deepEqual(seen, ['Hello', 'Hello there', 'Hello there!']);
  const p = calls[0].params;
  assert.equal(p.model, 'claude-opus-5');
  assert.equal(p.fallbacks, 'default');
  assert.deepEqual(p.betas, ['server-side-fallback-2026-07-01']);
  assert.deepEqual(p.output_config, { effort: 'low' });
  assert.equal(p.system, 'sys');
});

test('a server-side fallback throws away the declined partial answer', async () => {
  const { brain } = brainWith(() => fakeStream({
    chunks: ['Partial from the first model', { type: 'content_block_start', index: 1, content_block: { type: 'fallback' } }, 'Answer from the fallback'],
    final: { stop_reason: 'end_turn', content: [{ type: 'text', text: 'Partial from the first model' }, { type: 'fallback' }, { type: 'text', text: 'Answer from the fallback' }] },
  }));
  const out = await brain.respond({ system: '', messages: [{ role: 'user', content: 'x' }] });
  assert.equal(out.text, 'Answer from the fallback');
});

test('refusals, auth, rate limits, network errors and aborts are classified', async () => {
  const cases = [
    [() => fakeStream({ chunks: ['nope'], final: { stop_reason: 'refusal', content: [] } }), 'refusal'],
    [() => fakeStream({ error: new AuthenticationError(401, 'bad key') }), 'auth'],
    [() => fakeStream({ error: new RateLimitError(429, 'slow down') }), 'rate'],
    [() => fakeStream({ error: new InternalServerError(529, 'overloaded') }), 'overloaded'],
    [() => fakeStream({ error: new APIConnectionError() }), 'network'],
    [() => fakeStream({ chunks: ['half'], error: new APIUserAbortError(), after: 1 }), 'aborted'],
    [() => fakeStream({ error: new NotFoundError(404, 'model not found') }), 'model'],
    [() => fakeStream({ error: new BadRequestError(400, 'Your credit balance is too low') }), 'billing'],
  ];
  for (const [script, kind] of cases) {
    const { brain } = brainWith(script);
    await assert.rejects(brain.respond({ system: '', messages: [{ role: 'user', content: 'x' }] }), (err) => err instanceof BrainError && err.kind === kind, kind);
  }
});

test('a 400 on the optional extras retries once with a plain request', async () => {
  const { brain, calls } = brainWith((params, api) => (api === 'beta' ? fakeStream({ error: new BadRequestError(400, 'fallbacks: unsupported for this model') }) : fakeStream({ chunks: ['plain ok'] })));
  const out = await brain.respond({ system: '', messages: [{ role: 'user', content: 'x' }] });
  assert.equal(out.text, 'plain ok');
  assert.equal(calls[1].api, 'plain');
  assert.equal(calls[1].params.fallbacks, undefined);
});

test('verify() checks the key with a free models call', async () => {
  const sdk = fakeSdk(() => fakeStream({}));
  const good = createClaudeBrain({ apiKey: 'sk-ant-good', loadSdk: async () => sdk.module });
  await good.verify();
  const bad = createClaudeBrain({ apiKey: 'sk-ant-bad', loadSdk: async () => sdk.module });
  await assert.rejects(bad.verify(), (e) => e.kind === 'auth');
  const broken = createClaudeBrain({ apiKey: 'sk-ant-x', loadSdk: async () => { throw new Error('offline'); } });
  await assert.rejects(broken.verify(), (e) => e.kind === 'sdk');
  assert.throws(() => createClaudeBrain({ apiKey: '', loadSdk: async () => sdk.module }), BrainError);
});

test('the bot uses Claude for open questions but keeps games, tools and safety local', async () => {
  const { brain, calls } = brainWith(() => fakeStream({ chunks: ['Quantum entanglement links particles. 🤓'] }));
  const bot = await friendlyBot({ brain });
  let r = await bot.reply('explain quantum entanglement');
  assert.equal(r.source, 'claude');
  assert.match(r.text, /entanglement/);
  const n = calls.length;
  r = await bot.reply('what is 12 * 12');
  assert.equal(r.source, 'local');
  r = await bot.reply('play tic tac toe');
  assert.equal(r.source, 'local');
  r = await bot.reply('quit');
  r = await bot.reply('I want to kill myself');
  assert.equal(r.source, 'local');
  assert.match(r.text, /findahelpline/);
  assert.equal(calls.length, n, 'no Claude calls for local work');
  const sent = calls[0].params;
  assert.equal(sent.messages[0].role, 'user');
  assert.match(sent.system, /Noodle/);
  assert.match(sent.system, /Their name is Sam/);
});

test('when Claude fails, the user still gets an answer', async () => {
  const { brain } = brainWith(() => fakeStream({ error: new APIConnectionError() }));
  const bot = await friendlyBot({ brain });
  let r = await bot.reply('explain black holes');
  assert.match(r.text, /couldn't reach Claude/);
  assert.equal(bot.brain, brain, 'a network blip keeps Claude connected');

  const auth = brainWith(() => fakeStream({ error: new AuthenticationError(401, 'invalid key') }));
  const bot2 = await friendlyBot({ brain: auth.brain });
  r = await bot2.reply('explain black holes');
  assert.match(r.text, /didn't accept that API key/);
  assert.ok(r.actions.some((a) => a.type === 'brain-off'));
  assert.equal(bot2.brain, null, 'a rejected key switches back to offline mode');

  const refusal = brainWith(() => fakeStream({ final: { stop_reason: 'refusal', content: [] } }));
  const bot3 = await friendlyBot({ brain: refusal.brain });
  r = await bot3.reply('tell me something edgy about quarks');
  assert.match(r.text, /won't help with/);
});

test('conversation history is sent as valid alternating turns', () => {
  const msgs = toMessages([
    { role: 'assistant', text: 'Welcome!' },
    { role: 'user', text: 'hi' },
    { role: 'user', text: 'are you there?' },
    { role: 'assistant', text: 'yes' },
    { role: 'user', text: '' },
    { role: 'user', text: 'cool' },
  ]);
  assert.deepEqual(msgs, [
    { role: 'user', content: 'hi\n\nare you there?' },
    { role: 'assistant', content: 'yes' },
    { role: 'user', content: 'cool' },
  ]);
  assert.deepEqual(toMessages([{ role: 'assistant', text: 'hello' }]), []);
});

test('system prompt carries voice, mood, memory and honesty rules', () => {
  const s = systemPrompt({ voice: 'pirate', mood: 'grumpy', memory: 'Their name is Ana.', date: 'Monday 28 September 2026', game: 'Hangman' });
  assert.match(s, /pirate/);
  assert.match(s, /grumpy/);
  assert.match(s, /Ana/);
  assert.match(s, /cannot browse the web/);
  assert.match(s, /Hangman/);
  assert.match(s, /findahelpline/);
});

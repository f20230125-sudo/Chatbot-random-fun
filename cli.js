#!/usr/bin/env node
// Chat with Noodle in your terminal: `npm run cli`.
// Set ANTHROPIC_API_KEY (and run `npm install`) to give it Claude's brain.

import { createInterface } from 'node:readline';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { Noodle } from './src/engine/bot.js';
import { createClaudeBrain } from './src/engine/claude.js';
import { MOODS } from './src/engine/mood.js';

const tty = process.stdout.isTTY;
const c = (code) => (s) => (tty ? `\x1b[${code}m${s}\x1b[0m` : s);
const bold = c('1');
const dim = c('2');
const orange = c('38;5;209');
const purple = c('38;5;141');

const memoryFile = join(homedir(), '.noodle', 'memory.json');
const store = {
  load() { try { return JSON.parse(readFileSync(memoryFile, 'utf8')); } catch { return null; } },
  save(data) { try { mkdirSync(join(homedir(), '.noodle'), { recursive: true }); writeFileSync(memoryFile, JSON.stringify(data, null, 2)); } catch { /* read-only home: keep going */ } },
};

// Terminal-friendly Markdown: bold stays bold, the rest is stripped.
const md = (text) => text
  .replace(/```\w*\n?([\s\S]*?)```/g, (_, code) => dim(code.trimEnd()))
  .replace(/\*\*([^*]+)\*\*/g, (_, t) => bold(t))
  .replace(/(^|[^\w*])\*([^*\n]+)\*/g, '$1$2')
  .replace(/(^|[^\w_])_([^_\n]+)_/g, '$1$2')
  .replace(/`([^`]+)`/g, '$1')
  .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)');

async function makeBrain() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  try {
    await import('@anthropic-ai/sdk');
  } catch {
    console.log(dim('(ANTHROPIC_API_KEY is set, but the SDK is missing. Run `npm install` to enable Claude.)'));
    return null;
  }
  return createClaudeBrain({ apiKey, model: process.env.NOODLE_MODEL || undefined, loadSdk: () => import('@anthropic-ai/sdk') });
}

const bot = new Noodle({ store, brain: await makeBrain() });
const timers = new Map();
let busy = null;

function print(reply) {
  const face = MOODS[reply.mood]?.emoji ?? '🍜';
  const tag = reply.source === 'claude' ? purple(' [Claude]') : '';
  console.log(`\n${face} ${orange(bold('Noodle'))}${tag}: ${md(reply.text).replace(/\n/g, '\n   ')}`);
  if (reply.chips?.length) console.log(dim(`   ↳ try: ${reply.chips.map((ch) => ch.label).join('  ·  ')}`));
  for (const action of reply.actions ?? []) handle(action);
}

function handle(action) {
  if (action.type === 'timer') {
    timers.set(action.id, setTimeout(() => {
      timers.delete(action.id);
      process.stdout.write('\x07');
      print(bot.timerDone(action.id));
      rl.prompt();
    }, action.seconds * 1000));
  } else if (action.type === 'cancel-timers') {
    for (const t of timers.values()) clearTimeout(t);
    timers.clear();
  } else if (action.type === 'clear' && tty) {
    console.clear();
  } else if (action.type === 'confetti') {
    console.log('   🎉🎊✨🎉🎊✨🎉🎊✨');
  } else if (action.type === 'open-claude') {
    console.log(dim('   To connect Claude here: set ANTHROPIC_API_KEY, run `npm install`, and restart.'));
  } else if (action.type === 'export') {
    const file = `noodle-chat-${new Date().toISOString().slice(0, 10)}.md`;
    writeFileSync(file, bot.exportMarkdown());
    console.log(dim(`   Saved ${file}`));
  } else if (['theme', 'speech'].includes(action.type)) {
    console.log(dim('   (That setting only applies in the web app.)'));
  }
}

const rl = createInterface({ input: process.stdin, output: process.stdout, prompt: tty ? `\n${bold('You')}: ` : '' });
console.log(dim(`Noodle CLI · ${bot.brain ? `Claude connected (${bot.brain.model})` : 'offline mode'} · type /quit to leave`));
print(bot.greet());
rl.prompt();

async function handleLine(line) {
  if (/^\/(?:quit|exit|q)$/.test(line.trim())) { rl.close(); return; }
  if (!tty) console.log(`\n${bold('You')}: ${line}`);
  const controller = new AbortController();
  busy = controller;
  let streamed = false;
  const reply = await bot.reply(line, {
    signal: controller.signal,
    onText: (snapshot) => {
      if (!tty) return;
      streamed = true;
      process.stdout.write(`\r\x1b[2K🧠 ${orange(bold('Noodle'))}${purple(' [Claude]')}: ${snapshot.split('\n').pop().slice(-(process.stdout.columns ?? 80) + 20)}`);
    },
  });
  busy = null;
  if (streamed) process.stdout.write('\r\x1b[2K');
  print(reply);
  rl.prompt();
}

// Lines are handled one at a time, so piped input (echo "hi" | npm run cli) works too.
let queue = Promise.resolve();
let closing = false;
rl.on('line', (line) => { queue = queue.then(() => (closing && tty ? null : handleLine(line))); });
rl.on('SIGINT', () => {
  if (busy) { busy.abort(); return; }
  rl.close();
});
rl.on('close', () => {
  closing = true;
  queue.then(() => {
    // Timers keep the process alive only in an interactive session.
    for (const t of timers.values()) clearTimeout(t);
    if (tty) console.log(`\n${dim('Bye! 🍜')}`);
    process.exit(0);
  });
});

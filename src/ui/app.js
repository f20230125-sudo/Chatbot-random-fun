// Browser front end: wires the Noodle engine to the page.

import { Noodle } from '../engine/bot.js';
import { createClaudeBrain, MODELS, DEFAULT_MODEL, EFFORTS } from '../engine/claude.js';
import { VOICES } from '../engine/voices.js';
import { MOODS } from '../engine/mood.js';
import { renderMarkdown, escapeHtml } from './markdown.js';
import { createAvatar } from './avatar.js';
import { safeStorage, confetti, chime, createSpeaker, createListener, download } from './helpers.js';

// The Anthropic SDK is only fetched if you connect Claude.
const SDK_URL = 'https://cdn.jsdelivr.net/npm/@anthropic-ai/sdk@0.128.0/+esm';
const HISTORY_LIMIT = 80;

const local = safeStorage('local');
const session = safeStorage('session');
const $ = (sel) => document.querySelector(sel);
const log = $('#log');
const input = $('#input');
const form = $('#composer');
const sendBtn = $('#btn-send');

const bot = new Noodle({ store: { load: () => local.get('noodle.memory'), save: (d) => local.set('noodle.memory', d) } });
const avatars = [$('#avatar-big'), $('#avatar-small')].filter(Boolean).map((el) => createAvatar(el));
const speaker = createSpeaker({ onStart: () => speaking(true), onEnd: () => speaking(false) });
const timers = new Map();
let history = local.get('noodle.chat', []);
let busy = false;
let abort = null;
let lastUserText = '';

// ------------------------------------------------------------------ mood & face

function setMood(mood) {
  for (const a of avatars) a.setMood(mood);
  const label = `feeling ${MOODS[mood]?.label ?? mood}`;
  for (const el of document.querySelectorAll('[data-mood-label]')) el.textContent = label;
  document.documentElement.dataset.mood = mood;
}
function speaking(on) { for (const a of avatars) a.speak(on); }

let idleTimer = null;
document.addEventListener('pointermove', (e) => {
  for (const a of avatars) a.lookAt(e.clientX, e.clientY);
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => avatars.forEach((a) => a.lookRandom()), 5000);
}, { passive: true });

// ------------------------------------------------------------------ messages

// Measured *before* adding content, so a tall new message doesn't look like
// the reader has scrolled away.
let stickToBottom = true;
log.addEventListener('scroll', () => { stickToBottom = log.scrollHeight - log.scrollTop - log.clientHeight < 120; }, { passive: true });

function scrollToEnd(force = false) {
  if (!force && !stickToBottom) return;
  stickToBottom = true;
  log.scrollTop = log.scrollHeight;
}

function addMessage(role, text, { source = 'local', card = null, restored = false } = {}) {
  const row = document.createElement('div');
  row.className = `msg ${role}${restored ? ' restored' : ''}`;
  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  row.append(bubble);
  const who = document.createElement('span');
  who.className = 'sr-only';
  who.textContent = role === 'user' ? 'You said: ' : 'Noodle said: ';
  const body = document.createElement('div');
  body.className = 'body';
  bubble.append(who, body);
  const setText = (t) => {
    if (role === 'user') body.innerHTML = escapeHtml(t).replace(/\n/g, '<br>');
    else body.innerHTML = renderMarkdown(card?.type === 'tictactoe' ? t.replace(/```[\s\S]*?```\n?/, '') : t);
  };
  setText(text);
  if (role === 'bot' && source === 'claude') {
    const badge = document.createElement('span');
    badge.className = 'badge';
    badge.textContent = '🧠 Claude';
    badge.title = 'Answered by Claude';
    bubble.append(badge);
  }
  if (card) bubble.append(renderCard(card));
  log.append(row);
  scrollToEnd(role === 'user');
  return { row, setText };
}

function renderChips(chips) {
  clearChips();
  if (!chips?.length) return;
  const wrap = document.createElement('div');
  wrap.className = 'chips';
  wrap.setAttribute('role', 'group');
  wrap.setAttribute('aria-label', 'Suggested replies');
  for (const c of chips) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.textContent = c.label;
    b.addEventListener('click', () => send(c.value));
    wrap.append(b);
  }
  log.append(wrap);
  scrollToEnd();
}
function clearChips() { for (const el of log.querySelectorAll('.chips')) el.remove(); }

function showTyping() {
  const row = document.createElement('div');
  row.className = 'msg bot typing';
  row.innerHTML = '<div class="bubble"><span class="sr-only">Noodle is typing</span><span class="dots" aria-hidden="true"><i></i><i></i><i></i></span></div>';
  log.append(row);
  scrollToEnd();
  return row;
}

// ------------------------------------------------------------------ cards

function renderCard(card) {
  if (card.type === 'tictactoe') {
    const grid = document.createElement('div');
    grid.className = 'ttt';
    grid.setAttribute('role', 'grid');
    grid.setAttribute('aria-label', 'Tic-tac-toe board');
    card.cells.forEach((cell, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `ttt-cell${cell ? ` is-${cell.toLowerCase()}` : ''}${card.win?.includes(i) ? ' is-win' : ''}`;
      b.textContent = cell === 'X' ? '✕' : cell === 'O' ? '◯' : '';
      b.dataset.n = String(i + 1);
      b.disabled = !card.active || !!cell;
      b.setAttribute('aria-label', cell ? `Square ${i + 1}: ${cell}` : `Square ${i + 1}, empty`);
      b.addEventListener('click', () => send(String(i + 1)));
      grid.append(b);
    });
    return grid;
  }
  if (card.type === 'breathe') return breatheCard(card);
  return document.createComment('unknown card');
}

function breatheCard({ rounds = 4, seconds = 4 }) {
  const wrap = document.createElement('div');
  wrap.className = 'breathe';
  wrap.innerHTML = '<div class="breathe-circle"><span class="breathe-label" aria-live="polite">Ready…</span></div><button type="button" class="btn ghost small">Stop</button>';
  const circle = wrap.querySelector('.breathe-circle');
  const label = wrap.querySelector('.breathe-label');
  const phases = [['Breathe in', 'grow'], ['Hold', 'hold-big'], ['Breathe out', 'shrink'], ['Hold', 'hold-small']];
  let step = 0;
  let timer = null;
  const tick = () => {
    if (step >= rounds * 4) { label.textContent = 'Nice work 💛'; circle.className = 'breathe-circle done'; wrap.querySelector('button').remove(); return; }
    const [text, cls] = phases[step % 4];
    label.textContent = `${text}…`;
    circle.className = `breathe-circle ${cls}`;
    circle.style.setProperty('--dur', `${seconds}s`);
    step++;
    timer = setTimeout(tick, seconds * 1000);
  };
  timer = setTimeout(tick, 600);
  wrap.querySelector('button').addEventListener('click', () => { clearTimeout(timer); step = rounds * 4; tick(); });
  return wrap;
}

function deactivateOldCards() {
  for (const b of log.querySelectorAll('.ttt-cell:not(:disabled)')) b.disabled = true;
}

// ------------------------------------------------------------------ sending

function saveHistory(entry) {
  history = [...history, entry].slice(-HISTORY_LIMIT);
  local.set('noodle.chat', history);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function send(raw) {
  const text = String(raw ?? input.value);
  if (busy) return;
  if (!text.trim()) { input.classList.remove('wiggle'); void input.offsetWidth; input.classList.add('wiggle'); input.focus(); return; }
  input.value = '';
  autosize();
  clearChips();
  deactivateOldCards();
  lastUserText = text;
  const user = addMessage('user', text);
  saveHistory({ role: 'user', text });
  busy = true;
  setSendMode(true);
  const typing = showTyping();
  const controller = new AbortController();
  abort = controller;
  let stream = null;
  let pending = '';
  let frame = 0;
  const started = performance.now();
  if (bot.brain) setMood('thinking');

  const reply = await bot.reply(text, {
    signal: controller.signal,
    onText: (snapshot) => {
      if (!stream) { typing.remove(); stream = addMessage('bot', '', { source: 'claude' }); speaking(true); }
      pending = snapshot;
      frame ||= requestAnimationFrame(() => { frame = 0; stream.setText(pending); scrollToEnd(); });
    },
  });

  // A beat of "typing" makes instant local replies feel less robotic.
  if (!stream) await sleep(Math.max(0, Math.min(900, 280 + reply.text.length * 3) - (performance.now() - started)));
  cancelAnimationFrame(frame);
  typing.remove();
  speaking(false);
  if (reply.redactedInput) { user.setText(reply.redactedInput); history[history.length - 1] = { role: 'user', text: reply.redactedInput }; local.set('noodle.chat', history); }
  if (stream && reply.source === 'claude' && !reply.card) stream.setText(reply.text);
  else {
    stream?.row.remove();
    addMessage('bot', reply.text, { source: reply.source, card: reply.card });
  }
  saveHistory({ role: 'bot', text: reply.text, source: reply.source });
  renderChips(reply.chips);
  setMood(reply.mood);
  speaker.say(reply.text);
  busy = false;
  abort = null;
  setSendMode(false);
  for (const action of reply.actions ?? []) handleAction(action);
  if (matchMedia('(pointer: fine)').matches) input.focus();
}

function setSendMode(stopping) {
  sendBtn.classList.toggle('is-stop', stopping);
  sendBtn.setAttribute('aria-label', stopping ? 'Stop' : 'Send');
  sendBtn.title = stopping ? 'Stop (Esc)' : 'Send (Enter)';
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  if (busy && abort) { abort.abort(); return; }
  send();
});

input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); form.requestSubmit(); }
  else if (e.key === 'ArrowUp' && !input.value && lastUserText) { e.preventDefault(); input.value = lastUserText; autosize(); }
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (busy && abort) abort.abort();
    closeMenus();
  }
  if (e.key === '/' && document.activeElement !== input && !e.target.closest?.('input, textarea, select')) { e.preventDefault(); input.focus(); }
});

function autosize() {
  input.style.height = 'auto';
  input.style.height = `${Math.min(input.scrollHeight, 180)}px`;
}
input.addEventListener('input', autosize);

// ------------------------------------------------------------------ actions from replies

function handleAction(action) {
  switch (action.type) {
    case 'confetti': confetti(); break;
    case 'theme': setTheme(action.value === 'toggle' ? nextTheme() : action.value); break;
    case 'speech': setSpeech(action.value); break;
    case 'voice': renderVoiceMenu(); break;
    case 'clear': clearChat(); break;
    case 'forgot': history = []; local.remove('noodle.chat'); renderVoiceMenu(); break;
    case 'export': exportChat(); break;
    case 'open-claude': openClaude(); break;
    case 'brain-off': disconnectClaude(action.reason === 'auth'); break;
    case 'timer': startTimer(action); break;
    case 'cancel-timers': for (const t of timers.values()) clearTimeout(t); timers.clear(); break;
    case 'alarm': chime(); break;
    default: break;
  }
}

function startTimer({ id, seconds }) {
  if (seconds >= 60 && 'Notification' in window && Notification.permission === 'default') Notification.requestPermission().catch(() => {});
  timers.set(id, setTimeout(() => {
    timers.delete(id);
    const reply = bot.timerDone(id);
    addMessage('bot', reply.text);
    saveHistory({ role: 'bot', text: reply.text });
    renderChips(reply.chips);
    setMood(reply.mood);
    chime();
    speaker.say(reply.text);
    if (document.hidden) {
      const original = document.title;
      document.title = "⏰ Time's up! · Noodle";
      addEventListener('focus', () => { document.title = original; }, { once: true });
      if ('Notification' in window && Notification.permission === 'granted') {
        try { new Notification("⏰ Time's up!", { body: reply.text.replace(/[*_]/g, ''), icon: 'icon.svg' }); } catch { /* not allowed here */ }
      }
    }
  }, seconds * 1000));
}

function clearChat() {
  log.innerHTML = '';
  history = [];
  local.remove('noodle.chat');
  const reply = { text: '🧹 Squeaky clean! What shall we do now?', chips: [{ label: 'Play a game', value: 'Play a game' }, { label: 'Tell me a joke', value: 'Tell me a joke' }] };
  addMessage('bot', reply.text);
  renderChips(reply.chips);
}

function exportChat() {
  const stamp = new Date().toISOString().slice(0, 10);
  const lines = ['# Chat with Noodle 🍜', `_Exported ${new Date().toLocaleString()}_`, ''];
  for (const h of history) lines.push(`**${h.role === 'user' ? 'You' : 'Noodle'}:** ${h.text}`, '');
  download(`noodle-chat-${stamp}.md`, lines.join('\n'));
}

// ------------------------------------------------------------------ theme, speech, voices, menus

const THEMES = ['auto', 'light', 'dark'];
function setTheme(mode) {
  const m = THEMES.includes(mode) ? mode : 'auto';
  if (m === 'auto') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = m;
  local.set('noodle.theme', m);
  const btn = $('#btn-theme');
  btn.dataset.state = m;
  btn.title = `Theme: ${m}`;
  btn.setAttribute('aria-label', `Theme: ${m}. Click to change.`);
}
function nextTheme() {
  const dark = matchMedia('(prefers-color-scheme: dark)').matches;
  const current = local.get('noodle.theme', 'auto');
  const effective = current === 'auto' ? (dark ? 'dark' : 'light') : current;
  return effective === 'dark' ? 'light' : 'dark';
}
$('#btn-theme').addEventListener('click', () => setTheme(nextTheme()));

function setSpeech(on) {
  speaker.enabled = on;
  local.set('noodle.speech', speaker.enabled);
  const btn = $('#btn-speak');
  btn.setAttribute('aria-pressed', String(speaker.enabled));
  btn.title = speaker.enabled ? 'Reading replies aloud (click to mute)' : 'Read replies aloud';
}
if (speaker.supported) {
  $('#btn-speak').hidden = false;
  $('#btn-speak').addEventListener('click', () => setSpeech(!speaker.enabled));
}

function renderVoiceMenu() {
  const menu = $('#menu-voice');
  menu.innerHTML = '<p class="menu-title">Noodle\'s voice</p>';
  for (const [id, v] of Object.entries(VOICES)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('role', 'menuitemradio');
    b.setAttribute('aria-checked', String(bot.memory.voice === id));
    b.innerHTML = `<span>${v.emoji}</span> ${escapeHtml(v.name)}`;
    b.addEventListener('click', () => { closeMenus(); send(id === 'classic' ? 'Normal voice' : `Talk like a ${v.name.toLowerCase()}`); });
    menu.append(b);
  }
}

function toggleMenu(btn, menu) {
  const open = menu.hidden;
  closeMenus();
  if (open) {
    menu.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    menu.querySelector('button')?.focus();
  }
}
function closeMenus() {
  for (const m of document.querySelectorAll('.menu')) m.hidden = true;
  for (const b of document.querySelectorAll('[aria-expanded="true"]')) b.setAttribute('aria-expanded', 'false');
}
$('#btn-voice').addEventListener('click', (e) => { e.stopPropagation(); renderVoiceMenu(); toggleMenu(e.currentTarget, $('#menu-voice')); });
$('#btn-menu').addEventListener('click', (e) => { e.stopPropagation(); toggleMenu(e.currentTarget, $('#menu-more')); });
document.addEventListener('click', (e) => { if (!e.target.closest('.menu')) closeMenus(); });
$('#menu-more').addEventListener('click', (e) => {
  const action = e.target.closest('[data-action]')?.dataset.action;
  if (!action) return;
  closeMenus();
  ({
    help: () => send('What can you do?'),
    export: exportChat,
    clear: () => send('Clear the chat'),
    forget: () => send('Forget me'),
    claude: openClaude,
    theme: () => setTheme(nextTheme()),
    voice: () => { renderVoiceMenu(); toggleMenu($('#btn-menu'), $('#menu-voice')); },
  })[action]?.();
});

for (const b of document.querySelectorAll('[data-say]')) b.addEventListener('click', () => send(b.dataset.say));
$('#btn-dice').addEventListener('click', () => send('Surprise me'));

// ------------------------------------------------------------------ microphone

const listener = createListener({
  onText: (text, final) => {
    input.value = text;
    autosize();
    if (final) { $('#btn-mic').classList.remove('is-live'); send(text); }
  },
  onState: (state, detail) => {
    $('#btn-mic').classList.toggle('is-live', state === 'listening');
    if (state === 'error' && detail === 'not-allowed') addMessage('bot', "🎤 I can't hear you: microphone access was blocked. You can allow it in your browser's site settings.");
  },
});
if (listener.supported) {
  $('#btn-mic').hidden = false;
  $('#btn-mic').addEventListener('click', () => (listener.listening ? listener.stop() : listener.start()));
}

// ------------------------------------------------------------------ Claude connection

const dialog = $('#claude-dialog');
const keyInput = $('#claude-key');
const status = $('#claude-status');

for (const m of MODELS) $('#claude-model').append(new Option(m.label, m.id));
for (const e of EFFORTS) $('#claude-effort').append(new Option(`${e[0].toUpperCase()}${e.slice(1)}${e === 'low' ? ' (snappiest)' : ''}`, e));

function makeBrain({ key, model, effort }) {
  return createClaudeBrain({ apiKey: key, model, effort, browser: true, loadSdk: () => import(/* @vite-ignore */ SDK_URL) });
}

function updateModeUI() {
  const btn = $('#btn-mode');
  const online = navigator.onLine;
  btn.classList.toggle('is-claude', !!bot.brain);
  btn.textContent = bot.brain ? (online ? '🧠 Claude' : '🧠 Claude (offline)') : '🍜 Offline mode';
  btn.title = bot.brain ? `Connected to ${bot.brain.model}. Click to change.` : 'Runs fully in your browser. Click to connect Claude.';
  for (const el of document.querySelectorAll('[data-mode-label]')) el.textContent = bot.brain ? `Claude connected (${bot.brain.model})` : 'Offline brain · no data leaves your device';
  $('#claude-disconnect').hidden = !bot.brain;
}

function openClaude() {
  const saved = local.get('noodle.claude') ?? session.get('noodle.claude');
  keyInput.value = saved?.key ?? '';
  $('#claude-model').value = saved?.model ?? DEFAULT_MODEL;
  $('#claude-effort').value = saved?.effort ?? 'low';
  $('#claude-remember').checked = !!local.get('noodle.claude');
  status.textContent = bot.brain ? `✅ Connected to ${bot.brain.model}.` : '';
  status.className = 'status';
  if (typeof dialog.showModal === 'function') dialog.showModal(); else dialog.setAttribute('open', '');
  keyInput.focus();
}
$('#btn-mode').addEventListener('click', openClaude);
$('#claude-cancel').addEventListener('click', () => dialog.close());

$('#claude-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const key = keyInput.value.trim();
  const model = $('#claude-model').value;
  const effort = $('#claude-effort').value;
  if (!/^sk-ant-/.test(key)) {
    status.textContent = '🤔 That doesn\'t look like an Anthropic API key (they start with "sk-ant-").';
    status.className = 'status is-error';
    return;
  }
  status.textContent = '🔌 Checking your key…';
  status.className = 'status';
  $('#claude-connect').disabled = true;
  try {
    const brain = makeBrain({ key, model, effort });
    await brain.verify();
    bot.setBrain(brain);
    const settings = { key, model, effort };
    local.remove('noodle.claude');
    session.remove('noodle.claude');
    ($('#claude-remember').checked ? local : session).set('noodle.claude', settings);
    updateModeUI();
    dialog.close();
    const text = `🧠 **Claude is connected!** (${model}) Now I can answer just about anything, in any language. Games and tools still run on my trusty offline noodle.`;
    addMessage('bot', text);
    saveHistory({ role: 'bot', text });
    setMood('excited');
    confetti();
  } catch (err) {
    const why = {
      auth: 'That key was rejected. Double-check you copied all of it.',
      permission: "That key isn't allowed to use this model.",
      model: 'That model isn\'t available for your key. Try the default.',
      network: 'Couldn\'t reach Anthropic. Are you online?',
      sdk: "Couldn't download the Anthropic SDK. Are you online (or is a content blocker in the way)?",
      rate: 'Rate limited. Wait a moment and try again.',
      billing: 'Anthropic reported a billing problem for this key.',
    }[err.kind] ?? `Something went wrong: ${err.message}`;
    status.textContent = `❌ ${why}`;
    status.className = 'status is-error';
  } finally {
    $('#claude-connect').disabled = false;
  }
});

function disconnectClaude(forgetKey = true) {
  bot.setBrain(null);
  if (forgetKey) { local.remove('noodle.claude'); session.remove('noodle.claude'); }
  updateModeUI();
}
$('#claude-disconnect').addEventListener('click', () => {
  disconnectClaude(true);
  dialog.close();
  addMessage('bot', '🍜 Claude disconnected. Back to my offline noodle brain, and your key has been removed from this browser.');
});

addEventListener('online', updateModeUI);
addEventListener('offline', updateModeUI);

// ------------------------------------------------------------------ start up

function restore() {
  const saved = local.get('noodle.claude') ?? session.get('noodle.claude');
  if (saved?.key) {
    try { bot.setBrain(makeBrain(saved)); } catch { /* bad saved settings: stay offline */ }
  }
  setTheme(local.get('noodle.theme', 'auto'));
  if (speaker.supported) setSpeech(local.get('noodle.speech', false));
  for (const h of history) {
    addMessage(h.role, h.text, { source: h.source, restored: true });
    bot.pushTranscript(h.role === 'user' ? 'user' : 'assistant', h.text);
  }
  if (history.length) {
    const sep = document.createElement('div');
    sep.className = 'separator';
    sep.textContent = 'Earlier';
    log.prepend(sep);
  }
  const hello = bot.greet();
  addMessage('bot', hello.text);
  saveHistory({ role: 'bot', text: hello.text });
  renderChips(hello.chips);
  setMood(hello.mood);
  for (const a of hello.actions) handleAction(a);
  updateModeUI();
  renderVoiceMenu();
  scrollToEnd(true);
}

restore();
window.__noodleReady = true;
window.noodle = bot; // for tinkering in the dev console: noodle.reply('hi').then(console.log)

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

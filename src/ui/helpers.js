// Small browser helpers: storage that never throws, confetti, speech in and
// out, and a gentle alarm sound. Each one degrades quietly when unsupported.

import { toPlainText } from './markdown.js';

/** localStorage/sessionStorage wrapper: private windows and full disks just fall back to memory. */
export function safeStorage(kind = 'local') {
  const mem = new Map();
  let store = null;
  try {
    store = kind === 'session' ? globalThis.sessionStorage : globalThis.localStorage;
    const probe = '__noodle_probe__';
    store.setItem(probe, '1');
    store.removeItem(probe);
  } catch { store = null; }
  return {
    get(key, fallback = null) {
      try {
        const raw = store ? store.getItem(key) : mem.get(key);
        return raw == null ? fallback : JSON.parse(raw);
      } catch { return fallback; }
    },
    set(key, value) {
      const raw = JSON.stringify(value);
      try { if (store) store.setItem(key, raw); else mem.set(key, raw); } catch { mem.set(key, raw); }
    },
    remove(key) {
      try { store?.removeItem(key); } catch { /* ignore */ }
      mem.delete(key);
    },
  };
}

const reducedMotion = () => globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** A short burst of confetti on a throwaway canvas. */
export function confetti() {
  if (reducedMotion() || typeof document === 'undefined') return;
  const canvas = document.createElement('canvas');
  canvas.className = 'confetti';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.append(canvas);
  const ctx = canvas.getContext('2d');
  if (!ctx) { canvas.remove(); return; }
  const dpr = Math.min(2, globalThis.devicePixelRatio || 1);
  const resize = () => { canvas.width = innerWidth * dpr; canvas.height = innerHeight * dpr; };
  resize();
  const colors = ['#ff7a59', '#ffd166', '#06d6a0', '#4cc9f0', '#b388ff', '#ff5d8f'];
  const pieces = Array.from({ length: 140 }, () => ({
    x: innerWidth / 2 + (Math.random() - 0.5) * 120,
    y: innerHeight * 0.35,
    vx: (Math.random() - 0.5) * 14,
    vy: -Math.random() * 13 - 4,
    size: 5 + Math.random() * 6,
    rot: Math.random() * Math.PI,
    spin: (Math.random() - 0.5) * 0.3,
    color: colors[Math.floor(Math.random() * colors.length)],
    shape: Math.random() < 0.3 ? 'circle' : 'rect',
  }));
  const start = performance.now();
  function frame(t) {
    const elapsed = t - start;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (const p of pieces) {
      p.vy += 0.32;
      p.vx *= 0.99;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.spin;
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - elapsed / 2600);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      if (p.shape === 'circle') { ctx.beginPath(); ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2); ctx.fill(); }
      else ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size / 1.6);
      ctx.restore();
    }
    if (elapsed < 2600) requestAnimationFrame(frame);
    else canvas.remove();
  }
  requestAnimationFrame(frame);
}

/** Two soft beeps for timers. */
export function chime() {
  try {
    const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AC) return;
    const ac = new AC();
    [0, 0.28, 0.56].forEach((when, i) => {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = 'sine';
      osc.frequency.value = i === 2 ? 1046.5 : 880;
      gain.gain.setValueAtTime(0.0001, ac.currentTime + when);
      gain.gain.exponentialRampToValueAtTime(0.25, ac.currentTime + when + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + when + 0.25);
      osc.connect(gain).connect(ac.destination);
      osc.start(ac.currentTime + when);
      osc.stop(ac.currentTime + when + 0.3);
    });
    setTimeout(() => ac.close?.(), 1500);
  } catch { /* audio blocked: the on-screen message is enough */ }
}

/** Text-to-speech for Noodle's replies. */
export function createSpeaker({ onStart, onEnd } = {}) {
  const synth = globalThis.speechSynthesis;
  const supported = !!synth && typeof globalThis.SpeechSynthesisUtterance === 'function';
  let enabled = false;
  function pickVoice() {
    const voices = synth.getVoices?.() ?? [];
    return voices.find((v) => /en[-_](GB|US)/i.test(v.lang) && /natural|neural|google|samantha|aria|jenny/i.test(v.name))
      ?? voices.find((v) => /^en/i.test(v.lang)) ?? null;
  }
  return {
    supported,
    get enabled() { return enabled; },
    set enabled(v) { enabled = !!v && supported; if (!enabled) synth?.cancel(); },
    say(text) {
      if (!enabled || !supported) return;
      const plain = toPlainText(text);
      if (!plain) return;
      synth.cancel();
      const u = new SpeechSynthesisUtterance(plain.slice(0, 600));
      const voice = pickVoice();
      if (voice) u.voice = voice;
      u.rate = 1.03;
      u.pitch = 1.1;
      u.onstart = () => onStart?.();
      u.onend = u.onerror = () => onEnd?.();
      synth.speak(u);
    },
    stop() { synth?.cancel(); },
  };
}

/** Speech-to-text via the Web Speech API (Chrome, Edge, Safari). */
export function createListener({ onText, onState } = {}) {
  const Rec = globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition;
  if (!Rec) return { supported: false, start() {}, stop() {} };
  let rec = null;
  let listening = false;
  return {
    supported: true,
    get listening() { return listening; },
    start() {
      if (listening) return;
      rec = new Rec();
      rec.lang = navigator.language || 'en-US';
      rec.interimResults = true;
      rec.maxAlternatives = 1;
      rec.onresult = (e) => {
        let text = '';
        for (const r of e.results) text += r[0].transcript;
        onText?.(text, e.results[e.results.length - 1].isFinal);
      };
      rec.onerror = (e) => onState?.('error', e.error);
      rec.onend = () => { listening = false; onState?.('stopped'); };
      try { rec.start(); listening = true; onState?.('listening'); } catch (err) { onState?.('error', err.message); }
    },
    stop() { try { rec?.stop(); } catch { /* already stopped */ } },
  };
}

export function download(filename, text, type = 'text/markdown') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

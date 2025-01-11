// Small, dependency-free helpers shared by the engine. Everything here runs
// unchanged in the browser and in Node.

/** Seeded PRNG (mulberry32). Tests pass a seed; the app uses Math.random. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function rng() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const pick = (rng, list) => list[Math.floor(rng() * list.length)];
export const randInt = (rng, lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));
export const chance = (rng, p) => rng() < p;

export function shuffle(rng, list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Hands out items in a shuffled order without repeats until the deck runs
 * out, so the bot never tells the same joke twice in a row.
 */
export class Deck {
  constructor(items, rng) {
    this.items = items;
    this.rng = rng;
    this.queue = [];
    this.last = undefined;
  }
  draw() {
    if (this.queue.length === 0) {
      this.queue = shuffle(this.rng, this.items);
      // Avoid the reshuffle putting the previous item first.
      if (this.queue.length > 1 && this.queue[this.queue.length - 1] === this.last) {
        this.queue.unshift(this.queue.pop());
      }
    }
    this.last = this.queue.pop();
    return this.last;
  }
}

const ZERO_WIDTH = /[​-‍⁠﻿]/g;
// Control characters except tab and newline.
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g;

/** Strips invisible junk from raw user input without changing its meaning. */
export function clean(raw) {
  return String(raw ?? '')
    .normalize('NFKC')
    .replace(ZERO_WIDTH, '')
    .replace(/\r\n?/g, '\n')
    .replace(CONTROL, '')
    .trim();
}

const CONTRACTIONS = [
  [/\bwon'?t\b/g, 'will not'],
  [/\bcan'?t\b/g, 'cannot'],
  [/\bain'?t\b/g, 'is not'],
  [/\bshan'?t\b/g, 'shall not'],
  [/\blet'?s\b/g, 'let us'],
  [/\b(i)'m\b/g, 'i am'],
  [/\bim\b/g, 'i am'],
  [/\b(\w+)n't\b/g, '$1 not'],
  [/\b(dont|doesnt|didnt|isnt|arent|wasnt|werent|havent|hasnt|wouldnt|shouldnt|couldnt)\b/g, (w) => `${w.slice(0, -2)} not`],
  [/\b(\w+)'re\b/g, '$1 are'],
  [/\b(\w+)'ve\b/g, '$1 have'],
  [/\b(\w+)'ll\b/g, '$1 will'],
  [/\b(\w+)'d\b/g, '$1 would'],
  [/\b(what|who|where|when|why|how|that|there|here|it|he|she|name)'s\b/g, '$1 is'],
  [/\b(whats|wheres|whos|hows|thats|theres|heres)\b/g, (w) => `${w.slice(0, -1)} is`],
  [/\bits\b(?= (a|an|the|my|so|very|too|not|just|really|been|getting|raining|sunny|late|early|time|over|ok|okay|fine|cold|hot)\b)/g, 'it is'],
];

// Casual spellings people actually type, mapped to what the patterns expect.
const SLANG = {
  u: 'you', ur: 'your', r: 'are', ya: 'you', yu: 'you', pls: 'please', plz: 'please', plox: 'please',
  thx: 'thanks', thnx: 'thanks', ty: 'thank you', tysm: 'thank you so much', tnx: 'thanks',
  wanna: 'want to', gonna: 'going to', gotta: 'got to', gimme: 'give me', lemme: 'let me',
  wat: 'what', wut: 'what', wot: 'what', wht: 'what', whats: 'what is', hw: 'how',
  idk: 'i do not know', dunno: 'do not know', idc: 'i do not care', luv: 'love', bc: 'because', cuz: 'because', coz: 'because',
  k: 'ok', kk: 'ok', okey: 'okay', okie: 'okay', oki: 'okay', yep: 'yes', yup: 'yes', yeah: 'yes', yea: 'yes',
  nope: 'no', nah: 'no', naw: 'no', rn: 'right now', btw: 'by the way', tho: 'though', abt: 'about',
  hru: 'how are you', wbu: 'what about you', hbu: 'how about you', wyd: 'what are you doing', gn: 'good night', gm: 'good morning',
  bday: 'birthday', youre: 'you are', theyre: 'they are', ure: 'you are', urself: 'yourself', convo: 'conversation', pic: 'picture', msg: 'message', ppl: 'people', sry: 'sorry', srry: 'sorry',
  hii: 'hi', hiii: 'hi', helo: 'hello', hellow: 'hello', heyy: 'hey', heyyy: 'hey', hallo: 'hello',
};

/**
 * Lower-cased, contraction-expanded, punctuation-free form used for intent
 * matching. Digits and letters from every script are kept.
 */
export function plain(text) {
  let s = String(text).toLowerCase().replace(/[‘’´`]/g, "'").replace(/[“”]/g, '"');
  for (const [re, rep] of CONTRACTIONS) s = s.replace(re, rep);
  s = s.replace(/'/g, '').replace(/[^\p{L}\p{N}\s]+/gu, ' ').replace(/\s+/g, ' ').trim();
  return s
    .split(' ')
    .map((w) => SLANG[w] ?? w)
    .join(' ');
}

export const words = (s) => (s.match(/[\p{L}\p{N}']+/gu) ?? []);

/** Optimal-string-alignment distance with an early exit once it exceeds `max`. */
export function editDistance(a, b, max = Infinity) {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const prev2 = new Array(b.length + 1).fill(0);
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, prev2[j - 2] + 1);
      cur[j] = v;
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return max + 1;
    for (let j = 0; j <= b.length; j++) prev2[j] = prev[j];
    prev = cur;
  }
  return prev[b.length];
}

/** 0..1 similarity based on edit distance. */
export function similarity(a, b) {
  if (!a.length && !b.length) return 1;
  return 1 - editDistance(a, b) / Math.max(a.length, b.length);
}

/** How many typos a word of this length may contain and still match. */
export const typoBudget = (len) => (len >= 8 ? 2 : len >= 4 ? 1 : 0);

export function fuzzyEquals(a, b) {
  if (a === b) return true;
  const budget = Math.min(typoBudget(a.length), typoBudget(b.length));
  return budget > 0 && editDistance(a, b, budget) <= budget;
}

export const capitalize = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
export const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
export const article = (word) => (/^(?:[aeio]|u(?![ns]i|ni))/i.test(word) || /^hour/i.test(word) ? 'an' : 'a');
export const withArticle = (word) => `${article(word)} ${word}`;

export function formatNumber(n) {
  if (!Number.isFinite(n)) return String(n);
  if (Number.isInteger(n) && Math.abs(n) < 1e21) return n.toLocaleString('en-US');
  const abs = Math.abs(n);
  if (abs !== 0 && (abs >= 1e15 || abs < 1e-6)) return n.toExponential(6).replace(/\.?0+e/, 'e');
  return String(Number(n.toPrecision(12)));
}

export function listJoin(items, conj = 'and') {
  if (items.length <= 1) return items.join('');
  if (items.length === 2) return `${items[0]} ${conj} ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, ${conj} ${items[items.length - 1]}`;
}

export const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const REFLECT = {
  i: 'you', me: 'you', my: 'your', mine: 'yours', myself: 'yourself', am: 'are', was: 'were',
  you: 'I', your: 'my', yours: 'mine', yourself: 'myself', are: 'am', we: 'you', our: 'your', us: 'you',
};

/** Swaps pronouns so "I lost my keys" can be echoed as "you lost your keys". */
export function reflect(fragment) {
  return fragment
    .split(/\s+/)
    .map((w, i, all) => {
      const lower = w.toLowerCase();
      // "are you" -> "am I", but "you are" -> "I am"; "you" as an object becomes "me".
      if (lower === 'you' && i > 0 && !/^(are|were|and)$/.test(all[i - 1].toLowerCase()) && i === all.length - 1) return 'me';
      return REFLECT[lower] ?? w;
    })
    .join(' ');
}

/** Strips trailing punctuation and quotes from a captured phrase. */
export const trimPhrase = (s) => s.replace(/^[\s"'“”‘’]+|[\s"'“”‘’.!?,;:]+$/g, '').trim();

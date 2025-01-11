// Dice, coins, pickers, text tricks, number trivia, passwords and timers.

import { pick, randInt, plural, formatNumber, listJoin, trimPhrase, capitalize } from '../util.js';
import { wordsToNumbers } from './calc.js';

// ---------------------------------------------------------------- randomness

export function rollDice(count, sides, mod, rng) {
  const rolls = Array.from({ length: count }, () => randInt(rng, 1, sides));
  return { rolls, total: rolls.reduce((a, b) => a + b, 0) + mod };
}

const SUITS = [['Spades', '♠️'], ['Hearts', '♥️'], ['Diamonds', '♦️'], ['Clubs', '♣️']];
const RANKS = ['Ace', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'Jack', 'Queen', 'King'];

/** Explicit randomness commands. `lower` is the lower-cased message. */
export function tryRandom(lower, rng) {
  const s = wordsToNumbers(lower);
  let m;

  // Dice: "roll 3d6+2", "roll a d20", "roll 2 dice", or bare "2d6".
  m = s.match(/(?:^|\broll\b.*?)(\d*)\s*d(\d+)\s*(?:([+-])\s*(\d+))?\b/) ;
  if (m && (/\broll\b/.test(s) || /^\s*\d*d\d+/.test(s))) {
    return diceReply(m[1] ? +m[1] : 1, +m[2], m[3] ? (m[3] === '-' ? -m[4] : +m[4]) : 0, rng);
  }
  if (/\broll\b.*\b(?:dice|die|a d|the dice)\b|\broll (?:a|one|the)? ?(?:dice|die)\b|^(?:dice|roll)$/.test(s)) {
    const n = s.match(/\broll (\d+) (?:dice|die)/);
    return diceReply(n ? +n[1] : 1, 6, 0, rng);
  }

  // Coins.
  if (/\b(?:flip|toss)\b.*\bcoins?\b|\bheads or tails\b|\bcoin (?:flip|toss)\b|^flip$/.test(s)) {
    const n = Math.min(+(s.match(/\b(\d+) coins\b/)?.[1] ?? 1), 20);
    if (n <= 0) return { text: '🪙 Flipping zero coins… done! Easiest job ever.' };
    if (n === 1) {
      if (rng() < 0.002) return { text: '🪙 *flip*… it landed on its **edge**?! That almost never happens. Flip again?', chips: ['Flip a coin'] };
      return { text: `🪙 *flip*… **${rng() < 0.5 ? 'Heads' : 'Tails'}**!`, chips: ['Flip again'] };
    }
    const flips = Array.from({ length: n }, () => (rng() < 0.5 ? 'H' : 'T'));
    const heads = flips.filter((f) => f === 'H').length;
    return { text: `🪙 ${flips.join(' ')}\n**${heads}** heads, **${n - heads}** tails.`, chips: ['Flip again'] };
  }

  // Random number in a range.
  m = s.match(/\b(?:random|pick a|choose a|give me a|generate a)\s*(?:random\s*)?(?:number|integer|digit)(?:\s*(?:between|from)\s*(-?\d+)\s*(?:and|to|-)\s*(-?\d+))?/);
  if (m) {
    let lo = m[1] !== undefined ? +m[1] : 1;
    let hi = m[2] !== undefined ? +m[2] : 100;
    if (lo > hi) [lo, hi] = [hi, lo];
    if (hi - lo > 1e12) return { text: "🎰 That range is enormous! Keep it under a trillion and I'll pick." };
    return { text: `🎰 I pick **${formatNumber(randInt(rng, lo, hi))}** (between ${formatNumber(lo)} and ${formatNumber(hi)}).`, chips: ['Another number'] };
  }

  // Cards.
  if (/\b(?:pick|draw|deal|give me|pull)(?: me)? (?:a|one|1|another) (?:random )?card\b/.test(s)) {
    if (rng() < 0.02) return { text: '🃏 You drew… **the Joker**! Wild card. Just like you.' };
    const [suit, icon] = pick(rng, SUITS);
    return { text: `🃏 You drew the **${pick(rng, RANKS)} of ${suit}** ${icon}`, chips: ['Draw another card'] };
  }

  // Explicit choices: "pick between pizza, tacos or sushi".
  m = lower.match(/^(?:can you |could you |please |pls |noodle )?(?:help me )?(?:choose|pick|decide|select)(?: for me)?(?: between| from| one of| among)?(?::)?\s+(.+)$/);
  if (m) {
    const options = splitOptions(m[1]);
    if (options.length >= 2) return choiceReply(options, rng);
  }
  if (/\byes or no\b/.test(s)) return { text: `🎲 ${rng() < 0.5 ? '**Yes!** ✅' : '**No.** ❌'} (The noodle has spoken.)` };
  return null;
}

function diceReply(count, sides, mod, rng) {
  if (sides === 0) return { text: '🎲 A zero-sided die? That\'s just a very philosophical marble.' };
  if (sides === 1) return { text: '🎲 A one-sided die always lands on **1**. Mathematically thrilling.' };
  if (count === 0) return { text: '🎲 Rolling zero dice… the result is pure potential. ✨' };
  if (count > 100 || sides > 1000) return { text: '🎲 Whoa, that many dice would roll off the table! Keep it to 100 dice with up to 1000 sides.' };
  const { rolls, total } = rollDice(count, sides, mod, rng);
  const spec = `${count}d${sides}${mod ? (mod > 0 ? `+${mod}` : mod) : ''}`;
  let text = count === 1 && !mod
    ? `🎲 Rolled a d${sides}: **${total}**`
    : `🎲 Rolled ${spec}: [${rolls.join(', ')}]${mod ? ` ${mod > 0 ? '+' : '−'} ${Math.abs(mod)}` : ''} = **${total}**`;
  const actions = [];
  if (sides === 20 && count === 1) {
    if (rolls[0] === 20) { text += '\n**NATURAL 20! Critical hit!** 🎉'; actions.push({ type: 'confetti' }); }
    if (rolls[0] === 1) text += '\n**Natural 1.** Critical fail. 💀 The dragon is laughing at you.';
  }
  return { text, chips: [`Roll ${spec} again`], actions, mood: 'excited' };
}

export function splitOptions(text) {
  return trimPhrase(text)
    .replace(/^(?:between|from)\s+/i, '')
    .split(/\s*(?:,|;|\/|\bor\b|\band\b|\bvs\.?\b|\bversus\b)\s*/i)
    .map((o) => trimPhrase(o).replace(/^(?:a|an|the|to)\s+/i, ''))
    .filter((o) => o && o.length <= 60);
}

const CHOICE_REASONS = ['My noodle tingled.', 'Trust the noodle.', 'Final answer, no take-backs.', 'The vibes are clear.', 'I flipped a very scientific coin.', 'It just feels right.', "Don't overthink it!"];

export function choiceReply(options, rng) {
  const unique = [...new Set(options.map((o) => o.toLowerCase()))];
  if (unique.length === 1) return { text: `🤔 You gave me only one option: **${options[0]}**. Easy choice!` };
  const choice = pick(rng, options);
  return { text: `🎯 I choose **${choice}**! ${pick(rng, CHOICE_REASONS)}`, chips: ['Pick again'] };
}

// ---------------------------------------------------------------- text tricks

const MORSE = {
  a: '.-', b: '-...', c: '-.-.', d: '-..', e: '.', f: '..-.', g: '--.', h: '....', i: '..', j: '.---', k: '-.-', l: '.-..', m: '--',
  n: '-.', o: '---', p: '.--.', q: '--.-', r: '.-.', s: '...', t: '-', u: '..-', v: '...-', w: '.--', x: '-..-', y: '-.--', z: '--..',
  0: '-----', 1: '.----', 2: '..---', 3: '...--', 4: '....-', 5: '.....', 6: '-....', 7: '--...', 8: '---..', 9: '----.',
  '.': '.-.-.-', ',': '--..--', '?': '..--..', '!': '-.-.--', "'": '.----.', '/': '-..-.', '@': '.--.-.', '&': '.-...', ':': '---...', '=': '-...-',
};
const FROM_MORSE = Object.fromEntries(Object.entries(MORSE).map(([k, v]) => [v, k]));

export const toMorse = (text) => text.toLowerCase().split(' ').filter(Boolean)
  .map((w) => [...w].map((c) => MORSE[c] ?? '').filter(Boolean).join(' ')).join(' / ');
export const fromMorse = (code) => code.trim().split(/\s*\/\s*|\s{3,}/)
  .map((w) => w.split(/\s+/).map((c) => FROM_MORSE[c] ?? '?').join('')).join(' ');

const ROMAN = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
export function toRoman(n) {
  let out = '';
  for (const [v, s] of ROMAN) while (n >= v) { out += s; n -= v; }
  return out;
}
export function fromRoman(s) {
  const up = s.toUpperCase();
  if (!/^M{0,3}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/.test(up) || !up) return null;
  const vals = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
  let total = 0;
  for (let i = 0; i < up.length; i++) {
    const v = vals[up[i]];
    total += vals[up[i + 1]] > v ? -v : v;
  }
  return total;
}

const quoteOrRest = (s) => trimPhrase(s.replace(/^(?:the (?:word|phrase|text|sentence|name)\s+)/i, ''));

/** Text transformations. Takes the raw message so casing is preserved. */
export function tryText(raw) {
  const lower = raw.toLowerCase();
  let m;

  // "how many r's in strawberry" — the classic chatbot trap.
  m = raw.match(/how many (?:of )?(?:the )?(?:letter )?["'‘’]?([a-z])["'‘’]?(?:['‘’]?s)?\s+(?:(?:are there|are|appear|occur)\s+)?in\s+(?:the word\s+)?["'‘’]?([^"'‘’?]+?)["'‘’]?\s*\??$/i)
    ?? raw.match(/how many times does (?:the letter )?["'‘’]?([a-z])["'‘’]? (?:appear|occur|show up|come up) in (?:the word )?["'‘’]?([^"'‘’?]+?)["'‘’]?\s*\??$/i);
  if (m) {
    const letter = m[1].toLowerCase();
    const word = m[2].trim();
    const count = [...word.toLowerCase()].filter((c) => c === letter).length;
    const shown = word.replace(new RegExp(`(${letter}+)`, 'gi'), '**$1**');
    return { text: count ? `🔤 "${word}" has **${count}** × ${letter}: ${shown}` : `🔤 There's no "${letter}" in "${word}" at all!` };
  }
  m = raw.match(/^(?:how many|count(?: the)?) (letters|characters|chars|words|vowels|consonants)(?: are)? (?:in|does)\s+(.+?)\??$/i);
  if (m) {
    const target = quoteOrRest(m[2].replace(/\s+(?:have|contain)$/i, ''));
    const kind = m[1].toLowerCase();
    let n;
    if (kind === 'words') n = (target.match(/\S+/g) ?? []).length;
    else if (kind === 'vowels') n = (target.match(/[aeiou]/gi) ?? []).length;
    else if (kind === 'consonants') n = (target.match(/[b-df-hj-np-tv-z]/gi) ?? []).length;
    else if (kind === 'letters') n = (target.match(/\p{L}/gu) ?? []).length;
    else n = [...target].length;
    return { text: `🔢 "${target}" has **${n}** ${kind === 'chars' ? 'characters' : kind}${n === 1 ? '' : ''}.` };
  }
  m = raw.match(/^(?:reverse|mirror)\s+(.+)$/i) ?? raw.match(/^(?:say|spell|write)\s+(.+?)\s+backwards?$/i) ?? raw.match(/^(.+?) backwards$/i);
  if (m && !/^(?:a |the )?(?:coin|card)s?$/i.test(m[1])) {
    const target = quoteOrRest(m[1]);
    return { text: `🔁 ${[...target].reverse().join('')}` };
  }
  m = raw.match(/^(?:uppercase|upper case|capitalize|shout|make (.+?) (?:uppercase|upper case|caps|all caps))\s*(.*)$/i);
  if (m) {
    const target = quoteOrRest(m[1] ?? m[2] ?? '');
    if (target) return { text: `📢 ${target.toUpperCase()}` };
  }
  m = raw.match(/^(?:lowercase|lower case|whisper|make (.+?) (?:lowercase|lower case))\s*(.*)$/i);
  if (m) {
    const target = quoteOrRest(m[1] ?? m[2] ?? '');
    if (target) return { text: `🤫 ${target.toLowerCase()}` };
  }
  m = raw.match(/^is\s+["']?(.+?)["']?\s+a\s+palindrome\??$/i);
  if (m) {
    const letters = m[1].toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
    const yes = letters.length > 0 && letters === [...letters].reverse().join('');
    return { text: yes ? `✅ Yes! "${m[1]}" reads the same backwards. 🔁` : `❌ Nope, "${m[1]}" backwards is "${[...m[1]].reverse().join('')}".` };
  }
  // Morse.
  m = raw.match(/^(?:translate |convert |say |write |spell )?["']?(.+?)["']?\s+(?:in|to|into) morse(?: code)?\??$/i) ?? raw.match(/^morse(?: code)?(?: for)?:?\s+(.+)$/i);
  if (m) {
    const code = toMorse(m[1]);
    return code ? { text: `📡 \`${code}\`` } : { text: "📡 I couldn't find any letters or numbers to turn into Morse." };
  }
  if (/^[.\-\s/]{3,}$/.test(raw) && /[.-]/.test(raw) && /\s/.test(raw.trim())) {
    return { text: `📡 That Morse says: **${fromMorse(raw).toUpperCase()}**` };
  }
  // Binary and hex.
  m = lower.match(/^(?:what is |convert )?(-?\d+) (?:in|to|into) (binary|hex|hexadecimal|octal)\??$/);
  if (m) {
    const n = parseInt(m[1], 10);
    const base = m[2] === 'binary' ? 2 : m[2] === 'octal' ? 8 : 16;
    const prefix = base === 2 ? '0b' : base === 8 ? '0o' : '0x';
    return { text: `💾 ${formatNumber(n)} in ${m[2]} is \`${n < 0 ? '-' : ''}${prefix}${Math.abs(n).toString(base).toUpperCase()}\`` };
  }
  m = raw.match(/^(?:translate |convert |say |write )?["']?(.+?)["']?\s+(?:in|to|into) binary\??$/i);
  if (m && !/^\d+$/.test(m[1])) {
    const bytes = [...new TextEncoder().encode(m[1])].map((b) => b.toString(2).padStart(8, '0'));
    if (bytes.length > 64) return { text: '💾 That\'s a lot of text! Keep it under 64 characters for binary.' };
    return { text: `💾 \`${bytes.join(' ')}\`` };
  }
  if (/^(?:[01]{8}\s*){1,64}$/.test(raw.trim())) {
    try {
      const bytes = raw.trim().split(/\s+/).map((b) => parseInt(b, 2));
      const text = new TextDecoder('utf-8', { fatal: true }).decode(new Uint8Array(bytes));
      if (/^[\p{L}\p{N}\p{P}\p{Zs}\p{Emoji}]+$/u.test(text)) return { text: `💾 That binary spells: **${text}**` };
    } catch { /* not valid UTF-8 text */ }
  }
  m = raw.match(/^0x([0-9a-f]+)\s*(?:in|to)\s*(?:decimal|dec|numbers?)?\??$/i);
  if (m) return { text: `💾 0x${m[1].toUpperCase()} is **${formatNumber(parseInt(m[1], 16))}** in decimal.` };
  // Roman numerals.
  m = lower.match(/\b(\d+) (?:in|to|into|as) roman(?: numerals?)?\b/) ?? lower.match(/\broman numerals? (?:for|of) (\d+)\b/);
  if (m) {
    const n = +m[1];
    if (n < 1 || n > 3999) return { text: '🏛️ Roman numerals only go from 1 to 3999. (The Romans never needed a noodle budget bigger than that.)' };
    return { text: `🏛️ ${n} in Roman numerals is **${toRoman(n)}**.` };
  }
  m = raw.match(/^(?:what is |what's |whats |convert )?([MDCLXVI]+)(?: in (?:numbers?|arabic|decimal))?\s*\??$/) ?? lower.match(/^(?:what is )?(?:roman numeral )?([mdclxvi]+) in (?:numbers?|arabic|decimal)\??$/);
  if (m && m[1].length >= 2) {
    const n = fromRoman(m[1]);
    if (n) return { text: `🏛️ ${m[1].toUpperCase()} is **${n}**.` };
  }
  return null;
}

// ---------------------------------------------------------------- number trivia

const NUMBER_TRIVIA = {
  0: 'Zero was treated as a number in its own right by Indian mathematicians like Brahmagupta around 628 CE.',
  1: "It's the loneliest number, and the only positive number that's neither prime nor composite.",
  3: 'Good things come in threes. Also, a triangle.',
  7: 'The most popular "favourite number" in surveys worldwide.',
  12: 'A dozen! Also the number of months, zodiac signs and inches in a foot.',
  13: 'Considered unlucky in many places. Some buildings skip the 13th floor.',
  21: 'The number of spots on a standard six-sided die (1+2+3+4+5+6).',
  42: 'The Answer to the Ultimate Question of Life, the Universe, and Everything.',
  64: 'The number of squares on a chessboard.',
  69: 'Nice.',
  100: 'A century! Water boils at 100 °C at sea level.',
  101: 'The course number for every introduction to anything.',
  108: 'Considered sacred in Hinduism, Buddhism and Jainism.',
  256: 'The number of values in a byte (2⁸).',
  314: 'The first three digits of π.',
  365: 'Days in a (non-leap) year.',
  404: 'Not found. 🔍',
  420: 'Nice.',
  666: 'The "number of the beast". Spooky!',
  777: 'A jackpot on slot machines. 🎰',
  1000: 'A millennium, a kilo, a grand.',
  1024: 'A kibibyte: 2¹⁰ bytes.',
  1337: 'L33T. Very elite.',
  1729: 'The Hardy–Ramanujan number: the smallest number expressible as the sum of two cubes in two different ways.',
  2048: 'The tile you were never going to reach in that game.',
};

function factorize(n) {
  const factors = [];
  let x = n;
  for (let p = 2; p * p <= x && factors.length < 40; p += p === 2 ? 1 : 2) {
    while (x % p === 0) { factors.push(p); x /= p; }
  }
  if (x > 1) factors.push(x);
  return factors;
}

const isSquare = (n) => Number.isInteger(Math.sqrt(n));
const isFib = (n) => isSquare(5 * n * n + 4) || isSquare(5 * n * n - 4);

export function numberFacts(n) {
  if (!Number.isFinite(n)) return '♾️ That number is too big for my noodle!';
  if (!Number.isInteger(n)) {
    if (Math.abs(n - Math.PI) < 1e-4) return '🥧 That looks like π! It goes on forever without repeating.';
    return `🔢 ${formatNumber(n)} isn't a whole number, so it's ${n < 1 && n > 0 ? 'somewhere between 0 and 1' : 'a decimal'}. As a fraction-ish thing, it's roughly ${formatNumber(Math.round(n * 100) / 100)}.`;
  }
  const abs = Math.abs(n);
  if (abs > Number.MAX_SAFE_INTEGER) return `🔢 ${formatNumber(n)} is too big for me to analyse precisely. It's a *very* big number.`;
  const facts = [];
  if (n < 0) facts.push('negative');
  facts.push(n % 2 === 0 ? 'even' : 'odd');
  if (n >= 2) {
    const f = factorize(abs);
    if (f.length === 1) facts.push('**prime** ✨');
    else if (abs <= 1e12) facts.push(`= ${f.join(' × ')}`);
  }
  if (n > 1 && isSquare(n)) facts.push(`a perfect square (${Math.sqrt(n)}²)`);
  if (n > 1 && Math.round(Math.cbrt(n)) ** 3 === n) facts.push(`a perfect cube (${Math.round(Math.cbrt(n))}³)`);
  if (n > 1 && n <= 1e15 && isFib(n)) facts.push('a Fibonacci number');
  const lines = [`🔢 **${formatNumber(n)}** is ${listJoin(facts)}.`];
  lines.push(`Binary \`${n < 0 ? '-' : ''}${abs.toString(2)}\` · Hex \`${n < 0 ? '-' : ''}${abs.toString(16).toUpperCase()}\`${abs >= 1 && abs <= 3999 && n > 0 ? ` · Roman **${toRoman(n)}**` : ''}`);
  if (NUMBER_TRIVIA[n]) lines.push(`💡 ${NUMBER_TRIVIA[n]}`);
  else if (n > 9000 && n < 10000) lines.push("💡 It's over 9000!!");
  return lines.join('\n');
}

// ---------------------------------------------------------------- passwords

export function makePassword(length = 16) {
  const sets = ['ABCDEFGHJKLMNPQRSTUVWXYZ', 'abcdefghijkmnopqrstuvwxyz', '23456789', '!@#$%^&*-_=+?'];
  const all = sets.join('');
  const bytes = new Uint32Array(length + sets.length);
  const cryptoObj = globalThis.crypto;
  if (!cryptoObj?.getRandomValues) return null;
  cryptoObj.getRandomValues(bytes);
  const chars = sets.map((set, i) => set[bytes[i] % set.length]);
  for (let i = sets.length; i < length; i++) chars.push(all[bytes[i] % all.length]);
  // Fisher-Yates with the remaining random words so required chars aren't always first.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = bytes[(i + sets.length) % bytes.length] % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

// ---------------------------------------------------------------- timers

const UNIT_SECONDS = {
  s: 1, sec: 1, secs: 1, second: 1, seconds: 1, m: 60, min: 60, mins: 60, minute: 60, minutes: 60,
  h: 3600, hr: 3600, hrs: 3600, hour: 3600, hours: 3600, d: 86400, day: 86400, days: 86400,
};

/** "5 minutes", "1h 30m", "half an hour", "90 sec" -> seconds, or null. */
export function parseDuration(text) {
  let s = wordsToNumbers(text.toLowerCase())
    .replace(/\bhalf an hour\b|\bhalf hour\b/g, '30 minutes')
    .replace(/\bquarter of an hour\b|\bquarter hour\b/g, '15 minutes')
    .replace(/\b(?:an|a) (hour|minute|second)\b/g, '1 $1')
    .replace(/\b(\d+) and a half (hours?|minutes?)\b/g, (_, n, u) => `${n}.5 ${u}`)
    .replace(/\b(\d+) (hours?|minutes?) and a half\b/g, (_, n, u) => `${n}.5 ${u}`);
  let total = 0;
  let found = false;
  for (const m of s.matchAll(/(\d+(?:\.\d+)?)\s*(seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d)\b/g)) {
    total += parseFloat(m[1]) * UNIT_SECONDS[m[2]];
    found = true;
  }
  if (!found) {
    const bare = s.match(/^\s*(\d+(?:\.\d+)?)\s*$/);
    if (bare) { total = parseFloat(bare[1]) * 60; found = true; } // "timer 5" = 5 minutes
  }
  return found ? Math.round(total) : null;
}

export function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h && plural(h, 'hour'), m && plural(m, 'minute'), s && plural(s, 'second')].filter(Boolean).join(' ') || '0 seconds';
}

/** Timer commands. Returns { text, action } or null. */
export function tryTimer(lower) {
  if (/\b(?:cancel|stop|clear|delete|remove)\b.*\b(?:timers?|alarms?|reminders?)\b/.test(lower)) {
    return { action: { type: 'cancel-timers' } };
  }
  const askHowLong = { text: '⏰ How long should the timer be? Try "timer for 5 minutes" or "remind me in 1 hour to stretch".' };
  if (/^(?:please |can you |could you )?(?:set|start|make|create)?\s*(?:a |an |me a )?(?:timer|alarm)(?: please)?$/.test(lower)) return askHowLong;
  const m = lower.match(/\b(?:set|start|make|create)?\s*(?:a |an |me a )?(?:timer|alarm|countdown|reminder)\s*(?:for|of|in)?\s+(.+)$/)
    ?? lower.match(/\bremind me\s+(.+)$/)
    ?? lower.match(/\bwake me(?: up)? in\s+(.+)$/)
    ?? lower.match(/^(\d+\s*(?:s|sec|secs|seconds?|m|min|mins|minutes?|h|hr|hrs|hours?))\s+timer$/);
  if (!m) return null;
  let rest = m[1].replace(/[?!.]+$/, '').replace(/^(?:in|after)\s+/, '');
  let label = '';
  // "to stretch in 10 minutes" puts the label first; "10 minutes to stretch" puts it last.
  const labelFirst = rest.match(/^(?:to\s+)?(.+?)\s+(?:in|after)\s+(.+)$/);
  const labelLast = rest.match(/^(.*?)\s+(?:to|for|called|named|labelled|labeled|so i can|so that i)\s+(.+)$/);
  if (labelFirst && parseDuration(labelFirst[1]) === null && parseDuration(labelFirst[2]) !== null) {
    label = trimPhrase(labelFirst[1]); rest = labelFirst[2];
  } else if (labelLast && parseDuration(labelLast[1]) !== null) {
    rest = labelLast[1]; label = trimPhrase(labelLast[2]);
  }
  const seconds = parseDuration(rest);
  if (seconds === null) return /\btimer\b|\bremind me\b/.test(lower) ? askHowLong : null;
  if (seconds < 1) return { text: '⏰ That timer would be over before it started! Give me at least a second.' };
  if (seconds > 86400) return { text: "⏰ I can only keep timers up to 24 hours. My memory is noodle-shaped, and noodles go soggy." };
  label = label.replace(/\bmy\b/g, 'your').replace(/\bme\b/g, 'you');
  return {
    text: `⏰ Timer set for **${formatDuration(seconds)}**${label ? ` to ${label}` : ''}. I'll ping you here when it's done. (Keep this tab open!)`,
    action: { type: 'timer', seconds, label: label ? capitalize(label) : '' },
  };
}

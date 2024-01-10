// Number guessing, both ways round. When the bot guesses, it uses binary
// search and notices if the "higher"/"lower" answers stop adding up.

import { randInt, pick } from '../util.js';
import { wordsToNumbers } from '../tools/calc.js';

const HIGHER = /\b(?:higher|bigger|greater|more|up|larger|too low|go higher|go up|above)\b|⬆️|👆/u;
const LOWER = /\b(?:lower|smaller|less|down|too high|go lower|go down|below|fewer)\b|⬇️|👇/u;
const CORRECT = /\b(?:yes|yep|yeah|correct|right|got it|you got it|thats it|that is it|bingo|exactly|yup|spot on|nailed it|you win|thats right|that is right|ding)\b|✅|🎯/u;

function parseNumber(text) {
  const t = wordsToNumbers(text.toLowerCase()).replace(/,(?=\d{3})/g, '');
  const m = t.match(/^\s*(?:is it |maybe |i guess |i think |how about |what about |guess |my guess is |it is |its )?(-?\d+(?:\.\d+)?)\s*[?!.]*\s*$/);
  return m ? parseFloat(m[1]) : null;
}

export const guessNumber = {
  id: 'guess',
  title: 'Guess my number',
  emoji: '🔢',
  blurb: 'I pick 1–100, you guess',
  start({ rng, p }) {
    const max = /\b1000\b/.test(p) ? 1000 : 100;
    const state = { secret: randInt(rng, 1, max), max, tries: 0, last: null, guesses: [] };
    return { state, reply: { text: `🔢 I'm thinking of a number between **1 and ${max}**. Take a guess!`, mood: 'playful' } };
  },
  move({ text, rng }, state) {
    const n = parseNumber(text);
    if (n === null) return null;
    if (!Number.isInteger(n)) return { reply: { text: '🙃 Whole numbers only! No decimals in my noodle.' } };
    if (n < 1 || n > state.max) return { reply: { text: `🙃 It's between 1 and ${state.max}!` } };
    if (state.guesses.includes(n)) return { reply: { text: `🔁 You already guessed ${n}! It's ${n < state.secret ? 'higher' : 'lower'} than that.` } };
    state.tries++;
    state.guesses.push(n);
    if (n === state.secret) {
      const optimal = Math.ceil(Math.log2(state.max + 1));
      const rating = state.tries === 1 ? '🤯 First try?! Are you reading my mind?' : state.tries <= optimal ? '🧠 That\'s binary-search level efficiency!' : state.tries <= optimal + 3 ? '🙂 Nicely done!' : '😅 Got there in the end!';
      return {
        reply: { text: `🎉 **${n} is right!** You got it in **${state.tries}** ${state.tries === 1 ? 'guess' : 'guesses'}. ${rating}`, chips: ['Play again', 'You guess my number', 'Something else'], mood: 'excited', actions: [{ type: 'confetti' }] },
        done: true,
        outcome: 'win',
      };
    }
    const dir = n < state.secret ? '⬆️ Higher!' : '⬇️ Lower!';
    let temp = '';
    const dist = Math.abs(n - state.secret);
    if (state.last !== null) {
      const prevDist = Math.abs(state.last - state.secret);
      temp = dist < prevDist ? ' 🔥 Warmer.' : dist > prevDist ? ' 🧊 Colder.' : '';
    }
    if (dist <= Math.max(2, state.max / 50)) temp = ' 🌋 Super hot!';
    state.last = n;
    return { reply: { text: `${dir}${temp}`, mood: 'playful' } };
  },
  hint(ctx, state) {
    return { text: `💡 It's ${state.secret % 2 === 0 ? 'an even' : 'an odd'} number${state.secret > state.max / 2 ? `, above ${state.max / 2}` : `, ${state.max / 2} or below`}.` };
  },
  quit(ctx, state) { return `It was **${state.secret}**! 🔢`; },
  nudge(state) { return `Guess a number from 1 to ${state.max} (or say "hint" or "quit").`; },
  repeat(state) { return { text: `Guess a number between 1 and ${state.max}!` }; },
};

export const botGuesses = {
  id: 'botguess',
  title: 'I guess your number',
  emoji: '🤔',
  blurb: 'you pick 1–100, I find it in 7 tries',
  start() {
    const state = { lo: 1, hi: 100, tries: 0, current: null, ready: false };
    return { state, reply: { text: "🤔 Think of a whole number from **1 to 100**, but don't tell me! I'll find it in 7 guesses or fewer. Say **ready** when you've got one.", chips: ['Ready!'], mood: 'curious' } };
  },
  move({ text, p, rng }, state) {
    const t = `${p} ${text.toLowerCase()}`;
    if (!state.ready) {
      if (/\b(?:ready|ok|okay|yes|go|got (?:one|it)|done|start|sure)\b/.test(t)) {
        state.ready = true;
        return { reply: this.guess(state) };
      }
      if (parseNumber(text) !== null) return { reply: { text: "🙈 Don't tell me the number! Just keep it in your head and say **ready**.", chips: ['Ready!'] } };
      return null;
    }
    let dir = null;
    if (CORRECT.test(t) && !HIGHER.test(t) && !LOWER.test(t)) dir = 'correct';
    else if (HIGHER.test(t) && !LOWER.test(t)) dir = 'higher';
    else if (LOWER.test(t) && !HIGHER.test(t)) dir = 'lower';
    if (!dir) {
      if (/^\s*(?:no|nope|wrong|nah)\s*$/.test(t)) return { reply: { text: 'Is your number **higher** or **lower** than ' + state.current + '?', chips: chips() } };
      return null;
    }
    if (dir === 'correct') {
      return {
        reply: { text: `🎯 **${state.current}!** Found it in **${state.tries}** ${state.tries === 1 ? 'guess' : 'guesses'}. Binary search never fails. 😎`, chips: ['Play again', 'Guess my number instead', 'Something else'], mood: 'smug' },
        done: true,
        outcome: 'loss',
      };
    }
    if (dir === 'higher') state.lo = state.current + 1; else state.hi = state.current - 1;
    if (state.lo > state.hi) {
      return {
        reply: { text: `🕵️ Wait a minute… your number has to be above ${state.lo - 1} **and** below ${state.hi + 1}. That's impossible! Someone's fibbing (or made a typo). 😄 Let's start over?`, chips: ['Play again', 'Something else'], mood: 'suspicious' },
        done: true,
        outcome: null,
      };
    }
    return { reply: this.guess(state, rng) };
  },
  guess(state, rng) {
    state.current = Math.floor((state.lo + state.hi) / 2);
    state.tries++;
    const lead = state.lo === state.hi ? `It must be **${state.current}**!` : `${rng && state.tries > 1 ? pick(rng, ['Hmm…', 'Okay…', 'Interesting…', 'Let me think…']) + ' ' : ''}Is it **${state.current}**?`;
    return { text: `🤔 Guess #${state.tries}: ${lead}`, chips: chips(), mood: 'curious' };
  },
  quit() { return 'Okay! Your secret number is safe with you. 🤫'; },
  nudge(state) { return state.ready ? `Is it higher, lower, or correct? (My guess: ${state.current})` : 'Think of a number from 1 to 100 and say "ready".'; },
  repeat(state) { return state.ready ? { text: `My guess was **${state.current}**. Higher, lower, or correct?`, chips: chips() } : { text: 'Say "ready" when you have a number!', chips: ['Ready!'] }; },
};

const chips = () => [{ label: '⬆️ Higher', value: 'higher' }, { label: '⬇️ Lower', value: 'lower' }, { label: '✅ Correct!', value: 'correct' }];

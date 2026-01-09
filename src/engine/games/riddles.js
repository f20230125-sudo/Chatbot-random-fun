// Riddles with fuzzy answer checking, hints after a couple of wrong guesses.

import { pick } from '../util.js';
import { answerMatches, parseYesNo } from './common.js';

export const RIDDLES = [
  { q: 'What has keys but can\'t open locks?', a: ['piano', 'keyboard'], hint: 'You can play it.' },
  { q: 'What gets wetter the more it dries?', a: ['towel'], hint: 'You use it after a shower.' },
  { q: 'What has a head and a tail but no body?', a: ['coin'], hint: 'Flip it!' },
  { q: 'What can you catch but not throw?', a: ['cold', 'a cold', 'flu'], hint: 'Achoo!' },
  { q: 'The more of these you take, the more you leave behind. What are they?', a: ['footsteps', 'steps', 'footprints'], hint: 'Walk it off.' },
  { q: 'What has hands but can\'t clap?', a: ['clock', 'watch'], hint: 'Tick tock.' },
  { q: 'What goes up but never comes down?', a: ['age', 'your age'], hint: 'It happens every birthday.' },
  { q: 'What has one eye but can\'t see?', a: ['needle'], hint: 'Used for sewing.' },
  { q: 'What runs but never walks, has a mouth but never talks?', a: ['river', 'stream'], hint: 'It flows.' },
  { q: 'What can travel around the world while staying in a corner?', a: ['stamp', 'postage stamp'], hint: 'Look at an envelope.' },
  { q: 'I\'m tall when I\'m young and short when I\'m old. What am I?', a: ['candle'], hint: 'I have a wick.' },
  { q: 'What has to be broken before you can use it?', a: ['egg'], hint: 'Breakfast!' },
  { q: 'Which month has 28 days?', a: ['all', 'every month', 'all of them', 'all months', 'each month', 'every'], hint: 'Think about it literally.' },
  { q: 'What is full of holes but still holds water?', a: ['sponge'], hint: 'You clean with it.' },
  { q: 'What question can you never answer "yes" to?', a: ['are you asleep', 'asleep', 'are you sleeping', 'sleeping', 'are you dead', 'dead'], hint: 'Zzz…' },
  { q: 'What has many teeth but can\'t bite?', a: ['comb', 'zipper', 'zip', 'saw', 'gear'], hint: 'Your hair might know.' },
  { q: 'What building has the most stories?', a: ['library'], hint: 'Shh!' },
  { q: 'What can you break without ever touching it?', a: ['promise', 'a promise', 'silence', 'record', 'heart'], hint: 'You make one when you give your word.' },
  { q: 'What gets bigger the more you take away from it?', a: ['hole'], hint: 'Dig it.' },
  { q: 'What has a neck but no head?', a: ['bottle', 'shirt', 'guitar'], hint: 'You might drink from it.' },
  { q: 'If you drop me I\'ll crack, but smile at me and I\'ll smile back. What am I?', a: ['mirror'], hint: 'Look into it.' },
  { q: 'What is always in front of you but can\'t be seen?', a: ['future', 'the future'], hint: 'Tomorrow.' },
  { q: 'I have cities but no houses, forests but no trees, and water but no fish. What am I?', a: ['map'], hint: 'Explorers love me.' },
  { q: 'What word is spelled wrong in every dictionary?', a: ['wrong'], hint: 'Read the question again. Very carefully.' },
  { q: 'What has legs but doesn\'t walk?', a: ['table', 'chair', 'bed', 'desk', 'stool'], hint: 'You might be sitting near one.' },
  { q: 'What\'s long, slurpy and makes a certain chatbot very happy?', a: ['noodle', 'noodles', 'spaghetti', 'ramen', 'pasta'], hint: 'Look at my name. 🍜' },
  { q: 'What belongs to you, but other people use it more than you do?', a: ['name', 'your name', 'my name'], hint: 'People call you by it.' },
  { q: 'Forward I\'m heavy, but backward I\'m not. What am I?', a: ['ton'], hint: 'A unit of weight. Try spelling it backwards.' },
  { q: 'What kind of room has no doors or windows?', a: ['mushroom'], hint: 'It grows in forests.' },
  { q: 'What can fill a room but takes up no space?', a: ['light', 'darkness', 'sound', 'silence', 'laughter'], hint: 'Flip a switch.' },
  { q: 'What has an eye but can\'t see, and spins round and round?', a: ['hurricane', 'storm', 'tornado', 'cyclone'], hint: 'Weather!' },
  { q: 'What five-letter word becomes shorter when you add two letters to it?', a: ['short'], hint: 'The answer is in the question.' },
];

const PRAISE = ['🎉 Correct! You\'re a riddle master.', '🧠 Yes! Too clever.', '✅ Got it! Big brain.', '🎯 That\'s it!'];
const NOPE = ['Nope! Try again 🤔', 'Not quite… guess again!', 'Hmm, no. Another guess?', 'So close (maybe). Try again!'];

export const riddles = {
  id: 'riddle',
  title: 'Riddles',
  emoji: '🧩',
  blurb: 'one brain-teaser at a time',
  start({ draw }) {
    const riddle = draw('riddles', RIDDLES);
    return { state: { riddle, tries: 0, solved: 0 }, reply: { text: `🧩 **Riddle me this:**\n${riddle.q}`, chips: ['Hint', 'Give up'], mood: 'playful' } };
  },
  move(ctx, state) {
    const { text, rng } = ctx;
    if (state.awaitingNext) {
      const yn = parseYesNo(text);
      if (yn === 'yes' || /\b(?:another|next|more|again)\b/i.test(text)) return { reply: this.next(ctx, state) };
      if (yn === 'no') return { reply: { text: `No problem! You solved **${state.solved}** ${state.solved === 1 ? 'riddle' : 'riddles'}. 🧩` }, done: true, outcome: state.solved > 0 ? 'win' : null };
      return null;
    }
    const guess = text.trim();
    if (!guess || guess.length > 80) return null;
    if (state.riddle.a.some((a) => answerMatches(guess, a))) {
      state.solved++;
      state.awaitingNext = true;
      return { reply: { text: `${pick(rng, PRAISE)} The answer is **${state.riddle.a[0]}**. Another one?`, chips: ['Another riddle', 'No thanks'], mood: 'excited' } };
    }
    // Long sentences that aren't guesses fall through to the rest of the bot.
    if (guess.split(/\s+/).length > 6) return null;
    state.tries++;
    if (state.tries >= 2 && !state.hinted) {
      state.hinted = true;
      return { reply: { text: `${pick(rng, NOPE)} Here's a hint: _${state.riddle.hint}_`, chips: ['Give up'] } };
    }
    return { reply: { text: pick(rng, NOPE), chips: state.hinted ? ['Give up'] : ['Hint', 'Give up'] } };
  },
  next({ draw }, state) {
    state.riddle = draw('riddles', RIDDLES);
    state.tries = 0;
    state.hinted = false;
    state.awaitingNext = false;
    return { text: `🧩 **Next riddle:**\n${state.riddle.q}`, chips: ['Hint', 'Give up'] };
  },
  hint(ctx, state) {
    if (state.awaitingNext) return { text: 'Want another riddle?', chips: ['Another riddle', 'No thanks'] };
    state.hinted = true;
    return { text: `💡 Hint: _${state.riddle.hint}_`, chips: ['Give up'] };
  },
  giveUp(ctx, state) {
    state.awaitingNext = true;
    return { text: `The answer was **${state.riddle.a[0]}**! 😄 Want another?`, chips: ['Another riddle', 'No thanks'] };
  },
  quit(ctx, state) {
    return state.awaitingNext ? `Thanks for playing! Riddles solved: **${state.solved}**.` : `The answer was **${state.riddle.a[0]}**. Riddles solved: **${state.solved}**.`;
  },
  nudge(state) { return state.awaitingNext ? 'Want another riddle? (yes/no)' : 'Take a guess, ask for a "hint", or say "give up".'; },
  repeat(state) { return state.awaitingNext ? { text: 'Want another riddle?', chips: ['Another riddle', 'No thanks'] } : { text: `🧩 ${state.riddle.q}`, chips: ['Hint', 'Give up'] }; },
};

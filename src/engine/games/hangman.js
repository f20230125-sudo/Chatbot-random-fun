// Hangman, noodle edition: six lives shown as bowls of noodles.

import { pick } from '../util.js';

export const WORDS = {
  animals: ['elephant', 'giraffe', 'penguin', 'kangaroo', 'dolphin', 'octopus', 'cheetah', 'flamingo', 'hedgehog', 'squirrel', 'crocodile', 'butterfly', 'porcupine', 'chameleon', 'platypus', 'camel', 'falcon', 'koala', 'panda', 'zebra', 'walrus', 'jaguar', 'lobster', 'gorilla', 'hamster'],
  food: ['spaghetti', 'noodles', 'pancake', 'avocado', 'broccoli', 'burrito', 'dumpling', 'lasagna', 'croissant', 'shawarma', 'biryani', 'pretzel', 'pineapple', 'blueberry', 'mango', 'sushi', 'falafel', 'hummus', 'waffle', 'cupcake'],
  space: ['galaxy', 'nebula', 'asteroid', 'comet', 'jupiter', 'saturn', 'telescope', 'astronaut', 'satellite', 'eclipse', 'meteor', 'gravity', 'universe', 'orbit', 'rocket'],
  countries: ['australia', 'brazil', 'canada', 'egypt', 'france', 'germany', 'iceland', 'india', 'japan', 'kenya', 'mexico', 'morocco', 'norway', 'portugal', 'singapore', 'thailand', 'argentina', 'vietnam', 'pakistan', 'jordan'],
  tech: ['keyboard', 'algorithm', 'internet', 'computer', 'database', 'javascript', 'python', 'robot', 'software', 'pixel', 'browser', 'variable', 'function', 'network', 'laptop'],
  music: ['guitar', 'piano', 'violin', 'trumpet', 'drums', 'saxophone', 'melody', 'rhythm', 'harmony', 'orchestra', 'ukulele', 'microphone'],
};

const LIVES = 6;
const bowls = (lives) => '🍜'.repeat(lives) + '▫️'.repeat(LIVES - lives);
const masked = (state) => [...state.word].map((c) => (state.guessed.includes(c) ? c.toUpperCase() : '_')).join(' ');

function board(state, lead) {
  const wrong = state.guessed.filter((c) => !state.word.includes(c));
  return {
    text: `${lead ? `${lead}\n\n` : ''}\`${masked(state)}\`\nLives: ${bowls(state.lives)}${wrong.length ? `  ·  Misses: ${wrong.map((c) => c.toUpperCase()).join(' ')}` : ''}\n_Category: ${state.category}_`,
    chips: state.lives > 1 ? ['Hint (costs a life)'] : [],
  };
}

function parseGuess(text) {
  const t = text.trim().toLowerCase().replace(/[“”"']/g, '').replace(/[.!?]+$/, '');
  let m = t.match(/^(?:(?:i )?guess |is there (?:an? |the )?|letter |the letter |try |what about |how about |maybe |does it have (?:an? )?)?([a-z])$/);
  if (m) return { letter: m[1] };
  m = t.match(/^(?:is it |the word is |i think it is |i think its |its |it is |answer |solve )?([a-z]{2,})$/);
  if (m) return { word: m[1] };
  if (/^[^a-z\s]$/.test(t) || /^\d+$/.test(t)) return { invalid: true };
  return null;
}

export const hangman = {
  id: 'hangman',
  title: 'Hangman',
  emoji: '🔤',
  blurb: 'guess the word before the noodles run out',
  start({ rng, p }) {
    const category = Object.keys(WORDS).find((c) => p.includes(c.replace(/s$/, ''))) ?? pick(rng, Object.keys(WORDS));
    const state = { word: pick(rng, WORDS[category]), category, guessed: [], lives: LIVES };
    const b = board(state, `🔤 **Hangman!** I'm thinking of a ${state.word.length}-letter word. Guess a letter, or the whole word.`);
    return { state, reply: { ...b, mood: 'playful' } };
  },
  move({ text, rng }, state) {
    const g = parseGuess(text);
    if (!g) return null;
    if (g.invalid) return { reply: board(state, '🙃 Letters only, please! A to Z.') };
    if (g.word) {
      if (g.word === state.word) {
        state.guessed.push(...state.word);
        return win(state);
      }
      // Two-letter words like "ok" or "no" are probably chat, not guesses.
      if (g.word.length < 3 || g.word.length !== state.word.length) return null;
      state.lives--;
      if (state.lives <= 0) return lose(state, `❌ "${g.word}" isn't it.`);
      return { reply: board(state, `❌ "${g.word.toUpperCase()}" isn't the word. That cost a bowl of noodles!`) };
    }
    const c = g.letter;
    if (state.guessed.includes(c)) return { reply: board(state, `🔁 You already tried **${c.toUpperCase()}**!`) };
    state.guessed.push(c);
    if (state.word.includes(c)) {
      if ([...state.word].every((ch) => state.guessed.includes(ch))) return win(state);
      const n = [...state.word].filter((ch) => ch === c).length;
      return { reply: { ...board(state, `✅ ${n === 1 ? 'There\'s one' : `There are ${n}`} **${c.toUpperCase()}**${n === 1 ? '' : "'s"}! ${pick(rng, ['Nice!', 'Good guess!', 'Ooh!', 'Keep going!'])}`), mood: 'happy' } };
    }
    state.lives--;
    if (state.lives <= 0) return lose(state, `❌ No **${c.toUpperCase()}**.`);
    return { reply: { ...board(state, `❌ No **${c.toUpperCase()}**. ${state.lives === 1 ? 'Last bowl of noodles! 😰' : pick(rng, ['Slurp. One bowl gone.', 'Oops!', 'Nope!'])}`), mood: state.lives <= 2 ? 'worried' : 'playful' } };
  },
  hint({ rng }, state) {
    if (state.lives <= 1) return board(state, "🙅 A hint would cost your last life! You've got this.");
    const hidden = [...new Set([...state.word].filter((c) => !state.guessed.includes(c)))];
    const c = pick(rng, hidden);
    state.guessed.push(c);
    state.lives--;
    if ([...state.word].every((ch) => state.guessed.includes(ch))) return win(state).reply;
    return board(state, `💡 Here's a letter: **${c.toUpperCase()}** (−1 life)`);
  },
  quit(ctx, state) { return `The word was **${state.word.toUpperCase()}**. 🍜`; },
  nudge() { return 'Guess a letter (or the whole word), ask for a "hint", or say "quit".'; },
  repeat(state) { return board(state); },
};

function win(state) {
  return {
    reply: { text: `🎉 **You got it: ${state.word.toUpperCase()}!** with ${state.lives} ${state.lives === 1 ? 'bowl' : 'bowls'} of noodles to spare. ${bowls(state.lives)}`, chips: ['Play hangman again', 'Something else'], mood: 'excited', actions: [{ type: 'confetti' }] },
    done: true,
    outcome: 'win',
  };
}

function lose(state, lead) {
  return {
    reply: { text: `${lead} Out of noodles! 😵 The word was **${state.word.toUpperCase()}**.`, chips: ['Play hangman again', 'Something else'], mood: 'smug' },
    done: true,
    outcome: 'loss',
  };
}

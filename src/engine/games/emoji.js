// Guess the movie from emoji.

import { shuffle, pick } from '../util.js';
import { squash, answerMatches } from './common.js';

export const MOVIES = [
  { e: '🦁👑', t: 'The Lion King', y: 1994 },
  { e: '🚢🧊💔', t: 'Titanic', y: 1997 },
  { e: '🕷️🧑‍🎓🏙️', t: 'Spider-Man', y: 2002, alt: ['spiderman'] },
  { e: '🦖🏝️🧬', t: 'Jurassic Park', y: 1993 },
  { e: '👻🚫🔫', t: 'Ghostbusters', y: 1984 },
  { e: '💍🌋🧙‍♂️', t: 'The Lord of the Rings', y: 2001, alt: ['lord of the rings', 'lotr'] },
  { e: '⚡👓🧙', t: 'Harry Potter', y: 2001 },
  { e: '🐠🔍🌊', t: 'Finding Nemo', y: 2003 },
  { e: '❄️👸⛄', t: 'Frozen', y: 2013 },
  { e: '🦈🏖️😱', t: 'Jaws', y: 1975 },
  { e: '👽☎️🏠', t: 'E.T.', y: 1982, alt: ['et', 'e t', 'et the extra terrestrial'] },
  { e: '⭐⚔️🌌', t: 'Star Wars', y: 1977 },
  { e: '🤠🧸🚀', t: 'Toy Story', y: 1995 },
  { e: '🐀👨‍🍳🇫🇷', t: 'Ratatouille', y: 2007 },
  { e: '🤖🌱🌍', t: 'WALL-E', y: 2008, alt: ['walle', 'wall e'] },
  { e: '🏠🎈👴', t: 'Up', y: 2009 },
  { e: '🦇🃏🌃', t: 'The Dark Knight', y: 2008, alt: ['batman', 'dark knight'] },
  { e: '🧞‍♂️🪔🐒', t: 'Aladdin', y: 1992 },
  { e: '🐼🥋🥟', t: 'Kung Fu Panda', y: 2008 },
  { e: '🍫🏭🎫', t: 'Charlie and the Chocolate Factory', y: 2005, alt: ['willy wonka', 'wonka', 'chocolate factory'] },
  { e: '🕶️💊🐇', t: 'The Matrix', y: 1999, alt: ['matrix'] },
  { e: '🧜‍♀️🦀🌊', t: 'The Little Mermaid', y: 1989, alt: ['little mermaid'] },
  { e: '🐸👸🎺', t: 'The Princess and the Frog', y: 2009 },
  { e: '🦸‍♂️🦸‍♀️🛡️🔨', t: 'The Avengers', y: 2012, alt: ['avengers'] },
  { e: '🏎️⚡🏁', t: 'Cars', y: 2006 },
  { e: '💤🌀🏙️', t: 'Inception', y: 2010 },
  { e: '👨‍🚀🌽🕳️', t: 'Interstellar', y: 2014 },
  { e: '🐧🎵💃', t: 'Happy Feet', y: 2006 },
  { e: '🟢👹🧅', t: 'Shrek', y: 2001 },
  { e: '🐻🍯🎈', t: 'Winnie the Pooh', y: 2011, alt: ['pooh', 'winnie'] },
  { e: '🎈🤡🌧️', t: 'It', y: 2017 },
  { e: '🐒🏙️✈️', t: 'King Kong', y: 2005 },
  { e: '🧸🍯🇬🇧', t: 'Paddington', y: 2014 },
  { e: '🐟👨‍👦🌊', t: 'Finding Dory', y: 2016, alt: ['dory'] },
  { e: '🦍🦎🏙️', t: 'Godzilla vs. Kong', y: 2021, alt: ['godzilla vs kong', 'godzilla kong'] },
  { e: '👸👠🎃🕛', t: 'Cinderella', y: 1950 },
  { e: '🌹🐃🏰', t: 'Beauty and the Beast', y: 1991 },
  { e: '👦🌳🏝️🐯', t: 'Life of Pi', y: 2012 },
  { e: '🐉🔥🧑', t: 'How to Train Your Dragon', y: 2010, alt: ['train your dragon'] },
  { e: '🍝🐶🐕', t: 'Lady and the Tramp', y: 1955 },
];

const ROUND = 5;

function isRight(text, movie) {
  const t = squash(text);
  const title = squash(movie.t);
  if (t === title || (t.length >= 4 && title.includes(t) && t.length >= title.length * 0.6)) return true;
  if (answerMatches(text, movie.t) && Math.abs(t.length - title.length) <= 3) return true;
  return (movie.alt ?? []).some((a) => squash(a) === t || (t.includes(squash(a)) && squash(a).length >= 4));
}

const show = (state) => `**Movie ${state.index + 1}/${state.movies.length}:**  ${state.movies[state.index].e}`;

export const emojiQuiz = {
  id: 'emoji',
  title: 'Emoji movie quiz',
  emoji: '🎬',
  blurb: 'guess films from emoji',
  start({ rng }) {
    const state = { movies: shuffle(rng, MOVIES).slice(0, ROUND), index: 0, score: 0, hints: 0 };
    return { state, reply: { text: `🎬 **Emoji movie quiz!** Name the film. ${ROUND} rounds.\n\n${show(state)}`, chips: ['Hint', 'Skip'], mood: 'excited' } };
  },
  move({ text, rng }, state) {
    const movie = state.movies[state.index];
    if (!text.trim() || text.length > 80) return null;
    if (/^(?:skip|pass|next|no idea|i do not know|idk|dunno|give up)$/i.test(text.trim())) return advance(state, `⏭️ It was **${movie.t}** (${movie.y}).`, false);
    if (isRight(text, movie)) return advance(state, `${pick(rng, ['🎉 Correct!', '🍿 Yes!', '✅ You got it!', '🎬 That\'s a wrap!'])} **${movie.t}** (${movie.y}).`, true);
    if (text.trim().split(/\s+/).length > 7) return null;
    state.wrong = (state.wrong ?? 0) + 1;
    return { reply: { text: `${pick(rng, ['❌ Nope!', '❌ Not that one.', '🤔 Try again!'])}${state.wrong >= 2 ? ' (Say "hint" for a clue, or "skip".)' : ''}\n${show(state)}`, chips: ['Hint', 'Skip'] } };
  },
  hint(ctx, state) {
    const movie = state.movies[state.index];
    state.hints++;
    const clue = state.hints % 2 === 1 ? `It came out in **${movie.y}**.` : `It starts with **"${movie.t.replace(/^the /i, '')[0]}"** and has ${movie.t.split(' ').length} word${movie.t.split(' ').length === 1 ? '' : 's'}.`;
    return { text: `💡 ${clue}\n${show(state)}`, chips: ['Skip'] };
  },
  quit(ctx, state) { return `Final score: **${state.score}/${state.index}**. 🎬`; },
  nudge() { return 'Type the movie title, "hint", "skip", or "quit".'; },
  repeat(state) { return { text: show(state), chips: ['Hint', 'Skip'] }; },
};

function advance(state, lead, right) {
  if (right) state.score++;
  state.index++;
  state.wrong = 0;
  if (state.index >= state.movies.length) {
    const n = state.movies.length;
    return {
      reply: { text: `${lead}\n\n🎬 **Final score: ${state.score}/${n}**. ${state.score === n ? 'Film buff! 🏆' : state.score >= 3 ? 'Great watching! 🍿' : 'Time for a movie marathon! 📺'}`, chips: ['Play again', 'Something else'], mood: state.score >= 3 ? 'excited' : 'happy', actions: state.score === n ? [{ type: 'confetti' }] : [] },
      done: true,
      outcome: state.score >= 3 ? 'win' : 'loss',
    };
  }
  return { reply: { text: `${lead}\n\n${show(state)}`, chips: ['Hint', 'Skip'], mood: right ? 'happy' : 'playful' } };
}

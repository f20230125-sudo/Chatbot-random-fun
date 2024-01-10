// Knock-knock jokes, in both directions.

import { pick } from '../util.js';
import { KNOCK_KNOCK } from '../data/content.js';

const LAUGHS = ['😂 Hahaha! That\'s a good one!', '🤣 Oh no. Oh NO. I love it.', '😆 Ba-dum-tss! 🥁', '😂 I did not see that coming!', '🙈 That was terrible. I loved it.'];

/** Bot tells a knock-knock joke; the user plays the audience. */
export const knockTell = {
  id: 'knock',
  title: 'Knock-knock (I tell)',
  emoji: '🚪',
  hidden: true,
  start({ draw }) {
    const joke = draw('knock', KNOCK_KNOCK);
    return { state: { joke, step: 0 }, reply: { text: '🚪 **Knock knock!**', chips: ["Who's there?"], mood: 'playful' } };
  },
  move({ p }, state) {
    const who = state.joke.who.toLowerCase();
    if (state.step === 0) {
      if (/\bwho\b/.test(p) && /\bthere\b|\bis it\b|\bis that\b|^who$/.test(p)) { state.step = 1; return { reply: { text: `${state.joke.who}.`, chips: [`${state.joke.who} who?`] } }; }
      if (/^(?:come in|enter|door is open|it is open)\b/.test(p)) return { reply: { text: "😄 You're supposed to say **\"Who's there?\"**! Let's try again: **Knock knock!**", chips: ["Who's there?"] } };
      return null;
    }
    if (/\bwho\b/.test(p) || p.includes(who)) {
      return { reply: { text: `${state.joke.punch} 😄`, chips: ['Another knock-knock joke', 'Tell me a joke', 'Your turn'], mood: 'laughing' }, done: true };
    }
    return { reply: { text: `You're supposed to say **"${state.joke.who} who?"** 😄`, chips: [`${state.joke.who} who?`] } };
  },
  quit() { return 'Okay, the door stays closed. 🚪'; },
  nudge(state) { return state.step === 0 ? 'Say "Who\'s there?"' : `Say "${state.joke.who} who?"`; },
  repeat(state) { return state.step === 0 ? { text: 'Knock knock!', chips: ["Who's there?"] } : { text: `${state.joke.who}.`, chips: [`${state.joke.who} who?`] }; },
};

/** The user tells a knock-knock joke; the bot plays the audience. */
export const knockListen = {
  id: 'knocklisten',
  title: 'Knock-knock (you tell)',
  emoji: '🚪',
  hidden: true,
  start() {
    return { state: { step: 0 }, reply: { text: "Who's there? 👀", mood: 'curious' } };
  },
  move({ text, rng }, state) {
    const t = text.trim().replace(/[.!?]+$/, '');
    if (!t || t.length > 200) return null;
    if (state.step === 0) {
      state.who = t;
      state.step = 1;
      return { reply: { text: `${t} who?` } };
    }
    return { reply: { text: pick(rng, LAUGHS), chips: ['Tell me a knock-knock joke', 'Tell me a joke'], mood: 'laughing' }, done: true };
  },
  quit() { return 'Aww, I wanted to know who was there! 🚪'; },
  nudge(state) { return state.step === 0 ? "Who's there?" : `${state.who} who?`; },
  repeat(state) { return { text: state.step === 0 ? "Who's there?" : `${state.who} who?` }; },
};

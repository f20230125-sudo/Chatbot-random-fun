// Would you rather: a quick two-choice question with a playful reaction.

import { pick } from '../util.js';
import { WOULD_YOU_RATHER } from '../data/content.js';
import { answerMatches } from './common.js';

const REACTIONS = [
  'Bold choice! I respect it. 🫡', 'Same! Great minds. 🤝', "Interesting… I'd have picked the other one, but I see your logic.",
  'Solid pick. No regrets!', 'The noodle approves. 🍜', "Ooh, controversial! I'm here for it.",
];

export const wyr = {
  id: 'wyr',
  title: 'Would you rather',
  emoji: '🤔',
  blurb: 'tough choices, no wrong answers',
  start({ draw }) {
    const [a, b] = draw('wyr', WOULD_YOU_RATHER);
    return {
      state: { a, b },
      reply: { text: `🤔 **Would you rather…**\n**A)** ${a}\n**B)** ${b}?`, chips: [{ label: `A · ${a}`, value: 'A' }, { label: `B · ${b}`, value: 'B' }, { label: 'Both!', value: 'both' }], mood: 'curious' },
    };
  },
  move({ text, lower, rng }, state) {
    const t = lower.trim().replace(/[.!?]+$/, '');
    let choice = null;
    if (/^(?:a|option a|first|the first|the first one|1|a\))$/.test(t) || answerMatches(text, state.a)) choice = 'a';
    if (/^(?:b|option b|second|the second|the second one|2|b\))$/.test(t) || answerMatches(text, state.b)) choice = choice ? 'both' : 'b';
    if (/^(?:both|both of them|all of them|either)$/.test(t)) choice = 'both';
    if (/^(?:neither|none|none of them|nope|no|neither of them)$/.test(t)) choice = 'neither';
    if (!choice) return null;
    const lead = {
      a: `You'd rather **${state.a}**. ${pick(rng, REACTIONS)}`,
      b: `You'd rather **${state.b}**. ${pick(rng, REACTIONS)}`,
      both: "Both?! That's cheating… but I admire the ambition. 😄",
      neither: "Neither? A rebel who refuses to play by the rules. 😎",
    }[choice];
    return { reply: { text: lead, chips: ['Another would you rather', 'Something else'], mood: 'happy' }, done: true };
  },
  quit() { return 'No choice made. Very diplomatic! 🕊️'; },
  nudge() { return 'Pick A or B!'; },
  repeat(state) { return { text: `Would you rather **A)** ${state.a} or **B)** ${state.b}?`, chips: ['A', 'B'] }; },
};

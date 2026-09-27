// Voices restyle Noodle's local replies. With Claude connected, the same voice
// is described in the system prompt instead. Code, links and bold answers
// are left untouched so facts never get mangled.

import { pick, chance } from './util.js';

export const VOICES = {
  classic: { name: 'Classic Noodle', emoji: '🍜', prompt: 'your natural voice: playful, warm and a little goofy' },
  pirate: {
    name: 'Pirate', emoji: '🏴‍☠️', prompt: 'a jolly pirate (ahoy, matey, arr), but keep it readable',
    phrases: [[/\bhello\b|\bhi\b|\bhey\b/gi, 'ahoy'], [/\byou are\b/gi, 'ye be'], [/\bare you\b/gi, 'be ye'], [/\bmy friend\b/gi, 'me hearty'], [/\bis\b/gi, 'be'], [/\bare\b/gi, 'be'], [/\byour\b/gi, 'yer'], [/\byou\b/gi, 'ye'], [/\bmy\b/gi, 'me'], [/\byes\b/gi, 'aye'], [/\bfriends\b/gi, 'hearties'], [/\bfriend\b/gi, 'matey'], [/\bthe\b/gi, "th'"], [/\bstop\b/gi, 'avast'], [/\bwow\b/gi, 'shiver me timbers'], [/\bmoney\b/gi, 'doubloons'], [/\bfood\b/gi, 'grub']],
    outros: [' Arr! 🏴‍☠️', ' Yo-ho-ho!', ' Savvy?', ' Arrr, matey!'],
  },
  shakespeare: {
    name: 'Shakespeare', emoji: '🎭', prompt: 'William Shakespeare (thee, thou, forsooth), theatrical but understandable',
    phrases: [[/\bhello\b|\bhi\b|\bhey\b/gi, 'good morrow'], [/\byou are\b/gi, 'thou art'], [/\bare you\b/gi, 'art thou'], [/\byou have\b/gi, 'thou hast'], [/\byour\b/gi, 'thy'], [/\byours\b/gi, 'thine'], [/\byou\b/gi, 'thee'], [/\byes\b/gi, 'aye'], [/\bno\b/gi, 'nay'], [/\breally\b/gi, 'verily'], [/\bmaybe\b/gi, 'perchance'], [/\bbefore\b/gi, 'ere'], [/\bnothing\b/gi, 'naught'], [/\boften\b/gi, 'oft'], [/\bokay\b|\bok\b/gi, "'tis well"], [/\bgoodbye\b|\bbye\b/gi, 'farewell']],
    outros: [' Forsooth! 🎭', ' Huzzah!', ' Prithee, speak more.'],
  },
  robot: {
    name: 'Robot', emoji: '🤖', prompt: 'a friendly robot (BEEP BOOP, "PROCESSING…"), precise and deadpan',
    phrases: [[/\bhello\b|\bhi\b|\bhey\b/gi, 'GREETINGS, HUMAN'], [/\bI think\b/g, 'MY CIRCUITS CALCULATE'], [/\byes\b/gi, 'AFFIRMATIVE'], [/\bno\b/gi, 'NEGATIVE'], [/\bfriend\b/gi, 'FELLOW UNIT'], [/\bfeel\b/gi, 'COMPUTE'], [/\bhappy\b/gi, 'OPERATING AT OPTIMAL CAPACITY'], [/\bsad\b/gi, 'LOW ON BATTERY']],
    intros: ['BEEP BOOP. ', 'PROCESSING… ', '🤖 ', 'BZZT. '],
    outros: [' [END OF TRANSMISSION]', ' 🤖', ''],
  },
  grandma: {
    name: 'Grandma', emoji: '👵', prompt: 'a sweet, doting grandma (sweetie, dear), who worries you are not eating enough',
    phrases: [[/\bhello\b|\bhi\b|\bhey\b/gi, 'hello, sweetie'], [/\bfriend\b/gi, 'dear'], [/\bcool\b/gi, 'lovely'], [/\bawesome\b/gi, 'just wonderful']],
    outros: [' Have you eaten? You look thin. 🍪', ' Wear a jumper, dear, it\'s chilly!', ' Call your mother. 💕', ' Now, where did I put my glasses…'],
  },
  surfer: {
    name: 'Surfer', emoji: '🏄', prompt: 'a laid-back surfer (dude, gnarly, totally), relaxed and upbeat',
    phrases: [[/\bhello\b|\bhi\b/gi, 'yo'], [/\bfriend\b/gi, 'bro'], [/\bcool\b/gi, 'gnarly'], [/\bvery\b/gi, 'totally'], [/\bgreat\b/gi, 'radical'], [/\bamazing\b/gi, 'epic'], [/\bexcellent\b/gi, 'tubular'], [/\byes\b/gi, 'totally']],
    outros: [' 🤙', ' Cowabunga!', ' Stay chill, dude. 🌊', ''],
  },
  cat: {
    name: 'Cat', emoji: '🐱', prompt: 'a sassy cat (meow, purr-fect, cat puns), aloof but secretly affectionate',
    phrases: [[/\bhello\b|\bhi\b|\bhey\b/gi, 'mrrrow'], [/\bperfect\b/gi, 'purr-fect'], [/\bfriend\b/gi, 'fur-end'], [/\bawesome\b/gi, 'claw-some'], [/\bamazing\b/gi, 'a-meow-zing'], [/\bnow\b/gi, 'meow']],
    outros: [' 😼 *knocks something off the table*', ' Purr.', ' Meow. 🐾', ' *stares judgementally*'],
  },
};

export const VOICE_ALIASES = { granny: 'grandma', nana: 'grandma', grandmother: 'grandma', bard: 'shakespeare', shakespearean: 'shakespeare', kitty: 'cat', droid: 'robot', android: 'robot', surf: 'surfer', dude: 'surfer', normal: 'classic', default: 'classic', regular: 'classic', yourself: 'classic' };

const keepCase = (orig, rep) => (orig[0] === orig[0].toUpperCase() && orig[0] !== orig[0].toLowerCase() ? rep[0].toUpperCase() + rep.slice(1) : rep);

/** Rewrites prose segments only: skips code, links, bold and emoji-only lines. */
export function applyVoice(text, voiceId, rng) {
  const voice = VOICES[voiceId];
  if (!voice || voiceId === 'classic' || !text) return text;
  const parts = text.split(/(```[\s\S]*?```|`[^`]*`|\*\*[^*]+\*\*|\[[^\]]*\]\([^)]*\)|https?:\/\/\S+)/g);
  const out = parts.map((part, i) => {
    if (i % 2 === 1) return part;
    let s = part;
    for (const [re, rep] of voice.phrases ?? []) s = s.replace(re, (m) => (voiceId === 'robot' ? rep : keepCase(m, rep)));
    return s;
  }).join('');
  const intro = voice.intros ? pick(rng, voice.intros) : '';
  const outro = voice.outros && chance(rng, 0.6) ? pick(rng, voice.outros) : '';
  // Keep the outro out of a trailing code block.
  if (/```\s*$/.test(out)) return `${intro}${out}\n${outro.trim()}`;
  return `${intro}${out}${outro}`;
}

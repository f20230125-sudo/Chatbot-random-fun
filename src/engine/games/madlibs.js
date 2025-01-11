// Mad Libs: the bot collects words one by one, then tells a (very silly) story.

import { pick } from '../util.js';

const BANK = {
  adjective: ['sparkly', 'grumpy', 'enormous', 'wobbly', 'suspicious', 'fluffy', 'ridiculous', 'majestic', 'soggy', 'invisible'],
  noun: ['spoon', 'trampoline', 'toaster', 'umbrella', 'pineapple', 'sock', 'telescope', 'banjo', 'rubber duck', 'cactus'],
  plural_noun: ['socks', 'penguins', 'waffles', 'robots', 'balloons', 'pickles', 'dinosaurs', 'teacups', 'noodles', 'llamas'],
  name: ['Captain Biscuit', 'Aunt Wanda', 'Sir Reginald', 'Zara', 'Mr. Noodles', 'Professor Fluff', 'Dave'],
  number: ['7', '42', '1,000', '3', '99', '12', '0'],
  exclamation: ['Yikes', 'Holy guacamole', 'Great Scott', 'Wowzers', 'Oh no', 'Yippee', 'Jeepers'],
  place: ['the Moon', 'Dubai Mall', 'a haunted library', 'the kitchen', 'Antarctica', 'a volcano', 'the dentist'],
  animal: ['llama', 'hedgehog', 'octopus', 'penguin', 'giraffe', 'goat', 'sloth', 'narwhal'],
  verb_ing: ['dancing', 'juggling', 'sneezing', 'moonwalking', 'yodelling', 'knitting', 'skateboarding'],
  verb: ['wiggle', 'sprint', 'giggle', 'tiptoe', 'shout', 'somersault', 'sing'],
  food: ['spaghetti', 'pickled onions', 'chocolate pudding', 'biryani', 'jelly beans', 'shawarma', 'soggy cereal'],
  body_part: ['elbow', 'nose', 'left knee', 'eyebrow', 'big toe', 'ear'],
  color: ['neon green', 'purple', 'polka-dot', 'sparkly gold', 'bright orange'],
  silly_word: ['flibbertigibbet', 'snorkelwump', 'bamboozle', 'kerfuffle', 'wibble'],
  emotion: ['confused', 'thrilled', 'grumpy', 'giddy', 'nervous', 'smug'],
};

const PROMPTS = {
  adjective: 'an **adjective** (like "sparkly")', adjective2: 'another **adjective**', noun: 'a **noun** (a thing, like "spoon")',
  plural_noun: 'a **plural noun** (like "penguins")', name: "a **person's name**", number: 'a **number**',
  exclamation: 'an **exclamation** (like "Yikes")', place: 'a **place**', animal: 'an **animal**', verb_ing: 'a **verb ending in -ing** (like "dancing")',
  verb: 'a **verb** (an action, like "jump")', food: 'a **food**', body_part: 'a **body part**', color: 'a **colour**',
  silly_word: 'a **silly made-up word**', emotion: 'an **emotion**',
};

export const TEMPLATES = [
  {
    title: 'The Great {adjective} Adventure',
    text: 'One {adjective2} morning, {name} woke up to find {number} {plural_noun} dancing on the kitchen table. "{exclamation}!" they shouted, grabbing a {noun} and running all the way to {place}. There, a wise old {animal} was {verb_ing} next to a giant bowl of {food}. "You\'re late," said the {animal}. "The {plural_noun} have been waiting since {number} o\'clock!" And that is how {name} became the most {adjective} hero in all of {place}.',
  },
  {
    title: 'My First Day as a Chatbot',
    text: 'Today I, a {adjective} chatbot named {name}, answered my first question. A user asked me how to {verb} a {noun}. I panicked and replied: "{exclamation}! Have you tried turning your {body_part} off and on again?" They laughed so hard that {number} {plural_noun} fell out of their pocket. Now I only answer questions about {food}, and I feel extremely {emotion} about it.',
  },
  {
    title: 'The Mystery of the Missing {noun}',
    text: 'Detective {name} arrived at {place} with a magnifying glass and a {color} {animal}. "Someone has stolen the {adjective} {noun}!" cried the butler. The only clues were {number} crumbs of {food} and a note that said "{silly_word}". The detective narrowed their eyes, sniffed the butler\'s {body_part}, and announced: "The culprit is… the {animal}!" Everyone gasped. The {animal} was {verb_ing} suspiciously. Case closed.',
  },
  {
    title: 'A Very Normal Cooking Show',
    text: 'Welcome back to "Cooking with {name}"! Today we\'re making {adjective} {food}. First, take {number} {plural_noun} and gently {verb} them. Next, add a pinch of {color} {noun}. If the mixture starts {verb_ing}, don\'t worry: that\'s normal. Finally, garnish with a single {animal} hair and shout "{exclamation}!" Serve immediately to someone who looks {emotion}. Bon appétit!',
  },
  {
    title: 'Holiday Postcard',
    text: 'Greetings from {place}! The weather is {adjective} and the locals are extremely {emotion}. Yesterday I rode a {color} {animal} for {number} hours and my {body_part} still hurts. The food is amazing: I\'ve eaten nothing but {food} since I arrived. Tomorrow I\'m going {verb_ing} with a guide called {name}. Wish you were here! {exclamation}! P.S. Please feed my {plural_noun}.',
  },
];

const slotsOf = (template) => [...new Set([...(template.title + template.text).matchAll(/\{(\w+)\}/g)].map((m) => m[1]))];
const bankKey = (slot) => slot.replace(/\d+$/, '');
const escapeMd = (s) => s.replace(/[*_`~[\]<>\\|#]/g, '');

export function fillTemplate(template, words) {
  const fill = (s) => s.replace(/\{(\w+)\}/g, (_, slot) => `**${words[slot]}**`);
  return `📖 **${template.title.replace(/\{(\w+)\}/g, (_, slot) => words[slot])}**\n\n${fill(template.text)}`;
}

export const madlibs = {
  id: 'madlibs',
  title: 'Mad Libs',
  emoji: '📝',
  blurb: 'you give me words, I write a silly story',
  start({ rng }) {
    const template = pick(rng, TEMPLATES);
    const state = { template: TEMPLATES.indexOf(template), slots: slotsOf(template), words: {}, index: 0 };
    return { state, reply: { text: `📝 **Mad Libs!** Give me some words and I'll turn them into a story. (Say "random" and I'll pick one for you.)\n\n1/${state.slots.length}: Give me ${PROMPTS[state.slots[0]]}.`, chips: ['Random'], mood: 'playful' } };
  },
  move({ text, rng }, state) {
    const slot = state.slots[state.index];
    let word = text.trim().replace(/^["'“”]+|["'“”.!?]+$/g, '').trim();
    if (!word) return { reply: { text: `I need ${PROMPTS[slot]}!`, chips: ['Random'] } };
    if (/^(?:random|you pick|you choose|surprise me|skip|idk|i do not know|dunno|any|anything|whatever)$/i.test(word)) word = pick(rng, BANK[bankKey(slot)]);
    if (word.length > 40 || word.split(/\s+/).length > 5) return { reply: { text: `That's a bit long! Just ${PROMPTS[slot]}, a word or two.`, chips: ['Random'] } };
    state.words[slot] = escapeMd(word);
    state.index++;
    if (state.index < state.slots.length) {
      const next = state.slots[state.index];
      return { reply: { text: `${pick(rng, ['Got it!', 'Ooh, nice.', 'Perfect.', 'Love it.', 'Noted!'])} ${state.index + 1}/${state.slots.length}: Give me ${PROMPTS[next]}.`, chips: ['Random'] } };
    }
    return {
      reply: { text: `${fillTemplate(TEMPLATES[state.template], state.words)}\n\n😂 A masterpiece!`, chips: ['Another Mad Lib', 'Something else'], mood: 'laughing' },
      done: true,
      outcome: null,
    };
  },
  quit() { return 'Story cancelled. It was going to be a masterpiece, too. 📝'; },
  nudge(state) { return `Give me ${PROMPTS[state.slots[state.index]].replace(/\*\*/g, '')} (or "random", or "quit").`; },
  repeat(state) { return { text: `${state.index + 1}/${state.slots.length}: Give me ${PROMPTS[state.slots[state.index]]}.`, chips: ['Random'] }; },
};

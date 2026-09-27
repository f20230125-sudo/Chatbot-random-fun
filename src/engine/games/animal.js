// "Think of an animal": the classic learning game. The bot walks a yes/no
// decision tree, and when it guesses wrong it asks you to teach it a new
// question. The tree is saved, so Noodle gets smarter every time it loses.

import { withArticle, capitalize, trimPhrase } from '../util.js';
import { parseYesNo } from './common.js';

const L = (animal) => ({ animal });
const Qn = (q, yes, no) => ({ q, yes, no });

export const DEFAULT_TREE = Qn('Does it live in water?',
  Qn('Is it a mammal?',
    Qn('Is it enormous?', L('blue whale'), L('dolphin')),
    Qn('Does it have tentacles?', L('octopus'), Qn('Does it have a shell?', L('turtle'), L('shark')))),
  Qn('Can it fly?',
    Qn('Is it a bird?',
      Qn('Is it mostly active at night?', L('owl'), Qn('Can it copy human speech?', L('parrot'), L('eagle'))),
      Qn('Does it make honey?', L('bee'), L('bat'))),
    Qn('Is it a common pet?',
      Qn('Does it bark?', L('dog'), Qn('Does it purr?', L('cat'), L('hamster'))),
      Qn('Is it bigger than a person?',
        Qn('Does it have a trunk?', L('elephant'), Qn('Does it have a very long neck?', L('giraffe'), Qn('Is it a big cat?', L('lion'), L('bear')))),
        Qn('Is it a reptile?', Qn('Does it have legs?', L('lizard'), L('snake')), Qn('Does it have a bushy tail?', L('squirrel'), L('frog')))))));

const MAX_NODES = 400;
const countNodes = (n) => (n.animal ? 1 : 1 + countNodes(n.yes) + countNodes(n.no));
export const knownAnimals = (n) => (n.animal ? [n.animal] : [...knownAnimals(n.yes), ...knownAnimals(n.no)]);

const nodeAt = (tree, path) => path.reduce((n, step) => n[step], tree);

function cleanAnimal(text) {
  return trimPhrase(text.toLowerCase())
    .replace(/^(?:it (?:was|is)|its|it s|i was thinking (?:of|about)|i thought of|the answer (?:is|was)|my animal (?:is|was)|i picked|a|an|the)\s+/g, '')
    .replace(/^(?:a|an|the)\s+/, '')
    .replace(/[^\p{L}\s'-]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Turns "it has stripes" into "Does it have stripes?" and tidies real questions. */
export function toQuestion(text) {
  let q = trimPhrase(text).replace(/\s+/g, ' ');
  const statement = [
    [/^it (?:has|have) (.+)$/i, 'Does it have $1'],
    [/^it is (.+)$/i, 'Is it $1'],
    [/^its (.+)$/i, 'Is it $1'],
    [/^it can (.+)$/i, 'Can it $1'],
    [/^it (\w+?)s (.+)$/i, 'Does it $1 $2'],
    [/^it (\w+?)s$/i, 'Does it $1'],
  ];
  if (!/\?$/.test(text.trim()) && !/^(?:is|does|do|can|has|have|are|was|will|would|could|should|did)\b/i.test(q)) {
    for (const [re, rep] of statement) {
      if (re.test(q)) { q = q.replace(re, rep); break; }
    }
  }
  if (!/^(?:is|does|do|can|has|have|are|was|will|would|could|should|did)\b/i.test(q)) return null;
  return `${capitalize(q)}?`;
}

export const animal = {
  id: 'animal',
  title: 'Think of an animal',
  emoji: '🦁',
  blurb: 'I guess your animal, and learn when I lose',
  start({ memory }) {
    const tree = memory.get('animalTree') ?? DEFAULT_TREE;
    const count = knownAnimals(tree).length;
    return {
      state: { stage: 'ready', path: [] },
      reply: { text: `🦁 **Think of an animal**, any animal, and I'll try to guess it with yes/no questions. I know **${count}** animals so far, and if you stump me, I'll learn a new one!\n\nGot one in mind?`, chips: ['Ready!'], mood: 'curious' },
    };
  },
  move(ctx, state) {
    const { text, memory } = ctx;
    const tree = memory.get('animalTree') ?? structuredClone(DEFAULT_TREE);
    const yn = parseYesNo(text);

    if (state.stage === 'ready') {
      if (yn === 'no') return { reply: { text: 'Take your time! Say **ready** when you have one. 🐾', chips: ['Ready!'] } };
      if (yn === 'yes' || /\b(?:ready|go|got one|start|ok)\b/i.test(text)) { state.stage = 'asking'; return { reply: ask(tree, state) }; }
      return null;
    }
    if (state.stage === 'asking') {
      if (!yn) return null;
      if (yn === 'maybe') return { reply: { text: "Tricky! Go with your best guess: **yes** or **no**?", chips: ['Yes', 'No'] } };
      const node = nodeAt(tree, state.path);
      if (node.animal) {
        if (yn === 'yes') {
          return { reply: { text: `🎉 **I got it!** It was ${withArticle(node.animal)}! My noodle is on fire today. 🔥`, chips: ['Play again', 'Something else'], mood: 'smug' }, done: true, outcome: 'loss' };
        }
        state.stage = 'what';
        state.wrong = node.animal;
        return { reply: { text: '😩 You stumped me! **What animal were you thinking of?**', mood: 'surprised' } };
      }
      state.path.push(yn);
      return { reply: ask(tree, state) };
    }
    if (state.stage === 'what') {
      const name = cleanAnimal(text);
      if (!name || yn || name.length > 40 || name.split(' ').length > 4) return { reply: { text: 'Just tell me the animal\'s name, please (like "penguin"). 🐾' } };
      if (knownAnimals(tree).includes(name)) {
        return { reply: { text: `Oh! I already know ${withArticle(name)}. One of my questions must have tricked us. 🤔 Good game!`, chips: ['Play again', 'Something else'] }, done: true, outcome: 'win' };
      }
      state.stage = 'teach';
      state.answer = name;
      return { reply: { text: `${capitalize(withArticle(name))}! Nice one. 🎓 Teach me: give me a **yes/no question** that's **yes** for ${withArticle(name)} but **no** for ${withArticle(state.wrong)}.\n_(For example: "Does it have stripes?")_`, chips: ['Skip'] } };
    }
    if (state.stage === 'teach') {
      if (/^(?:skip|no|nah|idk|i do not know|dunno|pass)$/i.test(text.trim())) {
        return { reply: { text: `No worries! You win this round. ${capitalize(withArticle(state.answer))} will stay a mystery to me… for now. 🏆`, chips: ['Play again', 'Something else'] }, done: true, outcome: 'win' };
      }
      const q = toQuestion(text);
      if (!q || q.length < 8 || q.length > 140) return { reply: { text: 'Hmm, phrase it as a yes/no question, like "Does it have stripes?" or "Is it black and white?"', chips: ['Skip'] } };
      if (countNodes(tree) < MAX_NODES) {
        const node = nodeAt(tree, state.path);
        const learned = Qn(q, L(state.answer), L(node.animal));
        if (state.path.length === 0) memory.set('animalTree', learned);
        else {
          const parent = nodeAt(tree, state.path.slice(0, -1));
          parent[state.path[state.path.length - 1]] = learned;
          memory.set('animalTree', tree);
        }
      }
      const total = knownAnimals(memory.get('animalTree') ?? tree).length;
      return {
        reply: { text: `🧠 Got it! "${q}" Now I know **${total}** animals. You win this round, but next time I'll be ready! 😤`, chips: ['Play again', 'Something else'], mood: 'happy' },
        done: true,
        outcome: 'win',
      };
    }
    return null;
  },
  quit() { return 'Okay! Your animal remains a mystery. 🐾'; },
  nudge(state) {
    return { ready: 'Think of an animal and say "ready".', asking: 'Answer yes or no (or say "quit").', what: 'What animal was it?', teach: 'Give me a yes/no question, or say "skip".' }[state.stage];
  },
  repeat(state, ctx) {
    const tree = ctx?.memory?.get('animalTree') ?? DEFAULT_TREE;
    return state.stage === 'asking' ? ask(tree, state, true) : { text: this.nudge(state) };
  },
};

function ask(tree, state, again = false) {
  const node = nodeAt(tree, state.path);
  const n = state.path.length + 1;
  if (node.animal) return { text: `🤔 ${again ? 'My guess:' : `Question ${n}:`} **Is it ${withArticle(node.animal)}?**`, chips: ['Yes', 'No'], mood: 'curious' };
  return { text: `❓ Question ${n}: **${node.q}**`, chips: ['Yes', 'No', 'Not sure'], mood: 'curious' };
}

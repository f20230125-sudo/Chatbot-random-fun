// Multiple-choice trivia: five questions a round, answer by letter, number or name.

import { shuffle, pick } from '../util.js';
import { answerMatches } from './common.js';

const Q = (cat, q, options, answer, fact = '') => ({ cat, q, options, answer, fact });

export const QUESTIONS = [
  Q('geography', 'What is the capital of Australia?', ['Sydney', 'Melbourne', 'Canberra', 'Perth'], 2, 'Canberra was purpose-built as a compromise between Sydney and Melbourne.'),
  Q('space', 'Which is the largest planet in our solar system?', ['Earth', 'Jupiter', 'Saturn', 'Neptune'], 1, 'You could fit about 1,300 Earths inside Jupiter.'),
  Q('science', 'What is the chemical symbol for gold?', ['Go', 'Gd', 'Au', 'Ag'], 2, '"Au" comes from the Latin word "aurum".'),
  Q('animals', 'How many legs does a spider have?', ['6', '8', '10', '12'], 1),
  Q('geography', 'Which river flows through Cairo?', ['Tigris', 'Nile', 'Euphrates', 'Jordan'], 1),
  Q('arts', 'Who painted the Mona Lisa?', ['Michelangelo', 'Leonardo da Vinci', 'Raphael', 'Vincent van Gogh'], 1),
  Q('science', 'What is the hardest natural substance?', ['Gold', 'Iron', 'Diamond', 'Quartz'], 2),
  Q('math', 'What is the smallest prime number?', ['0', '1', '2', '3'], 2, '2 is also the only even prime.'),
  Q('science', 'Which gas do plants absorb from the air?', ['Oxygen', 'Nitrogen', 'Carbon dioxide', 'Helium'], 2),
  Q('geography', 'Which skyscraper in Dubai stands 828 metres tall?', ['Shanghai Tower', 'Burj Khalifa', 'Taipei 101', 'One World Trade Center'], 1),
  Q('geography', 'How many continents are there?', ['5', '6', '7', '8'], 2),
  Q('science', 'What is H₂O better known as?', ['Salt', 'Water', 'Hydrogen peroxide', 'Oxygen'], 1),
  Q('space', 'Which planet is known as the Red Planet?', ['Venus', 'Mars', 'Jupiter', 'Mercury'], 1, 'Its red colour comes from iron oxide: rust!'),
  Q('arts', 'Who wrote "Romeo and Juliet"?', ['Charles Dickens', 'William Shakespeare', 'Jane Austen', 'Mark Twain'], 1),
  Q('animals', 'What is the fastest land animal?', ['Lion', 'Cheetah', 'Horse', 'Greyhound'], 1, 'Cheetahs can hit around 100 km/h in short bursts.'),
  Q('history', 'In which year did humans first land on the Moon?', ['1965', '1969', '1972', '1959'], 1, 'Apollo 11 landed on 20 July 1969.'),
  Q('science', 'How many bones are in the adult human body?', ['186', '206', '226', '256'], 1),
  Q('geography', 'What is the largest ocean on Earth?', ['Atlantic', 'Indian', 'Pacific', 'Arctic'], 2),
  Q('tech', 'What does CPU stand for?', ['Central Processing Unit', 'Computer Personal Unit', 'Central Program Utility', 'Core Processing Unit'], 0),
  Q('geography', 'Which language has the most native speakers?', ['English', 'Spanish', 'Mandarin Chinese', 'Hindi'], 2),
  Q('math', 'What is the square root of 144?', ['11', '12', '13', '14'], 1),
  Q('geography', 'What is the currency of Japan?', ['Yuan', 'Won', 'Yen', 'Ringgit'], 2),
  Q('animals', 'Which animal is called the "ship of the desert"?', ['Horse', 'Camel', 'Elephant', 'Donkey'], 1),
  Q('science', 'At what temperature does water freeze in Fahrenheit?', ['0°F', '32°F', '100°F', '212°F'], 1),
  Q('science', 'Who developed the theory of relativity?', ['Isaac Newton', 'Albert Einstein', 'Niels Bohr', 'Galileo Galilei'], 1),
  Q('animals', 'Which country is home to wild kangaroos?', ['New Zealand', 'South Africa', 'Australia', 'Brazil'], 2),
  Q('sports', 'How many players does a football (soccer) team have on the pitch?', ['9', '10', '11', '12'], 2),
  Q('animals', 'What is the largest mammal?', ['African elephant', 'Blue whale', 'Giraffe', 'Hippopotamus'], 1),
  Q('arts', 'Which instrument usually has 88 keys?', ['Guitar', 'Violin', 'Piano', 'Harp'], 2),
  Q('geography', 'What is the capital of Canada?', ['Toronto', 'Vancouver', 'Ottawa', 'Montreal'], 2),
  Q('science', 'Which element has the chemical symbol O?', ['Gold', 'Osmium', 'Oxygen', 'Oganesson'], 2),
  Q('tech', 'Who is often called the "father of the computer"?', ['Alan Turing', 'Charles Babbage', 'Bill Gates', 'Tim Berners-Lee'], 1, 'Babbage designed the Analytical Engine in the 1830s. Ada Lovelace wrote programs for it!'),
  Q('math', 'How many sides does a hexagon have?', ['5', '6', '7', '8'], 1, 'Bees build hexagonal honeycomb because it uses the least wax.'),
  Q('history', 'In which country did the ancient Olympic Games begin?', ['Italy', 'Greece', 'France', 'Egypt'], 1),
  Q('food', 'What is the main ingredient in guacamole?', ['Tomato', 'Avocado', 'Peas', 'Cucumber'], 1),
  Q('space', 'Which planet has the most famous rings?', ['Jupiter', 'Saturn', 'Uranus', 'Mars'], 1),
  Q('math', 'How many hours are there in a week?', ['148', '168', '172', '186'], 1),
  Q('animals', 'What do bees make?', ['Milk', 'Silk', 'Honey', 'Butter'], 2),
  Q('animals', 'What is the national animal of Scotland?', ['Lion', 'Unicorn', 'Stag', 'Eagle'], 1, 'Yes, really: the unicorn!'),
  Q('geography', 'What is the capital of the United Arab Emirates?', ['Dubai', 'Sharjah', 'Abu Dhabi', 'Ajman'], 2),
  Q('history', 'Which is the longest wall ever built?', ["Hadrian's Wall", 'The Great Wall of China', 'The Berlin Wall', 'The Western Wall'], 1),
  Q('tech', 'Which programming language is named after a comedy group?', ['Ruby', 'Python', 'Java', 'Perl'], 1, 'Python is named after Monty Python, not the snake.'),
  Q('science', 'At what temperature does water boil at sea level (Celsius)?', ['90 °C', '100 °C', '110 °C', '120 °C'], 1),
  Q('science', 'What is the chemical symbol for sodium?', ['So', 'Sd', 'Na', 'S'], 2, 'From its Latin name, "natrium".'),
  Q('arts', 'How many strings does a standard guitar have?', ['4', '5', '6', '8'], 2),
  Q('geography', 'Which ocean lies between Africa and Australia?', ['Atlantic', 'Indian', 'Pacific', 'Southern'], 1),
  Q('geography', 'What is the largest desert in the world?', ['Sahara', 'Antarctic', 'Gobi', 'Arabian'], 1, 'A desert is defined by low precipitation, and Antarctica barely gets any!'),
  Q('science', 'Which organ pumps blood around your body?', ['Lungs', 'Liver', 'Heart', 'Kidneys'], 2),
  Q('math', 'What is 7 × 8?', ['54', '56', '58', '64'], 1),
  Q('arts', 'What colour do you get by mixing blue and yellow?', ['Purple', 'Orange', 'Green', 'Brown'], 2),
  Q('geography', 'What is the smallest country in the world?', ['Monaco', 'Vatican City', 'San Marino', 'Malta'], 1),
  Q('food', 'Which noodle dish from Japan is served in a rich broth?', ['Pad Thai', 'Ramen', 'Lo mein', 'Carbonara'], 1, 'The best kind of noodle, in my unbiased opinion. 🍜'),
  Q('math', 'How many minutes are in a day?', ['1,440', '1,240', '1,600', '3,600'], 0),
  Q('history', 'Who is credited with inventing the telephone?', ['Thomas Edison', 'Alexander Graham Bell', 'Nikola Tesla', 'Guglielmo Marconi'], 1),
  Q('tech', 'What does HTML stand for?', ['HyperText Markup Language', 'High Transfer Machine Language', 'HyperTool Multi Language', 'Home Tool Markup Language'], 0),
];

export const CATEGORIES = [...new Set(QUESTIONS.map((q) => q.cat))];
const LETTERS = ['A', 'B', 'C', 'D'];
const ROUND = 5;

const RIGHT = ['✅ Correct!', '✅ Yes! Nailed it.', '✅ Spot on!', '✅ Big brain energy!', '✅ Correct! 🎯'];
const WRONG = ['❌ Not quite.', '❌ Oof, no.', '❌ Nope!', '❌ Close, but no noodle.'];

function ask(state) {
  const item = state.questions[state.index];
  const opts = item.options.map((o, i) => `**${LETTERS[i]}.** ${o}`).filter((_, i) => !state.hidden.includes(i));
  return {
    text: `**Question ${state.index + 1}/${state.questions.length}**${state.streak >= 2 ? ` 🔥 ${state.streak} streak` : ''}\n${item.q}\n\n${opts.join('\n')}`,
    chips: item.options.map((o, i) => ({ label: `${LETTERS[i]} · ${o}`, value: LETTERS[i] })).filter((_, i) => !state.hidden.includes(i)).concat(state.used5050 ? [] : [{ label: '50/50 hint', value: 'hint' }]),
  };
}

function parseAnswer(text, item, hidden) {
  const t = text.trim().toLowerCase().replace(/^(?:i think |i guess |maybe |the answer is |answer |option |it is |its |it's |is it )/, '').replace(/[.!?)]+$/, '').trim();
  let m = t.match(/^([abcd])$/) ?? t.match(/^([abcd])[\s:.)-]/) ?? t.match(/^(?:option |letter )?([abcd])$/);
  if (m) return LETTERS.indexOf(m[1].toUpperCase());
  m = t.match(/^([1-4])$/);
  if (m && !item.options.some((o) => o === m[1])) return +m[1] - 1;
  const exact = item.options.findIndex((o, i) => !hidden.includes(i) && o.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '') === t.replace(/[^\p{L}\p{N}]/gu, ''));
  if (exact >= 0) return exact;
  const fuzzy = item.options.map((o, i) => [i, answerMatches(text, o)]).filter(([i, ok]) => ok && !hidden.includes(i));
  return fuzzy.length === 1 ? fuzzy[0][0] : -1;
}

export const trivia = {
  id: 'trivia',
  title: 'Trivia',
  emoji: '🧠',
  blurb: 'five multiple-choice questions',
  start({ rng, p }) {
    const cat = CATEGORIES.find((c) => p.includes(c) || (c === 'space' && /\b(?:astronomy|planets?)\b/.test(p)) || (c === 'tech' && /\b(?:computers?|coding|programming|technology)\b/.test(p)) || (c === 'math' && /\bmaths?\b/.test(p)));
    const pool = cat ? QUESTIONS.filter((q) => q.cat === cat) : QUESTIONS;
    const state = { questions: shuffle(rng, pool).slice(0, Math.min(ROUND, pool.length)), index: 0, score: 0, streak: 0, best: 0, hidden: [], used5050: false, cat };
    const intro = `🧠 **Trivia time${cat ? `: ${cat}` : ''}!** ${state.questions.length} questions. Answer with a letter, or type the answer.`;
    const q = ask(state);
    return { state, reply: { text: `${intro}\n\n${q.text}`, chips: q.chips, mood: 'excited' } };
  },
  move({ text, rng }, state) {
    const item = state.questions[state.index];
    const choice = parseAnswer(text, item, state.hidden);
    if (choice < 0) return null;
    const right = choice === item.answer;
    state.hidden = [];
    if (right) { state.score++; state.streak++; state.best = Math.max(state.best, state.streak); } else state.streak = 0;
    let text2 = right ? pick(rng, RIGHT) : `${pick(rng, WRONG)} It was **${LETTERS[item.answer]}. ${item.options[item.answer]}**.`;
    if (item.fact) text2 += ` 💡 ${item.fact}`;
    state.index++;
    if (state.index >= state.questions.length) {
      const n = state.questions.length;
      const verdict = state.score === n ? '🏆 **Perfect score!** You absolute genius.' : state.score >= n * 0.6 ? '🎉 Great job!' : state.score > 0 ? '🙂 Not bad! Practice makes perfect.' : '🥲 Zero! But hey, now you know five new things.';
      return {
        reply: { text: `${text2}\n\n**Final score: ${state.score}/${n}**. ${verdict}`, chips: ['Play trivia again', 'Science trivia', 'Something else'], mood: state.score >= n * 0.6 ? 'excited' : 'happy', actions: state.score === n ? [{ type: 'confetti' }] : [] },
        done: true,
        outcome: state.score >= Math.ceil(n / 2) ? 'win' : 'loss',
      };
    }
    const q = ask(state);
    return { reply: { text: `${text2}\n\n${q.text}`, chips: q.chips, mood: right ? 'happy' : 'playful' } };
  },
  giveUp(ctx, state) {
    // "I don't know" counts as a wrong answer, not quitting the whole round.
    const item = state.questions[state.index];
    const wrong = [0, 1, 2, 3].find((i) => i !== item.answer);
    const result = this.move({ ...ctx, text: LETTERS[wrong] }, state);
    return { ...result.reply, text: result.reply.text.replace(/^❌[^\n]*?It was/, '🤷 No worries! It was') };
  },
  hint({ rng }, state) {
    if (state.used5050) return { text: "You've already used your 50/50 this round! 🙊", chips: ask(state).chips };
    const item = state.questions[state.index];
    const wrong = shuffle(rng, [0, 1, 2, 3].filter((i) => i !== item.answer)).slice(0, 2);
    state.hidden = wrong;
    state.used5050 = true;
    const q = ask(state);
    return { text: `✂️ 50/50! Two wrong answers gone.\n\n${q.text}`, chips: q.chips };
  },
  quit(ctx, state) {
    return `Trivia over. You scored **${state.score}/${state.index}** on the questions you answered.`;
  },
  nudge() { return 'Answer with A, B, C or D (or say "hint", or "quit").'; },
  repeat(state) { return ask(state); },
};

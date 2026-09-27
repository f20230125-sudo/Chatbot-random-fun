import { test } from 'node:test';
import assert from 'node:assert/strict';
import { winner, bestMoves, botMove, parseCell } from '../src/engine/games/tictactoe.js';
import { rps, parseMove, beats, MOVES } from '../src/engine/games/rps.js';
import { botGuesses } from '../src/engine/games/guess.js';
import { toQuestion } from '../src/engine/games/animal.js';
import { fillTemplate, TEMPLATES } from '../src/engine/games/madlibs.js';
import { parseYesNo } from '../src/engine/games/common.js';
import { mulberry32, plain } from '../src/engine/util.js';
import { friendlyBot, makeBot, say } from './helpers.js';
import { memoryStore } from '../src/engine/memory.js';

test('hard tic-tac-toe never loses, against every possible line of play', () => {
  const rng = mulberry32(1);
  let games = 0;
  // Explore every sequence of human moves; the bot always answers with an optimal move.
  function explore(board) {
    const w = winner(board);
    if (w) { assert.notEqual(w.mark, 'X', `human won: ${board.join('')}`); games++; return; }
    for (let i = 0; i < 9; i++) {
      if (board[i]) continue;
      const b = [...board];
      b[i] = 'X';
      if (winner(b)) { assert.notEqual(winner(b).mark, 'X', `human won: ${b.join('')}`); games++; continue; }
      for (const reply of bestMoves(b)) {
        const next = [...b];
        next[reply] = 'O';
        explore(next);
      }
    }
  }
  explore(Array(9).fill(''));
  // And when the bot moves first.
  for (const first of bestMoves(Array(9).fill(''))) {
    const b = Array(9).fill('');
    b[first] = 'O';
    explore(b);
  }
  assert.ok(games > 1000, `explored ${games} games`);
  assert.ok(botMove(['X', 'X', '', 'O', '', '', '', '', ''], 'hard', rng) === 2, 'blocks an open row');
});

test('tic-tac-toe understands squares by number and by name', () => {
  assert.equal(parseCell('5'), 4);
  assert.equal(parseCell('top left'), 0);
  assert.equal(parseCell("I'll take the center"), 4);
  assert.equal(parseCell('put it in 9'), 8);
  assert.equal(parseCell('bottom right corner'), 8);
  assert.equal(parseCell('banana'), null);
});

test('rock-paper-scissors learns patterned players', () => {
  const patterns = {
    'always rock': () => 'rock',
    cycle: (i) => MOVES[i % 3],
    'copy the bot': (i, h) => (h.length ? h[h.length - 1].me : 'paper'),
    'beat your own last move': (i, h) => (h.length ? beats(h[h.length - 1].you) : 'rock'),
  };
  for (const [name, player] of Object.entries(patterns)) {
    const rng = mulberry32(9);
    const { state } = rps.start({ rng });
    let botWins = 0;
    let humanWins = 0;
    for (let i = 0; i < 60; i++) {
      const move = player(i, state.history);
      const r = rps.move({ text: move, rng }, state);
      const last = state.history[state.history.length - 1];
      if (last.result === 'me') botWins++;
      if (last.result === 'you') humanWins++;
      if (r.done) { const fresh = rps.start({ rng }).state; state.you = fresh.you; state.me = fresh.me; state.next = fresh.next; }
    }
    assert.ok(botWins > humanWins * 2, `${name}: bot ${botWins} vs human ${humanWins}`);
  }
  assert.equal(parseMove('✊'), 'rock');
  assert.equal(parseMove('Scissors!'), 'scissors');
  assert.equal(parseMove('spock'), 'rpsls');
  assert.equal(parseMove('hello'), null);
});

test('number guesser finds any number in 7 guesses and catches fibbers', () => {
  for (let secret = 1; secret <= 100; secret++) {
    const { state } = botGuesses.start();
    let r = botGuesses.move({ text: 'ready', p: 'ready' }, state);
    let guesses = 1;
    while (!r.done) {
      const guess = state.current;
      const answer = guess === secret ? 'correct' : guess < secret ? 'higher' : 'lower';
      r = botGuesses.move({ text: answer, p: answer }, state);
      if (!r.done) guesses++;
    }
    assert.ok(guesses <= 7, `${secret} took ${guesses}`);
  }
  const { state } = botGuesses.start();
  botGuesses.move({ text: 'ready', p: 'ready' }, state);
  let r;
  for (const a of ['higher', 'higher', 'lower', 'lower', 'higher', 'lower', 'higher', 'lower']) {
    r = botGuesses.move({ text: a, p: a }, state);
    if (r.done) break;
  }
  assert.match(r.reply.text, /fibbing|impossible/);
});

test('yes/no parsing is forgiving', () => {
  for (const y of ['yes', 'Yep!', 'yeah it does', 'sure', 'of course', '👍', 'i think so']) assert.equal(parseYesNo(y), 'yes', y);
  for (const n of ['no', 'Nope', 'nah', 'not really', 'probably not', "it doesn't", '👎']) assert.equal(parseYesNo(n), 'no', n);
  for (const m of ['maybe', 'idk', 'not sure', 'sometimes']) assert.equal(parseYesNo(m), 'maybe', m);
  assert.equal(parseYesNo('banana'), null);
});

test('the animal game learns new animals and remembers them', async () => {
  const store = memoryStore();
  const bot = await friendlyBot({ store });
  await say(bot, 'think of an animal', 'ready');
  // Walk the "no" branch all the way to a guess, then teach it an axolotl.
  let r;
  for (let i = 0; i < 12; i++) {
    r = await bot.reply('no');
    if (/What animal/.test(r.text)) break;
  }
  assert.match(r.text, /What animal/);
  r = await bot.reply('an axolotl');
  assert.match(r.text, /Teach me/);
  r = await bot.reply('it lives in lakes in mexico');
  assert.match(r.text, /Does it live in lakes in mexico\?/);
  assert.match(r.text, /22\*\* animals/);
  // A new bot with the same storage still knows it.
  const again = makeBot({ store });
  const start = await again.reply('think of an animal');
  assert.match(start.text, /22\*\* animals/);
  assert.equal(toQuestion('it has stripes'), 'Does it have stripes?');
  assert.equal(toQuestion('Is it green'), 'Is it green?');
  assert.equal(toQuestion('banana'), null);
});

test('hangman: guessing, repeats, invalid input, winning', async () => {
  const bot = await friendlyBot({ seed: 5 });
  await bot.reply('play hangman');
  const word = bot.session.game.state.word;
  let r = await bot.reply('7');
  assert.match(r.text, /Letters only/);
  r = await bot.reply(word[0]);
  r = await bot.reply(word[0]);
  assert.match(r.text, /already tried/);
  for (const ch of new Set(word)) r = await bot.reply(ch);
  assert.match(r.text, /You got it/);
  assert.equal(bot.session.game, null);
  assert.equal(bot.memory.stats.won, 1);
});

test('trivia: letters, names, 50/50 and "I don\'t know"', async () => {
  const bot = await friendlyBot({ seed: 11 });
  await bot.reply('play trivia');
  const q = () => bot.session.game.state.questions[bot.session.game.state.index];
  let r = await bot.reply(q().options[q().answer]);
  assert.match(r.text, /✅/);
  r = await bot.reply('hint');
  assert.match(r.text, /50\/50/);
  r = await bot.reply('idk');
  assert.match(r.text, /No worries! It was/);
  r = await bot.reply('what is the capital of peru?');
  assert.match(r.text, /still playing Trivia/);
  for (let i = 0; i < 3; i++) r = await bot.reply(['A', 'B', 'C', 'D'][q().answer]);
  assert.match(r.text, /Final score: 4\/5/);
});

test('riddles accept close answers and reveal on give up', async () => {
  const bot = await friendlyBot({ seed: 2 });
  await bot.reply('tell me a riddle');
  const answer = bot.session.game.state.riddle.a[0];
  let r = await bot.reply(`is it a ${answer}?`);
  assert.match(r.text, /Correct|Yes|Got it|That's it/);
  r = await bot.reply('another');
  assert.match(r.text, /Next riddle/);
  r = await bot.reply('give up');
  assert.match(r.text, /The answer was/);
});

test('mad libs fills every blank and escapes markdown', () => {
  const words = Object.fromEntries([...TEMPLATES[0].text.matchAll(/\{(\w+)\}/g), ...TEMPLATES[0].title.matchAll(/\{(\w+)\}/g)].map((m) => [m[1], 'x']));
  const story = fillTemplate(TEMPLATES[0], words);
  assert.doesNotMatch(story, /\{\w+\}/);
});

test('knock-knock jokes work in both directions', async () => {
  const bot = await friendlyBot();
  let r = await bot.reply('knock knock');
  assert.match(r.text, /Who's there/);
  r = await bot.reply('Boo');
  assert.match(r.text, /Boo who\?/);
  r = await bot.reply("don't cry, it's just a joke");
  assert.match(r.text, /😂|🤣|😆|🙈|🥁/);
  r = await bot.reply('tell me a knock knock joke');
  assert.match(r.text, /Knock knock/);
  r = await bot.reply("who's there?");
  const who = plain(r.text.replace(/\.$/, ''));
  r = await bot.reply(`${who} who?`);
  assert.equal(bot.session.game, null);
});

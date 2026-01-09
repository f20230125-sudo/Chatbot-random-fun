import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tryMath, describeMath, evaluate, solve, MathError } from '../src/engine/tools/calc.js';
import { tryConvert } from '../src/engine/tools/units.js';
import { tryDates, easter, isLeap } from '../src/engine/tools/dates.js';
import { tryRandom, tryText, tryTimer, parseDuration, toMorse, fromMorse, toRoman, fromRoman, numberFacts, makePassword } from '../src/engine/tools/misc.js';
import { mulberry32 } from '../src/engine/util.js';
import { NOW } from './helpers.js';

const math = (s) => {
  const r = tryMath(s);
  return r && (r.error ?? r.solution ?? r.value);
};

test('calculator handles everyday arithmetic and words', () => {
  assert.equal(math('2+2'), 4);
  assert.equal(math('what is 15% of 80'), 12);
  assert.equal(math('whats 5 times 6'), 30);
  assert.equal(math('what is the square root of 16'), 4);
  assert.equal(math('2 to the 10th power'), 1024);
  assert.equal(math('two hundred and five times 2'), 410);
  assert.equal(math('twenty-one plus five - three'), 23);
  assert.equal(math('(1+2)(3+4)'), 21);
  assert.equal(math('10 % 3'), 1);
  assert.equal(math('50%'), 0.5);
  assert.equal(math('5!'), 120);
  assert.equal(math('sin(30°)'), 0.5);
  assert.equal(math('sin(pi)'), 0);
  assert.equal(math('2^-1'), 0.5);
  assert.equal(math('1,000,000 / 4'), 250000);
  assert.equal(math('max(3, 9, 2)'), 9);
  assert.equal(math('divide 10 by 4'), 2.5);
  assert.match(describeMath(tryMath('0.1+0.2')), /\*\*0\.3\*\*/);
});

test('calculator solves linear and quadratic equations', () => {
  assert.deepEqual(solve('2x + 3 = 7'), { kind: 'roots', roots: [2] });
  assert.deepEqual(solve('x^2 - 5x + 6 = 0'), { kind: 'roots', roots: [2, 3] });
  assert.equal(solve('x^2 + 1 = 0').kind, 'complex');
  assert.equal(solve('x = x').kind, 'always');
  assert.equal(solve('x + 1 = x').kind, 'never');
  assert.deepEqual(solve('2+2 = 4'), { kind: 'check', ok: true });
  assert.throws(() => solve('sin(x) = 0'), MathError);
});

test('calculator explains impossible maths instead of crashing', () => {
  assert.match(describeMath(tryMath('1/0')), /black hole/i);
  assert.match(describeMath(tryMath('0/0')), /undefined|black hole/i);
  assert.match(describeMath(tryMath('sqrt(-4)')), /imaginary/);
  assert.match(describeMath(tryMath('log(0)')), /positive/);
  assert.match(describeMath(tryMath('(2+3')), /bracket/);
  assert.match(describeMath(tryMath('171!')), /infinity/);
  assert.throws(() => evaluate('1+'.repeat(200) + '1'), MathError);
  assert.throws(() => evaluate('('.repeat(100) + '1' + ')'.repeat(100)), MathError);
});

test('calculator ignores non-maths and never evaluates code', () => {
  for (const s of ['hello', 'I have 2 cats', 'tell me a joke', '42', 'what time is it', 'process.exit(1)', 'constructor', 'alert(1)', '__proto__', 'x', '25/12/2026']) {
    const r = tryMath(s);
    assert.ok(r === null || r.error, `${s} should not compute`);
  }
});

test('unit converter covers dimensions and refuses nonsense', () => {
  assert.match(tryConvert('convert 5 km to miles').text, /3\.1069 miles/);
  assert.match(tryConvert('100f to c').text, /37\.8°C/);
  assert.match(tryConvert('how many cm in an inch').text, /2\.54 centimetres/);
  assert.match(tryConvert('how many seconds in a day').text, /86,400/);
  assert.match(tryConvert('5 pounds to kg').text, /2\.268 kilograms/);
  assert.match(tryConvert('1 gb in mb').text, /1,000 megabytes/);
  assert.match(tryConvert('5 kg to miles').text, /apples and oranges/);
  assert.match(tryConvert('-300 c to f').text, /absolute zero/);
  assert.match(tryConvert('10 usd to aed').text, /currency/i);
  assert.match(tryConvert('5 zorbs to miles').text, /don't know the unit/);
  assert.equal(tryConvert("how many r's in strawberry"), null);
  assert.equal(tryConvert('set a timer for 5 minutes'), null);
});

test('date tool: clocks, countdowns, weekdays, ages and leap years', () => {
  const ctx = { now: NOW, memory: { birthday: { month: 10, day: 3 } } };
  assert.match(tryDates('how many days until christmas', ctx).text, /88 days/);
  assert.match(tryDates('days until 25/12', ctx).text, /88 days/);
  assert.match(tryDates('how long until my birthday', ctx).text, /5 days/);
  assert.match(tryDates('what day of the week was 2000-01-01', ctx).text, /Saturday/);
  assert.match(tryDates('is 2028 a leap year', ctx).text, /Yes/);
  assert.match(tryDates('is 1900 a leap year', ctx).text, /Nope/);
  assert.match(tryDates('days until 31/02', ctx).text, /doesn't exist/);
  assert.match(tryDates('when is eid', ctx).text, /lunar/);
  assert.match(tryDates("what's the time in Tokyo?", ctx).text, /Tokyo/);
  assert.match(tryDates('time in narnia', ctx).text, /don't know the time zone/);
  assert.match(tryDates('how long until my birthday', { now: NOW, memory: {} }).text, /don't know your birthday/);
  assert.match(tryDates('i was born in 2003 how old am i', ctx).text, /23/);
  assert.equal(tryDates('tell me a joke', ctx), null);
  assert.equal(easter(2026).getMonth(), 3); // 5 April 2026
  assert.equal(easter(2026).getDate(), 5);
  assert.ok(isLeap(2000) && !isLeap(2100));
});

test('dice, coins, pickers and cards', () => {
  const rng = mulberry32(3);
  for (let i = 0; i < 50; i++) {
    const total = Number(tryRandom('roll 3d6+2', rng).text.match(/\*\*(\d+)\*\*/)[1]);
    assert.ok(total >= 5 && total <= 20);
  }
  assert.match(tryRandom('roll d0', rng).text, /marble/);
  assert.match(tryRandom('roll 1000d6', rng).text, /100 dice/);
  assert.match(tryRandom('flip a coin', rng).text, /Heads|Tails|edge/);
  assert.match(tryRandom('flip 5 coins', rng).text, /heads/);
  assert.match(tryRandom('pick between pizza, tacos or sushi', rng).text, /pizza|tacos|sushi/);
  assert.match(tryRandom('draw a card', rng).text, /of (?:Spades|Hearts|Diamonds|Clubs)|Joker/);
  const n = Number(tryRandom('random number between 5 and 7', rng).text.match(/\*\*(\d+)\*\*/)[1]);
  assert.ok(n >= 5 && n <= 7);
  assert.equal(tryRandom('rock and roll', rng), null);
});

test('text tricks: the strawberry test, morse, binary, roman numerals', () => {
  assert.match(tryText("how many r's in strawberry").text, /\*\*3\*\*/);
  assert.match(tryText('how many times does s appear in mississippi').text, /\*\*4\*\*/);
  assert.equal(tryText('reverse hello').text, '🔁 olleh');
  assert.match(tryText('is racecar a palindrome').text, /Yes/);
  assert.equal(fromMorse(toMorse('hello world')), 'hello world');
  assert.match(tryText('01101000 01101001').text, /\*\*hi\*\*/);
  for (let n = 1; n <= 3999; n++) assert.equal(fromRoman(toRoman(n)), n);
  assert.equal(fromRoman('IIII'), null);
  assert.match(tryText('2026 in roman numerals').text, /MMXXVI/);
  assert.match(tryText('255 in hex').text, /0xFF/);
});

test('timers parse many phrasings and refuse silly ones', () => {
  assert.equal(parseDuration('1h 30m'), 5400);
  assert.equal(parseDuration('half an hour'), 1800);
  assert.equal(parseDuration('two hours and a half'), 9000);
  assert.deepEqual(tryTimer('remind me to drink water in 1 hour').action, { type: 'timer', seconds: 3600, label: 'Drink water' });
  assert.deepEqual(tryTimer('remind me in 10 minutes to stretch').action, { type: 'timer', seconds: 600, label: 'Stretch' });
  assert.match(tryTimer('set a timer').text, /How long/);
  assert.match(tryTimer('timer for 2 days').text, /24 hours/);
  assert.equal(tryTimer('countdown to christmas'), null);
  assert.equal(tryTimer('cancel my timers').action.type, 'cancel-timers');
});

test('number facts and passwords', () => {
  assert.match(numberFacts(7), /prime/);
  assert.match(numberFacts(1729), /Hardy/);
  assert.match(numberFacts(-8), /negative/);
  assert.doesNotMatch(numberFacts(-8), /Fibonacci/);
  const pw = makePassword(20);
  assert.equal(pw.length, 20);
  assert.match(pw, /[A-Z]/);
  assert.match(pw, /[a-z]/);
  assert.match(pw, /\d/);
  assert.notEqual(makePassword(20), pw);
});

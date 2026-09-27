// Rock-paper-scissors with a brain: several pattern-predictors compete, and
// the one that has been guessing your moves best decides what the bot plays.

import { pick } from '../util.js';

export const MOVES = ['rock', 'paper', 'scissors'];
const ICON = { rock: '✊', paper: '✋', scissors: '✌️' };
export const beats = (m) => MOVES[(MOVES.indexOf(m) + 1) % 3]; // the move that beats m
const TARGET = 5;

export function parseMove(text) {
  const t = text.trim().toLowerCase().replace(/[.!?]+$/, '');
  if (/^(?:r|rock|rocks|stone|✊|🪨|👊|🤛|🤜|✊🏻|✊🏼|✊🏽|✊🏾|✊🏿)$/u.test(t) || /\b(?:i (?:choose|pick|play|throw|go with)|go with) rock\b/.test(t)) return 'rock';
  if (/^(?:p|paper|papers|✋|📄|🖐️|🖐|🤚|📃|✋🏻|✋🏼|✋🏽|✋🏾|✋🏿)$/u.test(t) || /\b(?:i (?:choose|pick|play|throw|go with)|go with) paper\b/.test(t)) return 'paper';
  if (/^(?:s|scissors|scissor|sissors|scisors|✌️|✌|✂️|✂|✌🏻|✌🏼|✌🏽|✌🏾|✌🏿)$/u.test(t) || /\b(?:i (?:choose|pick|play|throw|go with)|go with) scissors?\b/.test(t)) return 'scissors';
  if (/^(?:lizard|spock|🦎|🖖)$/u.test(t)) return 'rpsls';
  return null;
}

/** Each predictor guesses the player's next move from the history, or null. */
const PREDICTORS = {
  frequency(h) {
    if (h.length < 3) return null;
    const counts = MOVES.map((m) => h.filter((x) => x.you === m).length);
    return MOVES[counts.indexOf(Math.max(...counts))];
  },
  markov1(h) {
    if (h.length < 3) return null;
    const last = h[h.length - 1].you;
    const next = MOVES.map((m) => h.slice(1).filter((x, i) => h[i].you === last && x.you === m).length);
    return Math.max(...next) > 0 ? MOVES[next.indexOf(Math.max(...next))] : null;
  },
  markov2(h) {
    if (h.length < 5) return null;
    const [a, b] = [h[h.length - 2].you, h[h.length - 1].you];
    const next = MOVES.map((m) => h.slice(2).filter((x, i) => h[i].you === a && h[i + 1].you === b && x.you === m).length);
    return Math.max(...next) > 0 ? MOVES[next.indexOf(Math.max(...next))] : null;
  },
  repeat(h) { return h.length ? h[h.length - 1].you : null; },
  cycle(h) { return h.length ? beats(h[h.length - 1].you) : null; },
  copyBot(h) { return h.length ? h[h.length - 1].me : null; },
  beatBot(h) { return h.length ? beats(h[h.length - 1].me) : null; },
  afterLoss(h) {
    // Many people switch to whatever would have beaten the move that just beat them.
    if (!h.length) return null;
    const last = h[h.length - 1];
    return last.result === 'me' ? beats(last.me) : last.you;
  },
};

export function chooseMove(state, rng) {
  const h = state.history;
  let best = null;
  let bestScore = 0.5;
  for (const [name, predict] of Object.entries(PREDICTORS)) {
    const guess = predict(h);
    const score = state.scores[name] ?? 0;
    if (guess && score > bestScore) { best = { name, guess }; bestScore = score; }
  }
  state.predictions = Object.fromEntries(Object.entries(PREDICTORS).map(([name, predict]) => [name, predict(h)]));
  // Early on, or when nothing is working, stay unpredictable.
  if (!best || h.length < 2) return { move: pick(rng, MOVES), predicted: null };
  return { move: beats(best.guess), predicted: best.guess };
}

function learn(state, you) {
  for (const [name, guess] of Object.entries(state.predictions ?? {})) {
    if (!guess) continue;
    // Exponentially weighted hit rate, so predictors adapt when the player changes style.
    state.scores[name] = (state.scores[name] ?? 0) * 0.85 + (guess === you ? 1 : 0);
  }
}

const outcomeOf = (you, me) => (you === me ? 'tie' : beats(me) === you ? 'you' : 'me');

export const rps = {
  id: 'rps',
  title: 'Rock, paper, scissors',
  emoji: '✊',
  blurb: `first to ${TARGET}, and I learn your patterns`,
  start({ rng }) {
    const state = { history: [], scores: {}, you: 0, me: 0, ties: 0, predictedRight: 0, predictedTotal: 0 };
    state.next = chooseMove(state, rng);
    return {
      state,
      reply: { text: `✊✋✌️ **Rock, paper, scissors!** First to ${TARGET} wins. Fair warning: I learn your patterns. 🧠\nThrow your move!`, chips: ['✊ Rock', '✋ Paper', '✌️ Scissors'].map((l) => ({ label: l, value: l.split(' ')[1].toLowerCase() })), mood: 'playful' },
    };
  },
  move({ text, rng }, state) {
    const you = parseMove(text);
    if (!you) return null;
    if (you === 'rpsls') return { reply: { text: '🖖 Ah, a Big Bang Theory fan! In this dojo we play classic rules: rock, paper or scissors.', chips: chips() } };
    const { move: me, predicted } = state.next; // committed before seeing your move, so no cheating
    const result = outcomeOf(you, me);
    if (predicted) { state.predictedTotal++; if (predicted === you) state.predictedRight++; }
    state.history.push({ you, me, result });
    learn(state, you);
    if (result === 'you') state.you++; else if (result === 'me') state.me++; else state.ties++;
    const line = `You ${ICON[you]} ${you} · Me ${ICON[me]} ${me}  →  ${result === 'tie' ? "**Tie!**" : result === 'you' ? '**You win this round!**' : '**I win this round!**'}`;
    const brag = predicted === you && result === 'me' && rng() < 0.5 ? `\n🔮 ${pick(rng, ['Saw that coming.', 'Predictable! 😏', 'I read you like a book.', 'My noodle knew.'])}` : '';
    const score = `Score: you **${state.you}** – me **${state.me}**${state.ties ? ` (${state.ties} ${state.ties === 1 ? 'tie' : 'ties'})` : ''}`;
    if (state.you >= TARGET || state.me >= TARGET) {
      const youWon = state.you >= TARGET;
      const acc = state.predictedTotal ? `\n🧠 I predicted your move **${state.predictedRight}/${state.predictedTotal}** times I tried${state.predictedRight / state.predictedTotal > 0.4 ? '. Humans are less random than they think!' : '. You were hard to read!'}` : '';
      return {
        reply: { text: `${line}\n${score}\n\n${youWon ? '🎉 **You win the match!** Your randomness defeated my algorithm.' : '🏆 **I win the match!** GG!'}${acc}`, chips: ['Play again', 'Something else'], mood: youWon ? 'surprised' : 'smug', actions: youWon ? [{ type: 'confetti' }] : [] },
        done: true,
        outcome: youWon ? 'win' : 'loss',
      };
    }
    state.next = chooseMove(state, rng);
    return { reply: { text: `${line}${brag}\n${score}`, chips: chips(), mood: result === 'me' ? 'smug' : result === 'you' ? 'surprised' : 'curious' } };
  },
  quit(ctx, state) { return `Final score: you **${state.you}** – me **${state.me}**. ✊`; },
  nudge() { return 'Throw rock, paper or scissors (or say "quit").'; },
  repeat() { return { text: 'Your move! Rock, paper or scissors?', chips: chips() }; },
};

const chips = () => [{ label: '✊ Rock', value: 'rock' }, { label: '✋ Paper', value: 'paper' }, { label: '✌️ Scissors', value: 'scissors' }];

// Tic-tac-toe against a minimax player. "hard" never loses; "normal" slips up
// now and then; "easy" mostly plays at random.

import { pick, chance } from '../util.js';

export const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];

export function winner(b) {
  for (const line of LINES) {
    const [a, c, d] = line;
    if (b[a] && b[a] === b[c] && b[a] === b[d]) return { mark: b[a], line };
  }
  return b.every(Boolean) ? { mark: 'draw', line: null } : null;
}

const memo = new Map();
/** Score of board `b` with `turn` to move, from O's point of view. */
function minimax(b, turn) {
  const key = b.map((c) => c || '.').join('') + turn;
  if (memo.has(key)) return memo.get(key);
  const w = winner(b);
  let score;
  if (w) {
    const empties = b.filter((c) => !c).length;
    score = w.mark === 'O' ? 10 + empties : w.mark === 'X' ? -10 - empties : 0;
  } else {
    const scores = [];
    for (let i = 0; i < 9; i++) {
      if (b[i]) continue;
      b[i] = turn;
      scores.push(minimax(b, turn === 'O' ? 'X' : 'O'));
      b[i] = '';
    }
    score = turn === 'O' ? Math.max(...scores) : Math.min(...scores);
  }
  memo.set(key, score);
  return score;
}

/** All optimal moves for O on board `b`. */
export function bestMoves(b) {
  let best = -Infinity;
  let moves = [];
  for (let i = 0; i < 9; i++) {
    if (b[i]) continue;
    b[i] = 'O';
    const s = minimax(b, 'X');
    b[i] = '';
    if (s > best) { best = s; moves = [i]; } else if (s === best) moves.push(i);
  }
  return moves;
}

export function botMove(b, difficulty, rng) {
  const free = b.map((c, i) => (c ? -1 : i)).filter((i) => i >= 0);
  const smart = difficulty === 'hard' || (difficulty === 'normal' ? chance(rng, 0.8) : chance(rng, 0.3));
  return smart ? pick(rng, bestMoves(b)) : pick(rng, free);
}

const POS = {
  'top left': 0, 'upper left': 0, 'top left corner': 0, tl: 0, 'top middle': 1, 'top center': 1, 'top centre': 1, top: 1, 'middle top': 1, 'top right': 2, 'upper right': 2, 'top right corner': 2, tr: 2,
  'middle left': 3, 'center left': 3, 'centre left': 3, left: 3, 'left middle': 3, center: 4, centre: 4, middle: 4, mid: 4, 'the middle': 4, 'dead center': 4,
  'middle right': 5, 'center right': 5, 'centre right': 5, right: 5, 'right middle': 5, 'bottom left': 6, 'lower left': 6, 'bottom left corner': 6, bl: 6,
  'bottom middle': 7, 'bottom center': 7, 'bottom centre': 7, bottom: 7, 'middle bottom': 7, 'bottom right': 8, 'lower right': 8, 'bottom right corner': 8, br: 8,
};

export function parseCell(text) {
  const t = text.toLowerCase().replace(/[.!?]+$/, '').replace(/^(?:i(?:'ll| will)? (?:take|pick|choose|go(?: with)?|play)|take|put (?:it |my x |an x |x )?(?:in|on|at)?|go(?: in| on)?|play|let's go|lets go|mark|my move is|move|i choose)\s*/, '')
    .replace(/^(?:the |square |spot |cell |box |number |position |no\.? )+/, '').replace(/\s+(?:square|spot|cell|box|one|please)$/, '').trim();
  if (/^[1-9]$/.test(t)) return +t - 1;
  return POS[t] ?? null;
}

const render = (b) => {
  const cell = (i) => b[i] || String(i + 1);
  return ['```', ` ${cell(0)} │ ${cell(1)} │ ${cell(2)}`, '───┼───┼───', ` ${cell(3)} │ ${cell(4)} │ ${cell(5)}`, '───┼───┼───', ` ${cell(6)} │ ${cell(7)} │ ${cell(8)}`, '```'].join('\n');
};
const card = (b, done = false, win = null) => ({ type: 'tictactoe', cells: [...b], win, active: !done });

/** Would `mark` win next move if unblocked? Returns the winning cell or -1. */
function threat(b, mark) {
  for (const [a, c, d] of LINES) {
    const cells = [b[a], b[c], b[d]];
    if (cells.filter((x) => x === mark).length === 2 && cells.includes('')) return [a, c, d][cells.indexOf('')];
  }
  return -1;
}

function finish(state, lead) {
  const w = winner(state.board);
  if (!w) return null;
  const outcome = w.mark === 'X' ? 'win' : w.mark === 'O' ? 'loss' : 'draw';
  const msg = {
    win: '🎉 **You win!** I did not see that coming. Well played!',
    loss: '😏 **I win!** Three in a row. Better luck next time!',
    draw: "🤝 **It's a draw!** Great minds think alike.",
  }[outcome];
  return {
    reply: {
      text: `${lead ? `${lead}\n` : ''}${render(state.board)}\n${msg}${state.difficulty === 'hard' && outcome === 'draw' ? ' (On hard mode, a draw is the best anyone can do.)' : ''}`,
      card: card(state.board, true, w.line),
      chips: ['Play again', `Play ${state.difficulty === 'hard' ? 'easy' : 'hard'} mode`, 'Something else'],
      mood: outcome === 'win' ? 'surprised' : outcome === 'loss' ? 'smug' : 'happy',
      actions: outcome === 'win' ? [{ type: 'confetti' }] : [],
    },
    done: true,
    outcome,
  };
}

export const tictactoe = {
  id: 'tictactoe',
  title: 'Tic-tac-toe',
  emoji: '❌',
  blurb: 'easy, normal or unbeatable hard mode',
  start({ p, rng }) {
    const difficulty = /\b(?:hard|impossible|expert|unbeatable|difficult)\b/.test(p) ? 'hard' : /\b(?:easy|beginner|simple)\b/.test(p) ? 'easy' : 'normal';
    const state = { board: Array(9).fill(''), difficulty };
    let lead = `❌⭕ **Tic-tac-toe** (${difficulty} mode). You're **X**, I'm **O**.`;
    if (/\b(?:you (?:go |start |play )?first|you start|computer first|bot first)\b/.test(p)) {
      const i = botMove(state.board, difficulty, rng);
      state.board[i] = 'O';
      lead += ` I'll start in square ${i + 1}. Your move!`;
    } else {
      lead += ' You go first: pick a square from 1 to 9.';
    }
    return { state, reply: { text: `${lead}\n${render(state.board)}`, card: card(state.board), mood: 'playful' } };
  },
  move({ text, rng }, state) {
    const cell = parseCell(text);
    if (cell === null) {
      if (/^\s*\d+\s*$/.test(text)) return { reply: { text: `🙃 Pick a square from 1 to 9.\n${render(state.board)}`, card: card(state.board) } };
      return null;
    }
    if (state.board[cell]) return { reply: { text: `🚫 Square ${cell + 1} is taken! Try another.\n${render(state.board)}`, card: card(state.board) } };
    state.board[cell] = 'X';
    const over = finish(state);
    if (over) return over;
    const userThreat = threat(state.board, 'X');
    const i = botMove(state.board, state.difficulty, rng);
    state.board[i] = 'O';
    let lead = `I'll take **${i + 1}**.`;
    if (winner(state.board)?.mark === 'O') lead = `I'll take **${i + 1}**…`;
    else if (userThreat === i) lead = `Blocked you at **${i + 1}**! 🛡️`;
    else if (threat(state.board, 'O') >= 0) lead = `I'll take **${i + 1}**. Your move… 😏`;
    const end = finish(state, lead);
    if (end) return end;
    return { reply: { text: `${lead}\n${render(state.board)}`, card: card(state.board), mood: 'curious' } };
  },
  quit(ctx, state) { return state.board.some(Boolean) ? 'Game abandoned. I\'ll count that as a moral victory for the noodle. 😌' : 'No worries!'; },
  nudge() { return 'Pick a square from 1 to 9 (or say "quit").'; },
  repeat(state) { return { text: render(state.board), card: card(state.board) }; },
};

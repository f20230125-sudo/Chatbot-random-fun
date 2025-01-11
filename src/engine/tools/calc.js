// A safe calculator: a hand-written tokenizer and recursive-descent parser.
// No eval(), no Function(), so any input is safe to feed it.

import { formatNumber } from '../util.js';

export class MathError extends Error {}

const FUNCS = {
  sqrt: Math.sqrt, cbrt: Math.cbrt, abs: Math.abs, round: Math.round, floor: Math.floor, ceil: Math.ceil,
  sin: Math.sin, cos: Math.cos, tan: Math.tan, asin: Math.asin, acos: Math.acos, atan: Math.atan,
  sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh, exp: Math.exp,
  log: Math.log10, lg: Math.log10, ln: Math.log, log2: Math.log2, log10: Math.log10,
  min: Math.min, max: Math.max, sign: Math.sign,
};
const TRIG = new Set(['sin', 'cos', 'tan', 'asin', 'acos', 'atan']);
const CONSTS = { pi: Math.PI, π: Math.PI, e: Math.E, tau: 2 * Math.PI, phi: (1 + Math.sqrt(5)) / 2 };

const ONES = { zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19 };
const TENS = { twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };
const SCALES = { hundred: 100, thousand: 1e3, million: 1e6, billion: 1e9, trillion: 1e12 };

/** "two hundred and five plus six" -> "205 plus 6" */
export function wordsToNumbers(text) {
  const tokens = text.split(/(\s+|-)/).filter((t) => t !== '');
  const out = [];
  let total = 0;
  let current = 0;
  let inNumber = false;
  let lastWord = '';
  let gap = [];
  const flush = () => {
    if (inNumber) out.push(String(total + current));
    out.push(...gap);
    total = 0; current = 0; inNumber = false; gap = [];
  };
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    const w = tok.toLowerCase();
    if (/^\s+$/.test(tok)) { (inNumber ? gap : out).push(tok); continue; }
    // "twenty-one" joins; "five - three" is subtraction.
    if (tok === '-') {
      const next = tokens[i + 1]?.toLowerCase();
      if (inNumber && gap.length === 0 && lastWord in TENS && next in ONES && ONES[next] < 10) { gap.push(tok); continue; }
      flush(); out.push(tok); continue;
    }
    if (w in ONES || w in TENS) {
      current += ONES[w] ?? TENS[w]; inNumber = true; gap = []; lastWord = w; continue;
    }
    if (w in SCALES && inNumber) {
      if (w === 'hundred') current *= 100;
      else { total += current * SCALES[w]; current = 0; }
      gap = []; lastWord = w; continue;
    }
    if (w === 'and' && inNumber) { gap.push(tok); continue; }
    flush();
    out.push(tok);
  }
  flush();
  return out.join('');
}

const LEADING = /^(?:(?:hey|hi|ok|okay|so|um+|noodle|please|pls|can you|could you|would you|quickly|now)[\s,]+)*(?:what(?:'s| is|s)?|whats|calculate|calc|compute|evaluate|eval|solve(?: for x)?|work out|figure out|how much is|how much|tell me|find|simplify|the answer to)?\s*(?:the\s+)?/i;

/** Rewrites natural-language math ("15% of 80", "5 squared") into an expression. */
export function toExpression(raw) {
  let s = ` ${String(raw).toLowerCase().trim()} `;
  s = s.replace(/[×✕✖]/g, '*').replace(/[÷]/g, '/').replace(/[−–—]/g, '-').replace(/\*\*/g, '^');
  s = wordsToNumbers(s);
  s = s.trim().replace(LEADING, '');
  s = s.replace(/[?.]+$/, '').replace(/!{2,}$/, '').replace(/\s*(?:=\s*\??|equals?\s*\??|is equal to\s*\??)$/, '').trim();
  s = s.replace(/(\d),(?=\d{3}(?!\d))/g, '$1');
  const rules = [
    [/(-?[\d.]+)\s*(?:%|percent)\s+of\s+/g, '($1/100)*'],
    [/^(?:add|sum of|the sum of)\s+(\S+)\s+(?:and|to|with|plus)\s+(\S+)$/, '$1+$2'],
    [/^subtract\s+(\S+)\s+from\s+(\S+)$/, '$2-$1'],
    [/^(?:multiply|product of|the product of)\s+(\S+)\s+(?:by|and|with|times)\s+(\S+)$/, '$1*$2'],
    [/^divide\s+(\S+)\s+(?:by|into)\s+(\S+)$/, '$1/$2'],
    [/(\d+)(?:st|nd|rd|th)?\s+power\b/g, '$1'],
    [/\bsquare root of\s+/g, 'sqrt '],
    [/\bcube root of\s+/g, 'cbrt '],
    [/\b(?:the )?(?:absolute value|abs) of\s+/g, 'abs '],
    [/\b(?:the )?(?:natural log|ln) of\s+/g, 'ln '],
    [/\blog(?:arithm)? of\s+/g, 'log '],
    [/\b(sin|cos|tan|sine|cosine|tangent) of\s+/g, '$1 '],
    [/\bsine\b/g, 'sin'], [/\bcosine\b/g, 'cos'], [/\btangent\b/g, 'tan'],
    [/\bsquared\b/g, '^2'], [/\bcubed\b/g, '^3'],
    [/\b(?:to the power of|raised to the power of|raised to|to the)\b/g, '^'],
    [/\bfactorial(?: of)?\b/g, '!'],
    [/\b(?:equals?|is equal to)\b/g, '='],
    [/\bplus\b/g, '+'],
    [/\bminus\b/g, '-'],
    [/\b(?:times|multiplied by)\b/g, '*'],
    [/\b(?:divided by|divide by|over)\b/g, '/'],
    [/\b(?:mod|modulo|modulus)\b/g, '%'],
    [/\b(?:degrees?|deg)\b/g, '°'],
    [/\bpi\b/g, 'π'],
  ];
  for (const [re, rep] of rules) s = s.replace(re, rep);
  // "5x5" and "5 x 5" mean multiply unless this is an equation in x.
  if (!s.includes('=')) s = s.replace(/([\d)])\s*x\s*(?=[\d(.])/g, '$1*');
  return s.replace(/\s+/g, ' ').trim();
}

function tokenize(src) {
  const tokens = [];
  const re = /\s*(?:(\d+\.?\d*(?:e[+-]?\d+)?|\.\d+(?:e[+-]?\d+)?)|([a-zπ][a-z0-9]*)|([-+*/^%()!,=°]))/gy;
  let m;
  let pos = 0;
  while (pos < src.length) {
    re.lastIndex = pos;
    m = re.exec(src);
    if (!m) {
      if (/^\s*$/.test(src.slice(pos))) break;
      throw new MathError(`I don't understand "${src.slice(pos).trim().slice(0, 12)}"`);
    }
    pos = re.lastIndex;
    if (m[1] !== undefined) tokens.push({ t: 'num', v: parseFloat(m[1]) });
    else if (m[2] !== undefined) tokens.push({ t: 'id', v: m[2] });
    else tokens.push({ t: 'op', v: m[3] });
    if (tokens.length > 300) throw new MathError('That expression is too long for my noodle.');
  }
  return tokens;
}

/** Parses tokens into a small AST: numbers, variables, unary/binary ops, calls. */
function parse(tokens) {
  let i = 0;
  let depth = 0;
  const peek = () => tokens[i];
  const isOp = (v) => peek()?.t === 'op' && peek().v === v;
  const expect = (v) => {
    if (!isOp(v)) throw new MathError(v === ')' ? 'Looks like a bracket is missing.' : `Expected "${v}".`);
    i++;
  };
  const guard = () => { if (++depth > 60) throw new MathError('Too many nested brackets!'); };

  function expression() {
    let node = term();
    while (isOp('+') || isOp('-')) {
      const op = tokens[i++].v;
      node = { k: 'bin', op, a: node, b: term() };
    }
    return node;
  }
  function startsFactor() {
    const tok = peek();
    return tok && (tok.t === 'num' || tok.t === 'id' || (tok.t === 'op' && tok.v === '('));
  }
  function term() {
    let node = unary();
    for (;;) {
      if (isOp('*') || isOp('/')) {
        const op = tokens[i++].v;
        node = { k: 'bin', op, a: node, b: unary() };
      } else if (isOp('%') && tokens[i + 1] && (tokens[i + 1].t === 'num' || tokens[i + 1].t === 'id' || tokens[i + 1].v === '(')) {
        i++;
        node = { k: 'bin', op: 'mod', a: node, b: unary() };
      } else if (startsFactor()) {
        node = { k: 'bin', op: '*', a: node, b: power() }; // implicit: 2π, 3(4+1)
      } else break;
    }
    return node;
  }
  function unary() {
    if (isOp('-')) { i++; guard(); const n = { k: 'neg', a: unary() }; depth--; return n; }
    if (isOp('+')) { i++; return unary(); }
    return power();
  }
  function power() {
    const base = postfix();
    if (isOp('^')) { i++; guard(); const n = { k: 'bin', op: '^', a: base, b: unary() }; depth--; return n; }
    return base;
  }
  function postfix() {
    let node = primary();
    for (;;) {
      if (isOp('!')) { i++; node = { k: 'fact', a: node }; }
      else if (isOp('°')) { i++; node = { k: 'bin', op: '*', a: node, b: { k: 'num', v: Math.PI / 180 } }; }
      else if (isOp('%') && !(tokens[i + 1] && (tokens[i + 1].t === 'num' || tokens[i + 1].t === 'id' || tokens[i + 1].v === '('))) {
        i++; node = { k: 'bin', op: '/', a: node, b: { k: 'num', v: 100 } };
      } else break;
    }
    return node;
  }
  function primary() {
    const tok = peek();
    if (!tok) throw new MathError('The expression ends too early.');
    if (tok.t === 'num') { i++; return { k: 'num', v: tok.v }; }
    if (tok.t === 'op' && tok.v === '(') {
      i++; guard();
      const node = expression();
      expect(')');
      depth--;
      return node;
    }
    if (tok.t === 'id') {
      i++;
      const name = tok.v;
      if (name in FUNCS) {
        guard();
        let args;
        if (isOp('(')) {
          i++;
          args = [expression()];
          while (isOp(',')) { i++; args.push(expression()); }
          expect(')');
        } else {
          args = [power()]; // "sqrt 16", "sin 30°"
        }
        depth--;
        return { k: 'call', name, args };
      }
      if (name in CONSTS) return { k: 'num', v: CONSTS[name], name };
      if (name === 'x') return { k: 'var' };
      throw new MathError(`I don't know what "${name}" means in maths.`);
    }
    throw new MathError(`Unexpected "${tok.v}".`);
  }

  const tree = expression();
  if (i < tokens.length) throw new MathError(`Unexpected "${tokens[i].v}".`);
  return tree;
}

function factorial(n) {
  if (!Number.isInteger(n) || n < 0) throw new MathError('Factorials only work on whole numbers from 0 up.');
  if (n > 170) return Infinity;
  let r = 1;
  for (let k = 2; k <= n; k++) r *= k;
  return r;
}

function run(node, x) {
  switch (node.k) {
    case 'num': return node.v;
    case 'var':
      if (x === undefined) throw new MathError('There\'s an "x" in there. Give me an equation like "2x + 3 = 7" to solve.');
      return x;
    case 'neg': return -run(node.a, x);
    case 'fact': return factorial(run(node.a, x));
    case 'call': {
      const args = node.args.map((a) => run(a, x));
      if (node.name === 'sqrt' && args[0] < 0) throw new MathError('The square root of a negative number is imaginary. My noodle only does real numbers.');
      if ((node.name === 'log' || node.name === 'ln' || node.name === 'log2' || node.name === 'log10' || node.name === 'lg') && args[0] <= 0) {
        throw new MathError('Logarithms only work on positive numbers.');
      }
      return FUNCS[node.name](...args);
    }
    case 'bin': {
      const a = run(node.a, x);
      const b = run(node.b, x);
      switch (node.op) {
        case '+': return a + b;
        case '-': return a - b;
        case '*': return a * b;
        case '/': return a / b;
        case 'mod': return b === 0 ? NaN : ((a % b) + b) % b;
        case '^': return a ** b;
        default: throw new MathError('Unknown operator.');
      }
    }
    default: throw new MathError('Unknown expression.');
  }
}

const hasTrig = (node) => node && (
  (node.k === 'call' && TRIG.has(node.name)) || [node.a, node.b, ...(node.args ?? [])].some(hasTrig));
const hasVar = (node) => node && (node.k === 'var' || [node.a, node.b, ...(node.args ?? [])].some(hasVar));

const snap = (v) => (Math.abs(v) < 1e-12 ? 0 : Number(v.toPrecision(12)));

/** Evaluates an expression string. Throws MathError with a friendly message. */
export function evaluate(expr) {
  const tree = parse(tokenize(expr));
  const value = run(tree);
  return hasTrig(tree) ? snap(value) : value;
}

/** Solves "lhs = rhs" in x when it is linear or quadratic. */
export function solve(equation) {
  const sides = equation.split('=');
  if (sides.length !== 2 || !sides[0].trim() || !sides[1].trim()) throw new MathError('An equation needs exactly one "=" sign.');
  const lhs = parse(tokenize(sides[0]));
  const rhs = parse(tokenize(sides[1]));
  if (!hasVar(lhs) && !hasVar(rhs)) {
    const ok = Math.abs(run(lhs) - run(rhs)) < 1e-9;
    return { kind: 'check', ok };
  }
  const f = (x) => run(lhs, x) - run(rhs, x);
  const f0 = f(0), f1 = f(1), f2 = f(2), f3 = f(3), fm1 = f(-1);
  // Fit a quadratic through three points, then verify it on two more.
  const a = (f2 - 2 * f1 + f0) / 2;
  const b = f1 - f0 - a;
  const c = f0;
  const fits = (x, fx) => Math.abs(a * x * x + b * x + c - fx) < 1e-7 * Math.max(1, Math.abs(fx));
  if (![f0, f1, f2, f3, fm1].every(Number.isFinite) || !fits(3, f3) || !fits(-1, fm1)) {
    throw new MathError('That equation is beyond my noodle. I can solve linear and quadratic ones in x.');
  }
  if (Math.abs(a) < 1e-12) {
    if (Math.abs(b) < 1e-12) return { kind: Math.abs(c) < 1e-12 ? 'always' : 'never' };
    return { kind: 'roots', roots: [snap(-c / b)] };
  }
  const disc = b * b - 4 * a * c;
  if (disc < -1e-12) return { kind: 'complex' };
  if (Math.abs(disc) < 1e-12) return { kind: 'roots', roots: [snap(-b / (2 * a))] };
  const r = Math.sqrt(disc);
  return { kind: 'roots', roots: [snap((-b - r) / (2 * a)), snap((-b + r) / (2 * a))].sort((p, q) => p - q) };
}

const MATH_CHARS = /^[\d\s.+\-*/^%()!,=°πa-z]+$/;
const MATH_WORDS = /^(?:sqrt|cbrt|abs|round|floor|ceil|sin|cos|tan|asin|acos|atan|sinh|cosh|tanh|exp|log|lg|ln|log2|log10|min|max|sign|pi|e|tau|phi|x)$/;

/**
 * Returns a calculator result if the message is maths, otherwise null.
 * `{ expr, value }` for arithmetic, `{ expr, solution }` for equations,
 * `{ expr, error }` when it is clearly maths but can't be computed.
 */
export function tryMath(raw) {
  if (!raw || raw.length > 400) return null;
  const expr = toExpression(raw);
  if (!expr || !MATH_CHARS.test(expr)) return null;
  const idents = expr.replace(/\d*\.?\d+e[+-]?\d+/g, '0').match(/[a-z]+\d*/g) ?? [];
  if (!idents.every((w) => MATH_WORDS.test(w))) return null;
  const hasNumber = /\d|π|\b(?:pi|e|tau|phi)\b/.test(expr);
  const hasOperator = /[+\-*/^%!=°]|\b(?:sqrt|cbrt|abs|round|floor|ceil|sin|cos|tan|asin|acos|atan|sinh|cosh|tanh|exp|log|lg|ln|log2|log10|min|max|sign)\b/.test(expr.replace(/^-/, ''));
  if (!hasNumber || !hasOperator) return null;
  // A full date like 25/12/2026 or a phone number is not maths.
  if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(expr) || /^\d{3,}-\d{3,}(?:-\d+)?$/.test(expr)) return null;
  try {
    if (expr.includes('=')) return { expr, solution: solve(expr) };
    return { expr, value: evaluate(expr) };
  } catch (err) {
    if (err instanceof MathError) return { expr, error: err.message };
    throw err;
  }
}

export function describeMath(result) {
  const pretty = result.expr.replace(/\*/g, ' × ').replace(/\//g, ' ÷ ').replace(/\s+/g, ' ')
    .replace(/\( /g, '(').replace(/ \)/g, ')').replace(/\s*\^\s*/g, '^').replace(/\s+°/g, '°');
  if (result.error) return `🧮 Hmm: ${result.error}`;
  if (result.solution) {
    const s = result.solution;
    if (s.kind === 'check') return s.ok ? `✅ True! \`${pretty}\` checks out.` : `❌ Nope, \`${pretty}\` isn't true.`;
    if (s.kind === 'always') return `♾️ Every value of x works: \`${pretty}\` is always true.`;
    if (s.kind === 'never') return `🚫 No value of x makes \`${pretty}\` true.`;
    if (s.kind === 'complex') return `🌀 \`${pretty}\` has no real solutions (only complex ones).`;
    const roots = s.roots.map(formatNumber);
    return roots.length === 1 ? `🧮 \`${pretty}\` → **x = ${roots[0]}**` : `🧮 \`${pretty}\` → **x = ${roots[0]}** or **x = ${roots[1]}**`;
  }
  const v = result.value;
  if (Number.isNaN(v)) {
    return /\/\s*0(?![\d.])|÷ 0(?![\d.])/.test(pretty) || /%\s*0(?![\d.])/.test(result.expr)
      ? '🕳️ Dividing by zero? That\'s how black holes are made. The answer is undefined.'
      : '🤔 That works out to "not a number". Maths got confused.';
  }
  if (!Number.isFinite(v)) {
    return /\/\s*0(?![\d.])/.test(result.expr)
      ? '🕳️ Dividing by zero? That\'s how black holes are made. Mathematicians call it undefined.'
      : `🚀 \`${pretty}\` is so big it's basically **${v > 0 ? '' : '-'}infinity** to me.`;
  }
  let extra = '';
  const compact = result.expr.replace(/\s/g, '');
  if (v === 42) extra = ' (the answer to life, the universe and everything)';
  else if (compact === '2+2') extra = ' (not 5, whatever anyone tells you)';
  else if (compact === '0.1+0.2') extra = ' (and not 0.30000000000000004, unlike some computers I know)';
  else if (v === 69 || v === 420) extra = ' (nice)';
  else if (v === 1337) extra = ' (l33t)';
  return `🧮 ${pretty} = **${formatNumber(v)}**${extra}`;
}

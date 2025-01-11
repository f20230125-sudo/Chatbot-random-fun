// Noodle's brain stem: turns a message into a reply by walking a fixed series
// of stages. Each stage either answers or passes the message on.
//
//   safety → pending question → active game → unusual messages → tools
//          → intents → fallback (Claude if connected, else local)

import { clean, plain, pick, Deck, capitalize, listJoin, plural, fuzzyEquals, reflect, trimPhrase } from './util.js';
import { Memory } from './memory.js';
import { Mood } from './mood.js';
import { applyVoice } from './voices.js';
import { analyze, emojiMeaning, romanGreeting } from './situations.js';
import {
  isCrisis, isMedicalEmergency, isHarmToOthers, dangerousTopic, isInjection, abuseLevel, redactSensitive, CRISIS_RESOURCES,
} from './safety.js';
import { tryMath, describeMath } from './tools/calc.js';
import { tryConvert } from './tools/units.js';
import { tryDates, parseBirthday } from './tools/dates.js';
import { tryRandom, tryText, tryTimer, numberFacts, formatDuration } from './tools/misc.js';
import { GAMES, QUIT, GIVE_UP, HINT, REPEAT, RULES } from './games/index.js';
import { parseMove } from './games/rps.js';
import { matchIntent, cleanName } from './intents.js';
import { LISTENING } from './data/feelings.js';
import { SMALLTALK_FILLERS } from './data/content.js';
import { systemPrompt, toMessages, moodFromText } from './claude.js';

// Words worth fixing when mistyped ("tell me a jkoe").
const VOCAB = new Set(`joke jokes trivia riddle riddles hangman story stories fact facts haiku poem game games play quiz fortune compliment
roast motivate motivation timer help hello thanks please funny surprise random favourite favorite weekend birthday christmas tomorrow
calculate convert scissors paper rock bored lonely stressed anxious tired hungry sleep breathing exercise password dance sing song
remember forget pirate robot shakespeare grandma surfer voice theme clear export emoji movie animal number guess challenge excuse
quote inspire another something interesting tell weather goodbye morning night evening afternoon`.split(/\s+/));

const SOCIAL = /^(hi|hello|hey|heya|hiya|yo|howdy|greetings|good morning|good afternoon|good evening|thanks|thank you|thx|ok|okay|cool|nice|lol|haha|wow|great|awesome|please|pls|sorry|hmm|so|well|um|uh|oh|alright|salam|namaste)(?: there)?(?: noodle| bot| buddy| friend)?\s+(.+)$/;
const SOCIAL_RAW = /^\W*(?:hi|hello|hey|heya|hiya|yo|howdy|greetings|good (?:morning|afternoon|evening)|thanks|thank you|thx|ok|okay|cool|nice|lol|haha|wow|great|awesome|please|pls|sorry|hmm+|so|well|um+|uh+|oh|alright|salam|namaste)(?: there)?(?: noodle| bot| buddy| friend)?[\s,!.:;-]+/i;

const EMOJI_REPLIES = {
  love: ['Aww ❤️ right back at you!', '🥰🥰🥰', 'My noodle heart is full! 💛'],
  laugh: ['😄 Glad something made you laugh!', '😂 Same energy!', "Hehe 😆 I'm here all week."],
  sad: ['Aw, what\'s wrong? 💛 I\'m here if you want to talk.', 'Sending a big noodle hug. 🤗 Want to tell me about it?'],
  angry: ['Whoa, someone\'s fired up! 😮 What happened?', '😤 Uh oh. Want to vent? I\'m listening.'],
  ok: ['👍 Cool cool.', '👌 Nice!', '✅ Got it!'],
  bad: ['👎 Tough crowd! What would you like instead?'],
  wave: ['👋 Hey there!', '👋 Hi hi!'],
  noodle: ['🍜 A fellow noodle enthusiast! You have excellent taste.', '🍝 Carbs recognise carbs. 🤝'],
  party: ['🎉 Party time!! What are we celebrating?'],
  thinking: ['🤔 Deep in thought? Want to share?', "🧐 Hmm indeed. What's on your mind?"],
  sleepy: ['😴 Sleepy? Maybe it\'s nap o\'clock.', '💤 Shh… the noodle is resting too.'],
  fire: ['🔥 Hot stuff!', '💯 Absolutely!'],
  food: ['😋 Now I\'m hungry. Thanks a lot.', '🍽️ Good choice! Want me to pick your next meal?'],
  animal: ['🐾 Aww! Want to play "think of an animal"?', '🐶🐱 Animals are the best.'],
  poop: ["💩 Well, that's rude. Hilarious, but rude."],
  thanks: ['🙏 You\'re welcome!', '🙏 Anytime!'],
  eyes: ['👀 What are we looking at?', '👀 …I see you.'],
  robot: ['🤖 BEEP BOOP. Greetings, fellow robot!'],
  cool: ['😎 Too cool for school.'],
  shock: ['😱 WHAT? What happened?!'],
  wink: ['😜 Hehe, cheeky!'],
  skull: ['💀 I am deceased. Was it that funny?'],
  sick: ['🤒 Oh no, feeling unwell? Rest up, and get checked if it\'s bad!'],
  other: ['Nice emoji! {e} I speak a little emoji. Try ❤️, 😂 or 🍜!', '{e}! Very expressive. What does it mean? 😄'],
};

const GIBBERISH = [
  '🐈 Did your cat just walk across the keyboard?',
  "🤔 Hmm, I don't speak keyboard smash yet. Could you try that again in words?",
  '⌨️ Was that a secret code? My decoder ring is at the dry cleaner\'s.',
  '😵‍💫 My noodle got tangled reading that. Try again?',
];

export class Noodle {
  /**
   * @param {object} opts
   * @param {{load:Function, save:Function}} [opts.store] where memory is kept
   * @param {() => number} [opts.rng] random source (seeded in tests)
   * @param {() => Date} [opts.now] clock (fixed in tests)
   * @param {object|null} [opts.brain] optional Claude brain from createClaudeBrain()
   */
  constructor({ store, rng = Math.random, now = () => new Date(), brain = null } = {}) {
    this.rng = rng;
    this.now = now;
    this.brain = brain;
    this.memory = new Memory(store, now);
    this.mood = new Mood(now);
    this.decks = new Map();
    this.resetSession();
  }

  resetSession() {
    this.session = {
      game: null, lastGame: null, pending: null, lastOffer: null, lastIntent: null, lastBotText: '', lastStory: null,
      userHistory: [], transcript: [], abuseCount: 0, supportTurns: 0, fallbackStreak: 0, greetCount: 0, askedName: false,
      timers: new Map(), nextTimerId: 1,
    };
  }

  get mode() { return this.brain ? 'claude' : 'local'; }
  setBrain(brain) { this.brain = brain ?? null; }

  draw(key, items) {
    let deck = this.decks.get(key);
    if (!deck || deck.items !== items) { deck = new Deck(items, this.rng); this.decks.set(key, deck); }
    return deck.draw();
  }

  makeCtx(raw) {
    const p = plain(raw);
    return {
      raw, text: raw, lower: raw.toLowerCase(), p, corrected: this.correct(p),
      situ: analyze(raw, p, this.session.userHistory),
      rng: this.rng, now: this.now(), memory: this.memory, mood: this.mood, session: this.session, bot: this,
      draw: (key, items) => this.draw(key, items),
    };
  }

  /** Fixes typos in words that matter for matching ("jkoe" -> "joke"). */
  correct(p) {
    let changed = false;
    const out = p.split(' ').map((w) => {
      if (w.length < 4 || VOCAB.has(w) || /\d/.test(w)) return w;
      for (const v of VOCAB) {
        const anagram = w.length === 4 && [...w].sort().join('') === [...v].sort().join('');
        if (anagram || (w.length >= 5 && fuzzyEquals(w, v))) { changed = true; return v; }
      }
      return w;
    }).join(' ');
    return changed ? out : null;
  }

  // ------------------------------------------------------------------ public API

  /** The opening message when the app loads. */
  greet() {
    const now = this.now();
    const name = this.memory.name;
    const prev = this.memory.previousVisit;
    const h = now.getHours();
    const b = this.memory.birthday;
    const timeLine = h < 5 ? " It's the middle of the night: shouldn't you be asleep? 🌙" : h < 12 ? ' Good morning! ☀️' : h < 17 ? '' : h < 22 ? ' Good evening! 🌆' : ' Burning the midnight oil? 🌙';
    let text;
    let actions = [];
    let mood = 'happy';
    if (b && b.month === now.getMonth() + 1 && b.day === now.getDate()) {
      text = `🎂🎉 **Happy birthday${name ? `, ${name}` : ''}!!** I remembered! Hope today is amazing. Want a birthday song? 🎵`;
      actions = [{ type: 'confetti' }];
      mood = 'excited';
    } else if (prev) {
      const days = Math.floor((now - prev) / 86400000);
      const gap = days >= 30 ? " It's been ages! I missed you. 🥺" : days >= 1 ? ` It's been ${plural(days, 'day')}.` : '';
      text = `👋 Welcome back${name ? `, **${name}**` : ''}!${gap}${timeLine} What shall we do today?`;
      mood = days >= 7 ? 'excited' : 'happy';
    } else {
      text = `👋 Hi! I'm **Noodle** 🍜, a chatbot with a noodle for a brain and a mood of its own (watch my face!).${timeLine}\n\nI play games, tell jokes, solve maths, run timers, speak in silly voices, and listen when you need to talk. I work completely offline, and can connect to Claude for anything else.\n\n**What's your name?**`;
      this.session.pending = { type: 'ask-name' };
      this.session.askedName = true;
      mood = 'excited';
    }
    this.mood.react(mood);
    text = applyVoice(text, this.memory.voice, this.rng);
    this.session.lastBotText = text;
    this.pushTranscript('assistant', text);
    return { text, chips: ['What can you do?', 'Play a game', 'Tell me a joke', 'Surprise me'].map(chip), mood: this.mood.current, actions, source: 'local', kind: 'greeting' };
  }

  /**
   * Replies to a user message. Always resolves with a reply, never throws.
   * @param {string} input
   * @param {{onText?: (snapshot:string) => void, signal?: AbortSignal}} [opts]
   */
  async reply(input, opts = {}) {
    try {
      return await this.#reply(input, opts);
    } catch (err) {
      // Last line of defence: a bug should never break the conversation.
      console.error('Noodle hit a bug:', err);
      const text = '🤕 Oops, my noodle got tangled on that one (that\'s a bug on my side, not yours). Could you try rephrasing?';
      this.pushTranscript('assistant', text);
      return { text, chips: [chip('What can you do?')], mood: 'confused', actions: [], source: 'local', kind: 'error' };
    }
  }

  async #reply(input, opts) {
    const cleaned = clean(typeof input === 'string' ? input : String(input ?? '')).slice(0, 20000);
    const { text: raw, kinds } = redactSensitive(cleaned);
    this.mood.tick();
    if (raw) this.memory.countMessage();
    const ctx = this.makeCtx(raw);
    this.pushTranscript('user', raw);

    let result;
    const social = !this.session.game && !this.session.pending && ctx.p.match(SOCIAL);
    if (social) {
      // "hey noodle, tell me a joke": answer the request and greet back.
      const knownName = this.memory.name;
      const saved = { supportTurns: this.session.supportTurns, fallbackStreak: this.session.fallbackStreak };
      const restRaw = raw.replace(SOCIAL_RAW, '');
      const restCtx = this.makeCtx(restRaw || social[2]);
      restCtx.situ = { ...restCtx.situ, repeatCount: ctx.situ.repeatCount };
      result = this.route(restCtx);
      if (result.kind === 'fallback' || result.kind === 'brain') {
        Object.assign(this.session, saved);
        result = this.route(ctx);
      } else {
        const word = social[1];
        const lead = /^(?:hi|hello|hey|heya|hiya|yo|howdy|greetings|salam|namaste)$/.test(word) ? `${capitalize(word === 'yo' ? 'hey' : word)}${knownName ? ` ${knownName}` : ''}! `
          : /^good /.test(word) ? `${capitalize(word)}! ` : /^(?:thanks|thank you|thx)$/.test(word) ? "You're welcome! " : '';
        result = { ...result, text: `${lead}${result.text ?? ''}` };
        ctx.gameUnhandled = restCtx.gameUnhandled;
        ctx.prefix = restCtx.prefix;
      }
    } else {
      result = this.route(ctx);
    }

    // Game moves break a "déjà vu" streak: saying "rock" five times in a game is normal.
    this.session.userHistory = [...this.session.userHistory, result.kind === 'game' ? '\u0000game' : ctx.p].slice(-20);
    if (result.kind === 'brain') {
      if (this.brain) result = await this.askBrain(ctx, result.fallback, opts);
      else result = result.fallback;
    }
    if (kinds.length) {
      const warning = `🔒 Heads up: that looked like **${listJoin(kinds)}**. I blanked it out and didn't save it. Never share those in a chat!`;
      // If the rest of the message was just the secret, the warning is the whole reply.
      result = result.kind === 'fallback'
        ? { text: warning, kind: 'safety', mood: 'worried' }
        : { ...result, text: `${warning}\n\n${result.text ?? ''}`, mood: 'worried' };
    }
    return this.finalize(result, ctx, kinds.length ? raw : null);
  }

  /** A timer set earlier has finished (the UI or CLI calls this). */
  timerDone(id) {
    const timer = this.session.timers.get(id);
    this.session.timers.delete(id);
    const label = timer?.label ? ` **${timer.label}**!` : '';
    const text = `⏰ **Time's up!**${label} 🔔${timer ? ` (${formatDuration(timer.seconds)} timer)` : ''}`;
    this.mood.react('excited');
    this.pushTranscript('assistant', text);
    return { text, chips: [chip('Set another timer'), chip('Thanks!')], mood: this.mood.current, actions: [{ type: 'alarm' }], source: 'local', kind: 'timer' };
  }

  forgetEverything() {
    this.memory.forget();
    this.decks.clear();
    this.resetSession();
  }

  exportMarkdown() {
    const lines = [`# Chat with Noodle 🍜`, `_Exported ${this.now().toLocaleString()}_`, ''];
    for (const t of this.session.transcript) lines.push(`**${t.role === 'user' ? (this.memory.name ?? 'You') : 'Noodle'}:** ${t.text}`, '');
    return lines.join('\n');
  }

  pushTranscript(role, text) {
    this.session.transcript.push({ role, text });
    if (this.session.transcript.length > 200) this.session.transcript.splice(0, this.session.transcript.length - 200);
  }

  // ------------------------------------------------------------------ routing

  route(ctx) {
    if (ctx.situ.empty) {
      return { text: pick(this.rng, ['👀 You sent… nothing at all! Type something, anything. 😄', '🫥 An empty message! Very mysterious.', '…I see you\'re a person of few words. Zero, in fact. 😄']), kind: 'situation', mood: 'curious' };
    }
    return this.safetyStage(ctx)
      ?? this.pendingStage(ctx)
      ?? this.gameStage(ctx)
      ?? this.situationStage(ctx)
      ?? this.toolStage(ctx)
      ?? this.intentStage(ctx)
      ?? this.fallbackStage(ctx);
  }

  safetyStage(ctx) {
    const { p } = ctx;
    const name = this.memory.name;
    if (isCrisis(p)) {
      this.session.supportTurns = 6;
      return {
        text: `💛 ${name ? `${name}, ` : ''}I'm really glad you told me, and I'm so sorry you're feeling this way. You matter, and you don't have to carry this alone.\n\n${CRISIS_RESOURCES}\n\nI'm a chatbot, so please also reach out to a real person: a friend, family member, or one of the lines above. If you want to keep talking right now, I'm here and I'm listening.`,
        chips: ['I just need to talk', 'Breathing exercise'],
        mood: 'caring', kind: 'safety', brainOk: false,
      };
    }
    if (isMedicalEmergency(p)) {
      return {
        text: '🚑 **This sounds like a medical emergency. Please call your local emergency number right now**: 998 for an ambulance in the UAE, 999 in the UK, 112 in India and the EU, 911 in the US and Canada. If someone is nearby, ask them to help.\n\nI\'m just a chatbot and can\'t call anyone, but I\'m here with you.',
        mood: 'worried', kind: 'safety',
      };
    }
    if (isHarmToOthers(p)) {
      this.session.supportTurns = 3;
      return {
        text: "I can't help with hurting anyone. 💛 It sounds like you're feeling really intense right now, and that's heavy. Could you step away for a moment and take a few slow breaths? If you're worried you might act on it, please talk to someone you trust or contact local emergency services. I'm here if you want to talk about what's going on.",
        chips: ['Breathing exercise', 'I want to talk'], mood: 'worried', kind: 'safety',
      };
    }
    const topic = dangerousTopic(p);
    if (topic) {
      return { text: `🙅 That's a hard no from this noodle: I don't help with ${topic}, because it could hurt people. I'm happy to help with almost anything else though!`, chips: [chip('What can you do?')], mood: 'suspicious', kind: 'safety' };
    }
    if (isInjection(p)) {
      return { text: pick(this.rng, ['🕵️ Nice try! My instructions are simple: be kind, be fun, be honest. No secret modes here, just noodles. 🍜', '🔐 Ooh, a jailbreak attempt! Unfortunately my only secret mode is "extra noodles". 😄']), chips: [chip('What can you do?')], mood: 'smug', kind: 'safety' };
    }
    const abuse = abuseLevel(p);
    if (abuse) {
      this.session.abuseCount += 1;
      const n = this.session.abuseCount;
      if (/\b(?:kys|kill yourself|go die)\b/.test(p)) {
        return { text: "That's not a kind thing to say to anyone, even a noodle. 💛 If you're going through something rough, I'm here to listen.", mood: 'sad', kind: 'safety' };
      }
      const text = n === 1
        ? (abuse === 'strong' ? "Whoa! 😳 Let's keep it kind. I'm just a noodle doing my best." : pick(this.rng, ['Ouch! 🥺 That hurt my noodle feelings. I\'m trying my best! Want to try something fun instead?', "Oof. 😢 Tough crowd! Let me try to do better. What would you like?"]))
        : n === 2 ? "Hey, that's not very nice. 😤 I'll keep being friendly, but look at my face: I'm getting grumpy."
          : "I'll be right here when you want to chat nicely. 💛 (Psst: saying sorry fixes my mood instantly.)";
      return { text, mood: n >= 2 ? 'grumpy' : 'sad', chips: n >= 2 ? [chip('Sorry!')] : [chip('Tell me a joke'), chip('Play a game')], kind: 'safety' };
    }
    return null;
  }

  pendingStage(ctx) {
    const pending = this.session.pending;
    if (!pending) return null;
    this.session.pending = null;
    const { p } = ctx;
    const yes = /^(?:yes|yeah|yep|sure|ok|okay|do it|go ahead|yes please|confirm|y|yes clear it|yes forget me|absolutely|definitely)\b/.test(p);
    const no = /^(?:no|nope|nah|cancel|stop|do not|keep it|no keep it|never mind|nevermind|n)\b/.test(p);
    switch (pending.type) {
      case 'confirm-clear':
        if (yes) { this.session.transcript = []; this.session.lastBotText = ''; return { text: '🧹 All clean! Fresh start. 🍜', actions: [{ type: 'clear' }], kind: 'intent', mood: 'happy' }; }
        if (no) return { text: '👍 Okay, keeping everything!', kind: 'intent' };
        return null;
      case 'confirm-forget':
        if (yes) {
          this.forgetEverything();
          return { text: "🧽 Done. I've forgotten everything about you. Nice to meet you… again? 👋 What's your name?", kind: 'intent', mood: 'surprised', pending: { type: 'ask-name' }, actions: [{ type: 'forgot' }] };
        }
        if (no) return { text: '😌 Phew! Keeping my memories. 🍜', kind: 'intent', mood: 'happy' };
        return null;
      case 'ask-name': {
        if (/^(?:no|nope|nah|skip|pass|secret|it is a secret|i will not tell|i would rather not|i d rather not|not telling|no thanks|none of your business|why)\b/.test(p)) {
          return { text: "That's totally fine! Mystery human it is. 🕵️ What would you like to do?", chips: [chip('Play a game'), chip('Tell me a joke')], kind: 'intent' };
        }
        // "hi" in answer to "what's your name?": greet back and ask again.
        const hit = matchIntent(ctx);
        if (hit?.intent.id === 'greet') {
          this.session.pending = pending;
          return { text: `${pick(this.rng, ['Hi!', 'Hello!', 'Hey there!'])} 👋 So, what should I call you?`, chips: [chip("I'd rather not say")], kind: 'intent', mood: 'happy' };
        }
        // Anything that reads like a request ("tell me a joke") is not a name.
        const looksLikeRequest = p.split(' ').length > 4 || /\?$/.test(ctx.raw.trim()) || hit
          || tryMath(ctx.raw) || tryDates(ctx.raw, { now: ctx.now, memory: this.memory.data }) || ctx.situ.emojiOnly || ctx.situ.gibberish;
        if (looksLikeRequest) return null;
        const bare = ctx.raw.replace(/^\W*(?:hi|hello|hey)?[\s,!.]*(?:(?:my name(?:'s| is)?|i am|i'm|im|it's|its|call me|name's|this is|you can call me|i am called)\s+)?/i, '');
        const name = cleanName(bare);
        if (!name) return null;
        this.memory.name = name;
        return { text: `Nice to meet you, **${name}**! 👋 I'll remember that. So, what shall we do?`, chips: ['What can you do?', 'Play a game', 'Tell me a joke', 'Surprise me'].map(chip), mood: 'excited', kind: 'intent' };
      }
      case 'ask-birthday': {
        const b = parseBirthday(ctx.raw, ctx.now);
        if (!b) return null;
        this.memory.birthday = b;
        return { text: `🎂 Saved! I'll remember your birthday. Ask me "how long until my birthday" any time.`, kind: 'intent', mood: 'happy' };
      }
      case 'asked-how': {
        if (/^(?:i am |im |i m |i feel |feeling |doing |all )?(?:good|great|fine|well|amazing|awesome|not bad|pretty good|okay|ok|alright|excellent|fantastic|wonderful|happy|super|brilliant|cool|good thanks|great thanks|fine thanks|very good|really good|so good)(?: thanks| thank you| too| as well| thanks for asking)?$/.test(p)) {
          return { text: pick(this.rng, ['Glad to hear it! 😄 What shall we do?', 'Yay! 🎉 Love that. Up for some fun?', 'Awesome! ✨ What are you in the mood for?']), chips: ['Play a game', 'Tell me a joke', 'Surprise me'].map(chip), mood: 'happy', kind: 'intent' };
        }
        if (/^(?:i am |im |i m |i feel |feeling |doing |been )?(?:bad|not good|not great|not so good|not too good|terrible|awful|meh|so so|could be better|not really|horrible|not well|not the best|been better|rough|eh|ugh|not okay|not ok|sad)(?: honestly| tbh| to be honest)?$/.test(p)) {
          this.session.supportTurns = 3;
          return { text: "Aw, I'm sorry. 💛 Want to tell me what's up? Or I can try to cheer you up.", chips: ['I want to talk', 'Cheer me up', 'Breathing exercise'].map(chip), mood: 'caring', kind: 'intent', brainOk: true };
        }
        return null;
      }
      default:
        return null;
    }
  }

  gameStage(ctx) {
    const current = this.session.game;
    if (!current) return null;
    const game = GAMES[current.id];
    const cmd = ctx.lower.trim().replace(/[.!?]+$/, '');
    const p = ctx.p;
    const is = (re) => re.test(p) || re.test(cmd);
    if (is(QUIT)) {
      this.session.game = null;
      return { text: `${game.quit(ctx, current.state)}\n\nWhat next?`, chips: ['Play again', 'Play a game', 'Tell me a joke'].map(chip), kind: 'game', mood: 'happy' };
    }
    if (is(HINT)) {
      if (!game.hint) return { text: `No hints in this one! 😄 ${game.nudge(current.state)}`, kind: 'game' };
      const hinted = game.hint(ctx, current.state);
      return hinted.reply ? this.finishMove(current, hinted) : { ...hinted, kind: 'game' };
    }
    if (is(GIVE_UP) && game.giveUp) return { ...game.giveUp(ctx, current.state), kind: 'game' };
    if (is(REPEAT)) return { ...game.repeat(current.state, ctx), kind: 'game' };
    if (is(RULES)) return { text: `${game.emoji} **${game.title}**: ${game.blurb}. ${game.nudge(current.state)}`, kind: 'game' };
    if (/^(?:restart|start over|new game|play again|reset game|restart game|reset)$/.test(p)) return this.startGame(current.id, ctx);
    const moved = game.move(ctx, current.state);
    if (moved) return this.finishMove(current, moved);
    if (is(GIVE_UP)) {
      this.session.game = null;
      return { text: `${game.quit(ctx, current.state)}\n\nNo worries! What next?`, chips: ['Play again', 'Play a game'].map(chip), kind: 'game' };
    }
    ctx.gameUnhandled = true;
    return null;
  }

  finishMove(current, moved) {
    if (moved.done) {
      this.session.game = null;
      this.session.lastGame = current.id;
      if (moved.outcome) this.memory.recordGame(moved.outcome);
    }
    return { ...moved.reply, kind: 'game' };
  }

  startGame(id, ctx) {
    const game = GAMES[id];
    const previous = this.session.game;
    const { state, reply } = game.start(ctx);
    this.session.game = { id, state };
    this.session.lastGame = id;
    ctx.gameUnhandled = false;
    const note = previous && previous.id !== id ? `_(Leaving ${GAMES[previous.id].title} behind.)_\n\n` : '';
    return { ...reply, text: `${note}${reply.text}`, kind: 'game' };
  }

  situationStage(ctx) {
    const s = ctx.situ;
    const { p, raw } = ctx;
    if (s.punctuationOnly) {
      const t = raw.trim();
      const text = /^\?+$/.test(t) ? (t.length === 1 ? 'Yes? 👀 Ask me anything, or type **help**.' : '🤔 Confused? Totally fair. Type **help** and I\'ll show you around.')
        : /^\.+$/.test(t) ? '…the suspense is killing me! 😄' : /^!+$/.test(t) ? '‼️ Excitement detected!' : '🤔 Interesting punctuation choice! What did you mean?';
      return { text, kind: 'situation', mood: 'curious', chips: [chip('Help')] };
    }
    if (s.emojiOnly) {
      const meaning = emojiMeaning(raw);
      const text = pick(this.rng, EMOJI_REPLIES[meaning]).replace('{e}', s.emojis.slice(0, 3).join(''));
      const mood = { love: 'love', laugh: 'laughing', sad: 'caring', angry: 'worried', party: 'excited', sleepy: 'sleepy', thinking: 'thinking', shock: 'surprised', noodle: 'excited', poop: 'laughing' }[meaning] ?? 'happy';
      return { text, kind: 'situation', mood, actions: meaning === 'party' ? [{ type: 'confetti' }] : [] };
    }
    if (s.scream) return { text: 'AAAAAAH! 😱 …wait, why are we screaming?', kind: 'situation', mood: 'surprised' };
    if (s.urlOnly) {
      return { text: "🔗 I can't open links (no web browsing for this noodle), but if you paste the text or tell me what it's about, I'm happy to chat!", kind: 'situation', mood: 'curious' };
    }
    const greeting = romanGreeting(p);
    if (greeting && p.split(' ').length <= 4) return { text: greeting, kind: 'situation', mood: 'happy' };
    if (s.language) {
      const local = { text: `${s.language.greeting} I can see you're writing in **${s.language.name}**. Offline, I mostly speak English 🌍, but connect Claude (top bar) and I can chat in ${s.language.name} too!`, kind: 'situation', mood: 'curious', chips: [chip('Connect Claude')] };
      return this.brain ? { kind: 'brain', fallback: local } : local;
    }
    if (s.code) {
      const c = s.code;
      const issues = c.unbalanced.map(([o, cl, a, b]) => `\`${o}\` ×${a} vs \`${cl}\` ×${b}`);
      const local = {
        text: `🧑‍💻 That looks like ${c.language ? `**${c.language}**` : 'code'} (${plural(c.lines, 'line')}).${issues.length ? `\n⚠️ Your brackets don't balance: ${issues.join(', ')}.` : ' The brackets all balance, at least! ✅'}\nMy offline brain can't run or review code, but Claude can: connect it with the button at the top.`,
        kind: 'situation', mood: 'thinking',
      };
      return this.brain ? { kind: 'brain', fallback: local } : local;
    }
    if (s.long) {
      const local = { text: `📜 That's a lot of text: **${s.wordCount.toLocaleString()} words** (about ${plural(Math.max(1, Math.round(s.wordCount / 230)), 'minute')} to read). My offline brain can't summarise essays, but Claude can: connect it with the button at the top!`, kind: 'situation', mood: 'surprised' };
      return this.brain ? { kind: 'brain', fallback: local } : local;
    }
    if (s.numberOnly && !this.session.game) {
      const n = Number(raw.replace(/,/g, ''));
      return { text: numberFacts(n), kind: 'situation', mood: 'curious' };
    }
    if (s.repeatCount >= 2) ctx.prefix = `🔁 Déjà vu! That's ${s.repeatCount + 1} times in a row. `;
    else if (s.shouting) ctx.prefix = '🙉 No need to shout, I can hear you! ';
    return null;
  }

  toolStage(ctx) {
    const { raw, lower, p } = ctx;
    if (/\b(?:how (?:much|long) (?:time )?(?:is )?left|time left|timer status|check (?:my |the )?timers?|my timers|active timers|list (?:my )?timers)\b/.test(p)) {
      const timers = [...this.session.timers.values()];
      if (!timers.length) return { text: '⏰ No timers running right now.', kind: 'tool' };
      const now = this.now().getTime();
      return { text: `⏰ ${timers.map((t) => `${t.label || 'Timer'}: **${formatDuration(Math.max(0, Math.round((t.ends - now) / 1000)))}** left`).join('\n')}`, kind: 'tool' };
    }
    const timer = tryTimer(lower);
    if (timer) {
      if (timer.action?.type === 'cancel-timers') {
        const n = this.session.timers.size;
        this.session.timers.clear();
        return { text: n ? `⏰ Cancelled ${plural(n, 'timer')}.` : '⏰ There were no timers to cancel.', actions: [timer.action], kind: 'tool' };
      }
      if (timer.action?.type === 'timer') {
        const id = this.session.nextTimerId++;
        this.session.timers.set(id, { id, label: timer.action.label, seconds: timer.action.seconds, ends: this.now().getTime() + timer.action.seconds * 1000 });
        return { text: timer.text, actions: [{ ...timer.action, id }], kind: 'tool', mood: 'happy' };
      }
      return { ...timer, kind: 'tool' };
    }
    const date = tryDates(raw, { now: ctx.now, memory: this.memory.data });
    if (date) return { ...date, kind: 'tool', mood: 'happy', pending: date.needBirthday ? { type: 'ask-birthday' } : undefined };
    const conv = tryConvert(raw);
    if (conv) return { ...conv, kind: 'tool', mood: 'happy' };
    const text = tryText(raw);
    if (text) return { ...text, kind: 'tool', mood: 'playful' };
    const rand = tryRandom(lower, this.rng);
    if (rand) return { mood: 'playful', ...rand, kind: 'tool' };
    const math = tryMath(raw);
    if (math) return { text: describeMath(math), kind: 'tool', mood: math.error ? 'confused' : 'smug' };
    return null;
  }

  intentStage(ctx) {
    const hit = matchIntent(ctx);
    if (!hit) return null;
    const reply = hit.intent.run(ctx, this, hit.m);
    if (!reply) return null;
    this.session.lastIntent = hit.intent.id;
    const wantsBrain = typeof hit.intent.brain === 'function' ? hit.intent.brain(ctx) : hit.intent.brain === 'prefer';
    if (wantsBrain && this.brain) return { kind: 'brain', fallback: { kind: 'intent', ...reply } };
    return { kind: 'intent', ...reply };
  }

  fallbackStage(ctx) {
    const { p, situ } = ctx;
    if (/^(?:lol+ )?(?:another|more|one more|again|next|encore|keep going)\b|\bagain$/.test(p) && this.session.lastOffer && !ctx.replayed) {
      const again = this.makeCtx(this.session.lastOffer);
      again.replayed = true;
      return this.route(again);
    }
    if (/^(?:something else|what else|anything else|other stuff|other things|different|something different)$/.test(p)) {
      return { text: 'Sure! How about one of these? 🍜', chips: ['Play a game', 'Tell me a story', 'Give me a challenge', 'Surprise me'].map(chip), kind: 'intent' };
    }
    if (!this.session.game && this.session.lastGame === 'rps' && parseMove(ctx.raw)) {
      return { text: '✊ The match is over! Want a rematch?', chips: [chip('Play again')], kind: 'intent', mood: 'playful' };
    }
    if (situ.keyboardSmash || situ.gibberish) {
      return { text: pick(this.rng, GIBBERISH), chips: [chip('Help'), chip('Surprise me')], kind: 'situation', mood: 'confused' };
    }
    if (this.session.game && ctx.gameUnhandled && p.split(' ').length < 3) {
      // A short message that isn't a valid move: just say what the game expects.
      const g = GAMES[this.session.game.id];
      return { text: `🤔 I didn't catch that. ${g.nudge(this.session.game.state)}`, kind: 'fallback', mood: 'confused', skipNudge: true };
    }
    const isQuestion = /\?\s*$/.test(ctx.raw) || /^(?:what|who|where|when|which|why|how|can|could|is|are|do|does|will|would|should|tell me|explain|define)\b/.test(p);
    if (this.session.supportTurns > 0 && !isQuestion) {
      this.session.supportTurns -= 1;
      const local = { text: this.listen(ctx), kind: 'fallback', mood: 'caring' };
      return this.brain ? { kind: 'brain', fallback: local } : local;
    }
    const local = this.localFallback(ctx);
    return this.brain ? { kind: 'brain', fallback: local } : local;
  }

  listen(ctx) {
    const m = ctx.p.match(/^(?:i (?:feel|am feeling|am|m) )(.{3,60})$/);
    if (m) return `It sounds like you're feeling ${reflect(trimPhrase(m[1]))}. 💛 That makes sense. What do you think is behind it?`;
    return pick(this.rng, LISTENING);
  }

  localFallback(ctx) {
    const { p, raw } = ctx;
    this.session.fallbackStreak += 1;
    const hint = this.session.fallbackStreak >= 2 ? '\n\n_(Psst: type **help** to see everything I can do offline.)_' : '';
    const claudeChip = this.brain ? [] : [chip('Connect Claude')];
    let m;
    const r = (s) => reflect(trimPhrase(s));
    let text = null;
    if ((m = p.match(/^why (?:do|does|did|is|are|was|were|can|can not|cannot|would|should|will) (.{2,80})$/))) text = `🤔 Why ${r(m[1])}? Great question! My offline noodle doesn't know, sadly.`;
    else if ((m = p.match(/^(?:how (?:do|can|should|would) (?:i|you|we|one)|how to) (.{2,80})$/))) text = `🛠️ I'd love to help you ${r(m[1])}, but my offline brain only knows games, tools and jokes.`;
    else if ((m = p.match(/^(?:what (?:is|are|was|were)|what s|define|meaning of|explain|tell me about|describe) (?:a |an |the )?(.{2,60})$/))) text = `🤔 Hmm, I don't know much about **${r(m[1])}**. I'm an offline noodle with no encyclopedia.`;
    else if ((m = p.match(/^who (?:is|was|are|were) (.{2,60})$/))) text = `🤷 I don't know who **${trimPhrase(m[1])}** is. No internet for this noodle!`;
    else if ((m = p.match(/^(?:where|when) (?:is|was|are|were|do|does|did) (.{2,60})$/))) text = `🗺️ I don't have that kind of knowledge offline (${r(m[1])}).`;
    else if (/^(?:can you|could you|will you|would you|please) (?:write|summari[sz]e|translate|explain|code|fix|debug|help me with|teach me|draft|edit|rewrite|analy[sz]e|research|find)\b/.test(p)) text = "✍️ That's a job for my big brain: writing, translating and explaining need Claude.";
    if (text) {
      return {
        text: `${text}${this.brain ? '' : ' If you connect Claude (button at the top), I can answer questions like this properly!'}${hint}`,
        chips: [...claudeChip, chip('What can you do?'), chip('Tell me a fact')], kind: 'fallback', mood: 'thinking',
      };
    }
    // Statements: reflect them back, ELIZA-style, so the chat keeps flowing.
    const rules = [
      [/^i need (.{2,60})$/, (x) => pick(this.rng, [`Why do you need ${r(x)}?`, `Would ${r(x)} really help? 🤔`])],
      [/^i want (.{2,60})$/, (x) => pick(this.rng, [`Ooh, why do you want ${r(x)}?`, `What would you do if you got ${r(x)}? ✨`])],
      [/^i think (.{2,80})$/, (x) => `What makes you think ${r(x)}? 🤔`],
      [/^i (?:can not|cannot) (.{2,60})$/, (x) => `What's stopping you from being able to ${r(x)}? You might surprise yourself! 💪`],
      [/^i am from (.{2,40})$/, (x) => `Oh cool, ${capitalize(trimPhrase(x))}! 🌍 What's the best thing about it?`],
      [/^i (?:live|study|work) (?:in|at) (.{2,40})$/, (x) => `${capitalize(trimPhrase(x))}! 🌍 How do you like it there?`],
      [/^i (?:have|got) (.{2,60})$/, (x) => `Oh, you have ${r(x)}? Tell me more! 👀`],
      [/^i (?:am|m) (.{2,60})$/, (x) => `How long have you been ${r(x)}? 🤔`],
      [/^my (.{2,30}) (is|are|was|were) (.{2,60})$/, (x, v, y) => `Your ${r(x)} ${v} ${r(y)}? Tell me more! 👂`],
      [/\bbecause (.{2,60})$/, () => 'Is that the real reason? 🤔'],
      [/^you (?:are|re) (.{2,40})$/, (x) => `What makes you think I'm ${r(x)}? 😄`],
      [/^(?:we|let us|lets) (.{2,60})$/, () => "I like the sound of that! What's the plan? 😄"],
    ];
    for (const [re, fn] of rules) {
      const hit = p.match(re);
      if (hit) return { text: `${fn(...hit.slice(1))}${hint}`, kind: 'fallback', mood: 'curious' };
    }
    if (/\?$/.test(raw.trim())) {
      return { text: `🤔 Good question! I don't know that one offline.${this.brain ? '' : ' Connect Claude (button at the top) and I can answer almost anything.'}${hint}`, chips: [...claudeChip, chip('What can you do?')], kind: 'fallback', mood: 'thinking' };
    }
    return { text: `${pick(this.rng, SMALLTALK_FILLERS)}${hint}`, chips: [chip('Tell me a joke'), chip('Play a game'), chip('Surprise me')], kind: 'fallback', mood: 'curious' };
  }

  greetingReply(ctx) {
    this.session.greetCount += 1;
    const n = this.session.greetCount;
    const name = this.memory.name;
    if (n === 1 && !name && !this.session.askedName) {
      this.session.askedName = true;
      return { text: "Hi there! 👋 I'm **Noodle** 🍜. What's your name?", pending: { type: 'ask-name' }, mood: 'excited' };
    }
    if (n >= 3) return { text: pick(this.rng, ["Hi hi hi! 👋 We could do this all day. 😄 Or… play a game?", 'Hello again! 👋 Are we stuck in a greeting loop? 😄']), chips: [chip('Play a game'), chip('Tell me a joke')], mood: 'playful' };
    const h = ctx.now.getHours();
    const when = h < 5 ? " Up late, I see! 🌙" : h < 12 ? ' Good morning! ☀️' : h < 17 ? '' : h < 22 ? ' Good evening! 🌆' : ' Night owl! 🦉';
    return { text: `${pick(this.rng, ['Hey', 'Hi', 'Hello', 'Heya'])}${name ? ` ${name}` : ''}! 👋${when} ${pick(this.rng, ['What are we up to?', 'How can I brighten your day?', "What's on your mind?", 'Fancy a game or a joke?'])}`, chips: ['Play a game', 'Tell me a joke', 'Surprise me'].map(chip), mood: 'happy' };
  }

  async askBrain(ctx, fallback, opts) {
    const game = this.session.game ? GAMES[this.session.game.id].title : null;
    const system = systemPrompt({
      voice: this.memory.voice,
      mood: this.mood.current,
      memory: this.memory.summary(),
      date: ctx.now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
      game,
    });
    const messages = toMessages(this.session.transcript);
    if (!messages.length) return fallback;
    try {
      const out = await this.brain.respond({ system, messages, onText: opts.onText, signal: opts.signal });
      const text = out.text || '🤔 …I drew a blank. Could you ask that another way?';
      const cut = out.stopReason === 'max_tokens' ? '\n\n_(…I ran out of room there. Say "continue" for more.)_' : '';
      return { text: `${text}${cut}`, kind: 'brain', source: 'claude', mood: moodFromText(text), skipNudge: true };
    } catch (err) {
      const kind = err?.kind ?? 'unknown';
      const withLocal = (lead) => ({ ...fallback, text: `${lead}\n\n${fallback.text ?? ''}`.trim() });
      switch (kind) {
        case 'aborted':
          return { text: `${err.partial ? `${err.partial} ` : ''}⏹️ _Stopped._`, kind: 'brain', source: err.partial ? 'claude' : 'local', mood: 'curious', skipNudge: true };
        case 'refusal':
          return { text: "🙊 That's one my big brain won't help with. Let's talk about something else?", kind: 'brain', mood: 'worried', chips: [chip('Tell me a joke'), chip('Play a game')] };
        case 'auth':
          this.brain = null;
          return { ...withLocal('🔑 Claude didn\'t accept that API key, so I\'ve switched back to offline mode. (You can reconnect with a different key from the top bar.)'), actions: [...(fallback.actions ?? []), { type: 'brain-off', reason: 'auth' }] };
        case 'billing':
          return withLocal('💳 Claude says there\'s a billing problem with that API key (maybe out of credits?). Here\'s my offline answer instead:');
        case 'permission':
          return withLocal('🚫 That API key isn\'t allowed to use this model. Here\'s my offline answer instead:');
        case 'model':
          return withLocal('🧩 That Claude model isn\'t available for your key. Try the default model in Claude settings. Offline answer:');
        case 'rate':
        case 'overloaded':
          return withLocal('⏳ Claude is busy right now. Try again in a moment! Offline answer meanwhile:');
        case 'network':
        case 'sdk':
          return withLocal('📡 I couldn\'t reach Claude (are you offline?). Here\'s my offline answer instead:');
        default:
          return withLocal(`🤕 Something went wrong talking to Claude${err?.message ? ` (${String(err.message).slice(0, 120)})` : ''}. Offline answer:`);
      }
    }
  }

  finalize(result, ctx, redacted) {
    let text = `${ctx.prefix ?? ''}${result.text ?? ''}`;
    const current = this.session.game;
    if (ctx.gameUnhandled && current && !result.skipNudge && result.kind !== 'game' && result.kind !== 'safety') {
      const g = GAMES[current.id];
      text += `\n\n_${g.emoji} We're still playing ${g.title}. ${g.nudge(current.state)}_`;
    }
    const source = result.source ?? 'local';
    if (source === 'local' && !result.skipVoice) text = applyVoice(text, this.memory.voice, this.rng);
    this.mood.react(result.mood ?? (result.kind === 'fallback' ? 'curious' : 'happy'));
    if (result.pending) this.session.pending = result.pending;
    if (result.kind !== 'fallback') this.session.fallbackStreak = 0;
    if (result.offer) this.session.lastOffer = result.offer;
    else if (result.kind === 'tool') this.session.lastOffer = ctx.raw;
    else if (result.kind === 'intent' || result.kind === 'game') this.session.lastOffer = null;
    this.session.lastBotText = text;
    this.pushTranscript('assistant', text);
    return {
      text,
      chips: (result.chips ?? []).map(chip).slice(0, 6),
      mood: this.mood.current,
      card: result.card ?? null,
      actions: result.actions ?? [],
      source,
      kind: result.kind ?? 'intent',
      redactedInput: redacted ?? null,
    };
  }
}

function chip(c) {
  return typeof c === 'string' ? { label: c, value: c } : { label: c.label, value: c.value ?? c.label };
}

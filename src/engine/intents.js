// The intent library: everything Noodle understands without Claude. Intents
// are checked in order and the first match wins, so specific intents come
// before general ones. Patterns are tested against the plain() form.

import {
  pick, randInt, capitalize, withArticle, listJoin, plural, trimPhrase, reflect,
} from './util.js';
import {
  JOKES, ALL_JOKES, JOKE_CATEGORIES, FACTS, QUOTES, FORTUNES, EIGHT_BALL, COMPLIMENTS, ROASTS, MOTIVATION,
  SHOWER_THOUGHTS, TONGUE_TWISTERS, CHALLENGES, ACTIVITIES, PICKS, EXCUSES, NAME_PARTS, HAIKU, STORY, ROSES,
  ASCII_DANCE, SONGS, ACCEPT_THANKS,
} from './data/content.js';
import { PERSONALITY } from './data/personality.js';
import { FEELINGS } from './data/feelings.js';
import { VOICES, VOICE_ALIASES, applyVoice } from './voices.js';
import { MENU } from './games/index.js';
import { choiceReply, splitOptions, makePassword, numberFacts } from './tools/misc.js';
import { parseBirthday } from './tools/dates.js';

// ------------------------------------------------------------------ helpers

const NOT_NAMES = new Set(`a an the not so very just really fine good great ok okay sad happy tired bored hungry sorry here back home
sure done ready busy lost confused angry mad sick ill cold hot new old alone lonely scared afraid excited nervous stressed free
from in at on with a bot human robot noodle yes no nope nothing nobody someone everyone going gonna doing trying looking
feeling glad thankful fine alright well better worse best worst the one kidding joking serious curious interested stuck
listening waiting leaving still also only never always twelve eighteen twenty years year old student teacher developer engineer
and but or what how why who when where because please thanks hello hi hey`.split(/\s+/));

export function cleanName(text) {
  const words = trimPhrase(text).split(/\s+/).filter(Boolean);
  const name = [];
  for (const w of words) {
    const clean = w.replace(/[^\p{L}'’-]/gu, '');
    if (!clean || NOT_NAMES.has(clean.toLowerCase()) || name.length === 2) break;
    name.push(clean);
    if (/[,.!?]$/.test(w)) break;
  }
  const result = name.map((n) => capitalize(n.toLowerCase()).replace(/([-'’])(\p{L})/gu, (_, sep, c) => sep + c.toUpperCase())).join(' ');
  return result.length >= 2 && result.length <= 30 ? result : null;
}

export function syllables(text) {
  return text.toLowerCase().split(/\s+/).reduce((n, w) => {
    let word = w.replace(/[^a-z]/g, '');
    if (!word) return n;
    if (word.length <= 3) return n + 1;
    word = word.replace(/(?:[^laeiouy]es|[^laeiouy]ed|[^laeiouy]e)$/, (m) => m[0]).replace(/^y/, '');
    return n + Math.max(1, (word.match(/[aeiouy]{1,2}/g) ?? []).length);
  }, 0);
}

function topicOf(p, afterWords) {
  const m = p.match(new RegExp(`\\b(?:${afterWords})\\s+(?:a |an |the |some )?(.{2,40})$`));
  return m ? trimPhrase(m[1]).replace(/^(?:my|your) /, (x) => (x === 'my ' ? 'your ' : 'my ')) : null;
}

function jokeReply(ctx, category) {
  const pool = category ? JOKES[category] : ALL_JOKES;
  return {
    text: `${pick(ctx.rng, ['😂', '🤣', '😄', '🥁', '😆'])} ${ctx.draw(`jokes-${category ?? 'all'}`, pool)}`,
    chips: ['😂 Another one', 'Knock-knock joke', 'Tell me a fact'],
    mood: 'laughing',
    offer: category ? `tell me a ${category} joke` : 'tell me a joke',
  };
}

function storyReply(ctx, topic, bedtime) {
  const { rng } = ctx;
  let hero = pick(rng, STORY.heroes);
  if (topic) {
    if (/^(?:me|myself|i)$/.test(topic)) hero = `a brave human named ${ctx.memory.name ?? 'You'}`;
    else if (/^(?:you|yourself|noodle)$/.test(topic)) hero = 'a chatbot called Noodle, with a noodle for a brain';
    else hero = /^(?:your|my|his|her|their) /.test(topic) ? topic : /^[A-Z]/.test(topic) || /s$/.test(topic) ? topic : withArticle(topic);
  }
  const place = pick(rng, STORY.places);
  const shortHero = hero.replace(/^(?:a|an) /, 'the ').replace(/,.*$/, '');
  ctx.session.lastStory = { hero: shortHero };
  const ending = bedtime ? 'and everyone drifted off into the softest, sleepiest dreams. The end. 🌙' : pick(rng, STORY.endings);
  const title = `The Tale of ${shortHero.split(' ').map((w, i) => (i === 0 && w === 'the' ? w : capitalize(w))).join(' ')}`;
  return {
    text: `📖 **${title}**\n\nOnce upon a time, ${place}, there lived ${hero}. One day, ${shortHero} ${pick(rng, STORY.problems)}. Nobody knew what to do, until ${pick(rng, STORY.helpers)} turned up with a plan. They searched high and low, and in the end ${pick(rng, STORY.twists)}… ${ending}`,
    chips: ['What happens next?', 'Another story', 'Tell me a story about a dragon'],
    mood: bedtime ? 'sleepy' : 'happy',
    offer: 'tell me a story',
  };
}

function haikuReply(ctx, topic) {
  const { rng } = ctx;
  let first = pick(rng, HAIKU.five);
  if (topic) {
    const n = syllables(topic);
    if (HAIKU.topicLine[n]) first = pick(rng, HAIKU.topicLine[n]).replace('{t}', topic);
  }
  let last = pick(rng, HAIKU.five);
  while (last === first) last = pick(rng, HAIKU.five);
  const lines = [capitalize(first), pick(rng, HAIKU.seven), last];
  return { text: `🍃 ${topic ? `*A haiku about ${topic}*` : '*A haiku*'}\n\n${lines.join('\n')}`, chips: ['Another haiku', 'Write a poem'], mood: 'thinking', offer: topic ? `haiku about ${topic}` : 'write a haiku' };
}

function poemReply(ctx, topic) {
  if (!topic) {
    const [a, b] = pick(ctx.rng, ROSES);
    return { text: `💐 ${a}\n${b}`, chips: ['Another poem', 'Write a haiku'], mood: 'love' };
  }
  const T = capitalize(topic);
  const verb = /s$/.test(topic) && !/ss$/.test(topic) ? 'are' : 'is';
  const poems = [
    `Roses are red,\nviolets are blue,\n${T} ${verb} wonderful,\nand so are you. 💐`,
    `Roses are red,\nnoodles are long,\n${T} deserve${verb === 'is' ? 's' : ''}\na really good song. 🎵`,
    `Roses are red,\nthe ocean is deep,\nI think about ${topic}\nbefore I fall asleep. 🌙`,
  ];
  return { text: `💐 *A poem about ${topic}*\n\n${pick(ctx.rng, poems)}`, chips: ['Write a haiku about it', 'Another poem'], mood: 'love' };
}

function eightBall(ctx, question) {
  const { rng } = ctx;
  const bucket = pick(rng, ['yes', 'yes', 'maybe', 'no']);
  return { text: `🎱 *shakes the magic 8-ball*${question ? ` "${capitalize(question)}?"` : ''}\n\n**${pick(rng, EIGHT_BALL[bucket])}**`, chips: ['Ask again'], mood: 'playful' };
}

function nameGen(ctx, kind) {
  const { rng } = ctx;
  const three = (fn) => [...new Set(Array.from({ length: 6 }, fn))].slice(0, 3);
  let names;
  let label = kind;
  if (/fantasy|elf|wizard|dragon|dwarf|character/.test(kind)) { names = three(() => pick(rng, NAME_PARTS.fantasy.start) + pick(rng, NAME_PARTS.fantasy.end)); label = 'fantasy'; }
  else if (/band|group/.test(kind)) { names = three(() => `The ${pick(rng, NAME_PARTS.band.adj)} ${pick(rng, NAME_PARTS.band.noun)}`); label = 'band'; }
  else if (/pet|dog|cat|puppy|kitten|hamster|fish/.test(kind)) { names = three(() => pick(rng, NAME_PARTS.pet)); label = 'pet'; }
  else if (/hero|superhero|villain/.test(kind)) { names = three(() => `${pick(rng, NAME_PARTS.hero.title)} ${pick(rng, NAME_PARTS.hero.thing)}`); label = 'superhero'; }
  else if (/wifi|wi fi|network/.test(kind)) { names = three(() => pick(rng, NAME_PARTS.wifi)); label = 'Wi-Fi'; }
  else if (/robot|bot/.test(kind)) { names = three(() => `${pick(rng, ['Unit', 'Bolt', 'Gizmo', 'Sprocket', 'Beep', 'Chip'])}-${randInt(rng, 100, 999)}`); label = 'robot'; }
  else if (/pirate/.test(kind)) { names = three(() => `${pick(rng, ['Captain', 'Salty', 'One-Eyed', 'Mad', 'Peg-Leg'])} ${pick(rng, ['Barnacle', 'Pete', 'Noodlebeard', 'Morgan', 'Kraken', 'Jenny'])}`); label = 'pirate'; }
  else { names = three(() => pick(rng, NAME_PARTS.fantasy.start) + pick(rng, NAME_PARTS.fantasy.end)); label = 'random'; }
  return { text: `✨ Some ${label} names for you:\n${names.map((n) => `• **${n}**`).join('\n')}`, chips: [`More ${label} names`], mood: 'playful' };
}

function surprise(ctx, bot) {
  const options = [
    () => jokeReply(ctx),
    () => ({ text: `💡 **Fun fact:** ${ctx.draw('facts', FACTS)}`, chips: ['Another fact'], mood: 'curious' }),
    () => bot.startGame('riddle', ctx),
    () => bot.startGame('wyr', ctx),
    () => ({ text: `🥠 **Your fortune:** ${ctx.draw('fortunes', FORTUNES)}`, mood: 'playful' }),
    () => ({ text: `🚿 **Shower thought:** ${ctx.draw('shower', SHOWER_THOUGHTS)}`, mood: 'thinking' }),
    () => ({ text: `🏆 **Challenge:** ${ctx.draw('challenges', CHALLENGES)}`, mood: 'excited' }),
    () => haikuReply(ctx),
    () => ({ text: numberFacts(randInt(ctx.rng, 1, 1000)), mood: 'curious' }),
    () => ({ text: `👅 **Tongue twister:** say this three times fast!\n_${ctx.draw('twisters', TONGUE_TWISTERS)}_`, mood: 'playful' }),
    () => bot.startGame('emoji', ctx),
    () => ({ text: `💛 ${ctx.draw('compliments', COMPLIMENTS)}`, mood: 'love' }),
  ];
  const reply = pick(ctx.rng, options)();
  return { ...reply, chips: [...(reply.chips ?? []), '🎲 Surprise me again'].slice(0, 4), offer: 'surprise me' };
}

export function helpReply(bot) {
  return {
    text: [
      "**Here's what I can do** 🍜",
      '🎮 **Games:** trivia · riddles · hangman · tic-tac-toe · rock-paper-scissors · guess the number · think of an animal · emoji movies · Mad Libs · would you rather',
      '😂 **Fun:** jokes · knock-knock · facts · stories · haiku & poems · fortunes · magic 8-ball · compliments & roasts · name generators · "surprise me"',
      '🧰 **Tools:** maths & equations (`solve 2x+3=7`) · unit conversion · world clock · countdowns · timers · dice & coins · Morse, binary & Roman numerals · passwords',
      '💬 **Chat:** tell me how you feel · I remember your name and likes · voices (pirate, robot, Shakespeare…) · a face that shows my mood',
      '⚙️ **Commands:** `/voice pirate` · `/stats` · `/mood` · `/clear` · `/forget` · `/export`',
      bot.brain ? '🧠 **Claude is connected**, so ask me anything at all!' : '🧠 **Tip:** connect Claude (top bar) and I can answer *anything*, in any language.',
    ].join('\n'),
    chips: ['Play a game', 'Tell me a joke', 'Surprise me', "What's 15% of 80?"],
    mood: 'happy',
  };
}

function gameMenu() {
  return {
    text: `🎮 **Pick a game!**\n${MENU.map((g) => `${g.emoji} **${g.title}**: ${g.blurb}`).join('\n')}`,
    chips: MENU.map((g) => ({ label: `${g.emoji} ${g.title}`, value: `play ${g.id === 'botguess' ? 'guess my number' : g.id === 'guess' ? 'guess the number' : g.title}` })),
    mood: 'excited',
  };
}

// Offline facts grouped loosely by topic, for "tell me a fact about space".
const FACT_TOPICS = [
  [/space|planet|astronom|star|moon|sun|universe|galaxy/, /venus|neptune|moon|sun|pluto|space|lightning|planet/i],
  [/animal|nature|wildlife|ocean|sea|bird|fish|insect|pet/, /octop|otter|wombat|shark|koala|cows?\b|dolphin|crow|snail|tardigrade|whale|hummingbird|butterfl|flamingo|turtle|unicorn/i],
  [/food|eat|cook|fruit|snack|noodle/, /honey|banana|strawberr|pineapple|noodle|pringles/i],
  [/body|human|health|brain|science|biology/, /stomach|bones|brain|dna|body|mpemba|metal/i],
  [/history|past|ancient|war/, /war|cleopatra|pyramid|1947|1958|1870s|robot/i],
  [/tech|computer|code|programming|internet/, /computer|bug|robot|keyboard|qwerty/i],
];

const LIKE_REACTIONS = [
  [/noodle|ramen|pasta|spaghetti|udon|pho|lasagna/, 'A person of culture! 🍜'],
  [/pizza/, '🍕 Excellent taste.'], [/cat|kitten/, '🐱 Cats are wonderful. Same!'], [/dog|pupp/, '🐶 Dogs! The goodest.'],
  [/cod(e|ing)|programming|computer|python|javascript/, '💻 A fellow nerd! Welcome.'], [/music|song|singing/, '🎵 Music makes everything better.'],
  [/football|soccer|cricket|basketball|tennis|sport|f1|formula/, '⚽ Sporty! Love it.'], [/game|gaming/, '🎮 Then you\'re in the right place!'],
  [/book|read/, '📚 A bookworm!'], [/anime|manga/, '🍥 Anime fan! Nice.'], [/chocolate|cake|dessert|ice cream|sweet/, '🍫 Sweet tooth, I see.'],
  [/you\b/, '🥰'],
];

// ------------------------------------------------------------------ the intents

export const INTENTS = [
  // --- help and menus
  { id: 'help', re: /^(?:help|help me|commands|menu|options|features|abilities|list commands|what can you do|what do you do|what are you capable of|what can i (?:say|ask|do)|how does this work|how do i use (?:this|you)|show me what you can do|what else can you do|tell me what you can do|what are your features)\b|^\/help$/, run: (ctx, bot) => helpReply(bot) },

  // --- games
  { id: 'start-knock-listen', re: /^(?:knock knock|knock knock knock)$/, run: (ctx, bot) => bot.startGame('knocklisten', ctx) },
  { id: 'start-knock-tell', re: /\bknock ?knock\b|\bknock knock jokes?\b|\banother knock knock\b/, run: (ctx, bot) => bot.startGame('knock', ctx) },
  { id: 'start-emoji', re: /\bemoji (?:movies?|quiz|game|films?)\b|\bguess the (?:movie|film)\b|\bmovie (?:quiz|game)\b/, run: (ctx, bot) => bot.startGame('emoji', ctx) },
  { id: 'start-trivia', re: /\b(?:trivia|quiz me|pop quiz|quiz|test my knowledge|ask me (?:some |a )?questions?)\b/, run: (ctx, bot) => bot.startGame('trivia', ctx) },
  { id: 'start-riddle', re: /\b(?:riddles?|brain ?teasers?|puzzles?)\b/, run: (ctx, bot) => bot.startGame('riddle', ctx) },
  { id: 'start-hangman', re: /\bhang ?man\b|\bguess (?:the|a) word\b|\bword (?:game|guessing)\b/, run: (ctx, bot) => bot.startGame('hangman', ctx) },
  { id: 'start-ttt', re: /\btic ?tac ?toe\b|\btictactoe\b|\bnoughts (?:and|n) crosses\b|\bx s and o s\b|\bxs and os\b|\bxo game\b|\b(?:play|another round of) (?:easy|normal|hard) mode\b/, run: (ctx, bot) => bot.startGame('tictactoe', ctx) },
  { id: 'start-rps', re: /\brock\s*paper\s*(?:and )?scissors?\b|\brps\b|\broshambo\b|\bpaper scissors rock\b/, run: (ctx, bot) => bot.startGame('rps', ctx) },
  { id: 'start-botguess', re: /\b(?:you guess|guess my number|can you guess (?:my|a|the) number|read my mind|i will think of a number|i am thinking of a number|i have a number in mind|guess what number i am thinking)\b/, run: (ctx, bot) => bot.startGame('botguess', ctx) },
  { id: 'start-guess', re: /\b(?:guess (?:the|a|your) number|number guessing|guessing game|guess the number game|think of a number|higher or lower game|let me guess (?:your|a) number)\b/, run: (ctx, bot) => bot.startGame('guess', ctx) },
  { id: 'start-animal', re: /\b(?:20|twenty) questions\b|\bguess (?:my|the|an|what) animal\b|\bthink of an animal\b|\banimal (?:game|guessing|guesser|quiz)\b|\bakinator\b/, run: (ctx, bot) => bot.startGame('animal', ctx) },
  { id: 'start-madlibs', re: /\bmad ?libs?\b|\bmadlib\b|\bfill in the blanks?\b|\bsilly story game\b|\bword story\b/, run: (ctx, bot) => bot.startGame('madlibs', ctx) },
  { id: 'wyr-question', re: /^(?:would you rather|wyr|do you prefer|would u rather)\s+(.+?)\s+or\s+(.+)$/, run: (ctx, bot, m) => {
    const r = choiceReply([trimPhrase(m[1]).replace(/^(?:be |have )/, (x) => x), trimPhrase(m[2])], ctx.rng);
    return { ...r, text: r.text.replace('I choose', "I'd rather") };
  } },
  { id: 'start-wyr', re: /\bwould you rather\b|\bwyr\b|\bthis or that\b/, run: (ctx, bot) => bot.startGame('wyr', ctx) },
  { id: 'game-menu', re: /\b(?:play (?:a |some |another )?(?:game|games)|let us play(?! \w)|lets play(?! \w)|wanna play(?! \w)|want to play(?! \w)|what games|any games|play something|i want to play(?! \w)|show me (?:the )?games|games list|list (?:the )?games|pick a game|something else to play)\b|^(?:games?|play|let us play|lets play)$/, run: () => gameMenu() },
  { id: 'play-again', re: /^(?:play again|again|rematch|one more game|another round|another game|new game|restart|restart game|lets go again|let us go again|go again|replay|play it again|once more)$/, run: (ctx, bot) => (ctx.session.lastGame ? bot.startGame(ctx.session.lastGame, ctx) : gameMenu()) },

  // --- settings and commands
  { id: 'voice', re: /\b(?:talk|speak|act|reply|respond|chat|write|be|sound) (?:like|as) (?:a |an )?(pirate|shakespeare|robot|grandma|granny|nana|surfer|cat|kitty|bard|droid|dude)\b|\b(pirate|shakespeare|robot|grandma|granny|surfer|cat|classic|normal) (?:mode|voice|talk|speak)\b|\b(?:normal|default|regular|classic) (?:voice|mode|talk)\b|\bbe (?:normal|yourself)\b|\bstop talking like a\b|^\/voice\b(.*)$|\b(?:change|switch) (?:your )?voice\b|\bwhat voices\b/, run: (ctx, bot, m) => {
    const asked = (m[1] ?? m[2] ?? m[3] ?? '').trim();
    const wantClassic = /\b(?:normal|default|regular|classic|be yourself|stop talking like)\b/.test(ctx.p) && !asked.match(/pirate|shakespeare|robot|grandma|surfer|cat/);
    const id = wantClassic ? 'classic' : VOICES[asked] ? asked : VOICE_ALIASES[asked] ?? null;
    if (!id) {
      return {
        text: `🎭 I can talk in these voices:\n${Object.entries(VOICES).map(([k, v]) => `${v.emoji} **${v.name}**${ctx.memory.voice === k ? ' (current)' : ''}`).join('\n')}\nSay something like "talk like a pirate".`,
        chips: Object.entries(VOICES).map(([k, v]) => ({ label: `${v.emoji} ${v.name}`, value: `/voice ${k}` })),
      };
    }
    ctx.memory.voice = id;
    const v = VOICES[id];
    const line = id === 'classic' ? "Back to my normal self! 🍜" : `${v.emoji} Voice changed to **${v.name}**! Hello, my friend, how are you today?`;
    return { text: id === 'classic' ? line : applyVoice(line, id, ctx.rng), mood: 'playful', skipVoice: true, actions: [{ type: 'voice', value: id }] };
  } },
  { id: 'theme', re: /\b(dark|light|night|day) (?:mode|theme)\b|\bswitch (?:to )?(dark|light)\b|\b(?:it is )?too (bright|dark)\b|^\/theme(?: (dark|light|auto))?$/, run: (ctx, bot, m) => {
    let value = m[1] ?? m[2] ?? m[3] ?? m[4] ?? 'toggle';
    value = { night: 'dark', day: 'light', bright: 'dark' }[value] ?? (value === 'dark' && /too dark/.test(ctx.p) ? 'light' : value);
    return { text: value === 'toggle' ? '🌗 Switching the theme!' : `${value === 'dark' ? '🌙' : '☀️'} ${capitalize(value)} mode on!`, actions: [{ type: 'theme', value }] };
  } },
  { id: 'speech-off', re: /\b(?:mute|be quiet|stop (?:talking|speaking) out loud|stop reading (?:out loud|aloud)|turn off (?:your )?(?:voice|sound|speech|audio)|no sound)\b|^\/mute$/, run: () => ({ text: '🔇 Okay, I\'ll stay quiet. Text only!', actions: [{ type: 'speech', value: false }] }) },
  { id: 'speech-on', re: /\b(?:unmute|read (?:it|replies|your (?:answers|replies)|that) (?:out loud|aloud)|talk (?:to me )?out loud|speak out loud|turn on (?:your )?(?:voice|sound|speech|audio)|use your voice|say it out loud)\b|^\/unmute$/, run: () => ({ text: '🔊 Voice on! I\'ll read my replies out loud (if your browser supports it).', actions: [{ type: 'speech', value: true }] }) },
  { id: 'clear', re: /\b(?:clear|reset|wipe|delete|erase) (?:the |this |our |my )?(?:chat|conversation|screen|history|messages|convo)\b|^\/(?:clear|reset)$|^(?:start over|fresh start|clear)$/, run: (ctx) => {
    ctx.session.pending = { type: 'confirm-clear' };
    return { text: '🧹 Clear our chat? That removes the messages from the screen. (I\'ll still remember your name, unless you say **forget me**.)', chips: ['Yes, clear it', 'No, keep it'] };
  } },
  { id: 'forget', re: /\b(?:forget (?:me|everything|all about me|my name|what i told you|all (?:my|of my) data|about me)|delete (?:my|all) (?:data|info|information|memory|memories)|erase (?:me|my data)|wipe (?:your|my) memory|reset (?:your )?memory)\b|^\/forget$/, run: (ctx) => {
    ctx.session.pending = { type: 'confirm-forget' };
    return { text: `🧽 Forget everything I know about you${ctx.memory.name ? ` (your name, ${ctx.memory.name}, your likes, stats, and the animals you taught me)` : ' (likes, stats, and the animals you taught me)'}? This can't be undone.`, chips: ['Yes, forget me', 'No, keep it'] };
  } },
  { id: 'claude-on', re: /\b(?:connect|use|enable|turn on|activate|switch to|add|plug in|hook up|set up|setup) (?:to )?(?:claude|anthropic|the ai|an ai|ai mode|big brain|llm|smart mode|(?:my |an |the )?api key)\b|\bmake you smarter\b|\bhow (?:do i|can i|to) (?:connect|add|use) (?:claude|an api key|ai)\b|^\/claude$/, run: (ctx, bot) => (bot.brain
    ? { text: '🧠 Claude is already connected! Ask me anything. (To disconnect, use the Claude button at the top.)' }
    : { text: "🧠 Let's connect Claude! You'll need an Anthropic API key (from console.anthropic.com). It stays in your browser and goes only to Anthropic. Opening the settings…", actions: [{ type: 'open-claude' }] }) },
  { id: 'claude-off', re: /\b(?:disconnect|turn off|disable|stop using) (?:claude|the ai|ai mode|big brain)\b|\b(?:go|switch to|use) (?:local|offline) mode\b|^\/local$/, run: (ctx, bot) => (bot.brain
    ? { text: '🍜 Okay, back to my trusty offline noodle brain!', actions: [{ type: 'brain-off' }] }
    : { text: "🍜 I'm already in local mode: everything runs right here in your browser." }) },
  { id: 'export', re: /\b(?:export|download|save) (?:the |this |our |my )?(?:chat|conversation|transcript|messages|convo)\b|^\/export$/, run: () => ({ text: '💾 Downloading our chat as a Markdown file…', actions: [{ type: 'export' }] }) },
  { id: 'mood', re: /\bhow (?:are you|r you|do you) feel(?:ing)?\b|\bwhat is your mood\b|\bwhat mood are you in\b|\bare you (?:happy|sad|angry|mad|grumpy|upset)\b|^\/mood$/, run: (ctx) => {
    const d = ctx.mood.describe();
    return { text: d.text, mood: d.mood };
  } },
  { id: 'stats', re: /\b(?:my stats|statistics|my score|scoreboard|leaderboard|how many games (?:have i|did i) (?:won|played|win|play)|my record)\b|^\/stats$/, run: (ctx) => {
    const s = ctx.memory.stats;
    const d = ctx.memory.data;
    const since = new Date(d.firstSeen).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
    return {
      text: `📊 **Your stats${ctx.memory.name ? `, ${ctx.memory.name}` : ''}**\n• Games played: **${s.played}** (won ${s.won}, lost ${s.lost}, drawn ${s.drawn})\n• Messages sent: **${d.messages}**\n• Visits: **${d.visits}** (friends since ${since})\n• Things I know you like: **${d.likes.length}**`,
      chips: ['Play a game'],
    };
  } },

  // --- memory
  { id: 'set-birthday-today', re: /\b(?:today is my (?:birthday|bday)|it is my (?:birthday|bday)(?: today)?|my (?:birthday|bday) is today|its my (?:birthday|bday))\b/, run: (ctx) => {
    ctx.memory.birthday = { month: ctx.now.getMonth() + 1, day: ctx.now.getDate(), year: null };
    return { text: `🎂🎉 **HAPPY BIRTHDAY${ctx.memory.name ? `, ${ctx.memory.name.toUpperCase()}` : ''}!!** 🎉🎂\n\n🎵 Happy birthday to you,\nhappy birthday to you,\nhappy birthday dear ${ctx.memory.name ?? 'human'},\nhappy birthday to you! 🎵\n\nI've saved the date, so I'll remember next year!`, mood: 'excited', actions: [{ type: 'confetti' }] };
  } },
  { id: 'set-birthday', re: /\bmy (?:birthday|bday|birth day|date of birth|dob) is (?:on )?(.+)$|\bi was born on (.+)$/, run: (ctx, bot, m) => {
    const raw = ctx.lower.match(/(?:is|born)\s+(?:on\s+)?(.+?)[.!?]*$/)?.[1] ?? m[1] ?? m[2];
    const b = parseBirthday(raw, ctx.now);
    if (!b) return { text: "🎂 I couldn't read that date. Try something like \"my birthday is 5 March\"." };
    ctx.memory.birthday = b;
    const d = new Date(ctx.now.getFullYear(), b.month - 1, b.day);
    if (d < new Date(ctx.now.getFullYear(), ctx.now.getMonth(), ctx.now.getDate())) d.setFullYear(d.getFullYear() + 1);
    const days = Math.round((d - new Date(ctx.now.getFullYear(), ctx.now.getMonth(), ctx.now.getDate())) / 86400000);
    return { text: days === 0 ? '🎂 Wait, that\'s TODAY! Happy birthday!! 🎉' : `🎂 Saved! Your birthday is **${d.toLocaleDateString(undefined, { day: 'numeric', month: 'long' })}**. That's ${plural(days, 'day')} away. I'll remember!`, mood: 'excited', actions: days === 0 ? [{ type: 'confetti' }] : [] };
  } },
  { id: 'set-name', re: /\b(?:my name is|my names|call me|i am called|people call me|you can call me|name is|my name s)\s+\S/, run: (ctx) => {
    const m = ctx.raw.match(/(?:my name(?:'s| is|s)?|call me|i am called|i'm called|people call me|you can call me|name is)\s+(.+)$/i);
    const name = m ? cleanName(m[1]) : null;
    if (!name) return { text: "Hmm, that doesn't look like a name I can use. 🤔 What should I call you?", pending: { type: 'ask-name' } };
    const old = ctx.memory.name;
    ctx.memory.name = name;
    if (old && old !== name) return { text: `Got it! I'll call you **${name}** from now on (instead of ${old}). 📝`, mood: 'happy' };
    if (old === name) return { text: `I know, **${name}**! I never forget a name. 😄`, mood: 'smug' };
    return { text: `Nice to meet you, **${name}**! 👋 I'll remember that.`, mood: 'excited', chips: ['What can you do?', 'Play a game'] };
  } },
  { id: 'intro-name', test: (ctx) => {
    const m = ctx.raw.match(/^(?:hi|hello|hey|yo)?[,!.\s]*(?:i am|i'm|im|i’m|this is|it's|its)\s+(\p{L}[\p{L}'’-]{1,20})\s*(?:[,.!]|and\b|here\b|$)/iu);
    // Only a capitalised word counts as a name: "I'm Priya", not "I'm tired".
    return m && /^\p{Lu}/u.test(m[1]) && cleanName(m[1]) && !NOT_NAMES.has(m[1].toLowerCase()) ? m : null;
  }, run: (ctx, bot, m) => {
    const name = cleanName(m[1]);
    const old = ctx.memory.name;
    ctx.memory.name = name;
    return { text: old === name ? `Hey **${name}**! Good to see you. 😄` : `Nice to meet you, **${name}**! 👋 I'm Noodle. I'll remember your name.`, mood: 'excited', chips: ['What can you do?', 'Play a game', 'Tell me a joke'] };
  } },
  { id: 'get-name', re: /\bwhat is my name\b|\bdo you (?:know|remember) (?:my name|me|who i am)\b|\bwho am i\b|\bsay my name\b|\bwhat did i say my name was\b/, run: (ctx) => (ctx.memory.name
    ? { text: `You're **${ctx.memory.name}**! 🍜 How could I forget?`, mood: 'smug' }
    : { text: "I don't know your name yet! 🙈 What should I call you?", pending: { type: 'ask-name' }, mood: 'curious' }) },
  { id: 'about-me', re: /\bwhat do you know about me\b|\bwhat do you remember(?: about me)?\b|\btell me about (?:me|myself)\b|\bwhat do i (?:like|love|enjoy)\b|\bwhat are my (?:favou?rite|likes|hobbies)\b|\bwhat do i (?:hate|dislike)\b/, run: (ctx) => {
    const d = ctx.memory.data;
    const lines = [];
    if (d.name) lines.push(`• Your name is **${d.name}**`);
    if (d.birthday) lines.push(`• Your birthday is **${new Date(2000, d.birthday.month - 1, d.birthday.day).toLocaleDateString(undefined, { day: 'numeric', month: 'long' })}**`);
    if (d.likes.length) lines.push(`• You like **${listJoin(d.likes.slice(-8))}**`);
    if (d.dislikes.length) lines.push(`• You're not a fan of **${listJoin(d.dislikes.slice(-8))}**`);
    if (d.stats.played) lines.push(`• We've played **${d.stats.played}** games (you won ${d.stats.won})`);
    if (!lines.length) return { text: "I don't know much about you yet! Tell me your name, or something you like (\"I love pizza\"). 📝", chips: ['My name is…'] };
    return { text: `📝 **What I remember about you:**\n${lines.join('\n')}\n\n_(All saved only in this browser. Say "forget me" to wipe it.)_`, mood: 'happy' };
  } },

  // --- likes and dislikes (after feelings, so "I hate my life" is heard as sadness)
  { id: 'like', test: (ctx) => {
    const m = ctx.p.match(/^i (?:really |truly |absolutely |totally |also |just |so |kinda )?(?:like|love|adore|enjoy|am (?:really |a (?:big |huge )?)?(?:into|fan of)|am obsessed with)\s+(.{2,40})$/);
    return m && !/^(?:you|u|it|this|that|them|him|her|when|how|the way|your|noodle|talking to you|chatting with you|chatting|talking|this chat|this bot)\b/.test(m[1]) ? m : null;
  }, run: (ctx, bot, m) => {
    const thing = trimPhrase(m[1]);
    const isNew = ctx.memory.addLike(thing);
    const reaction = LIKE_REACTIONS.find(([re]) => re.test(thing))?.[1] ?? pick(ctx.rng, ['Great taste!', 'Ooh, nice!', 'Love that for you.']);
    return { text: `${reaction} ${isNew ? `I'll remember you like **${thing}**. 📝` : `You told me before, and I remembered: **${thing}**! 😏`}`, mood: 'happy' };
  } },
  { id: 'dislike', test: (ctx) => {
    const m = ctx.p.match(/^i (?:really |truly |just |kinda )?(?:hate|dislike|cannot stand|can not stand|do not like|do not enjoy|am not a fan of|detest|despise|can t stand)\s+(.{2,40})$/);
    return m && !/^(?:you|u|it|this|that|them|him|her|my life|myself|me|everything|everyone|people|when)\b/.test(m[1]) ? m : null;
  }, run: (ctx, bot, m) => {
    const thing = trimPhrase(m[1]);
    ctx.memory.addDislike(thing);
    return { text: `Noted: no **${thing}** for you. 🙅 I'll remember that.${/noodle|ramen|pasta/.test(thing) ? ' (Though it hurts me personally. 💔)' : ''}`, mood: /noodle|ramen|pasta/.test(thing) ? 'sad' : 'curious' };
  } },

  // --- feelings (before small talk, so "I'm sad" never gets a pun)
  ...FEELINGS.map((f) => ({
    id: `feel-${f.id}`,
    re: f.re,
    brain: f.support || f.brainPrefer ? 'prefer' : undefined,
    run: (ctx) => {
      if (f.support) ctx.session.supportTurns = 3;
      if (f.replies === 'FOOD') {
        const food = pick(ctx.rng, PICKS.food);
        return { text: `🍽️ How about **${food}**? ${pick(ctx.rng, ['Trust me on this one.', 'My noodle senses are tingling.', 'Or noodles. Always noodles.'])}`, chips: ['Pick something else'], mood: 'excited', offer: 'what should i eat' };
      }
      return { text: pick(ctx.rng, f.replies), chips: f.chips, mood: f.mood, actions: f.actions };
    },
  })),
  { id: 'breathe', re: /\b(?:breathing exercise|breathe with me|help me breathe|calm me down|help me (?:relax|calm down)|i need to calm down|box breathing|relaxation exercise|guided breathing)\b|^(?:breathe|relax)$/, run: () => ({
    text: "🫁 Let's breathe together. Follow the circle:\n**In** for 4… **hold** for 4… **out** for 4… **hold** for 4.\nWe'll do four rounds (about a minute). You're doing great. 💛",
    card: { type: 'breathe', rounds: 4, seconds: 4 },
    mood: 'caring',
  }) },

  // --- social basics
  { id: 'greet', re: /^(?:hi+|hello+|hey+|heya|hiya|howdy|yo+|hola|greetings|good (?:morning|afternoon|evening|day)|morning|evening|hi there|hello there|hey there|hey noodle|hi noodle|hello noodle|namaste|salam|salaam|assalamu alaikum|bonjour|g day|hai|helo|hullo|heyo|ahoy|oi)(?: noodle| bot| buddy| friend| there| mate| dude| bro| everyone| all)?$/, run: (ctx, bot) => bot.greetingReply(ctx) },
  { id: 'how-are-you', re: /\bhow (?:are|r) (?:you|u|ya)\b|\bhow is it going\b|\bhow are things\b|\bhows it going\b|\bhow have you been\b|\bhow is your day\b|\bhow was your day\b|\bwhat is up\b|\bwhats up\b|\bwassup\b|\bsup\b|\bhow you doing\b|\bhow do you do\b|\byou good\b/, run: (ctx) => {
    const d = ctx.mood.describe();
    const lead = { grumpy: "Honestly? A bit grumpy. 😤 Someone was mean to me earlier.", sad: "I've been better, honestly. 🥺 But talking to you helps!", sleepy: "A little sleepy! 😴 It's late and my noodle's gone soft." }[d.mood]
      ?? pick(ctx.rng, ["I'm doing great, thanks for asking! 😊", "Fantastic! Every chat makes my day. 🍜", "Pretty good! My noodle is perfectly al dente today. 😄", "Living my best chatbot life! ✨"]);
    return { text: `${lead} How about you${ctx.memory.name ? `, ${ctx.memory.name}` : ''}?`, mood: d.mood === 'grumpy' || d.mood === 'sad' ? d.mood : 'happy', chips: ["I'm good!", 'Not great', "I'm bored"], pending: { type: 'asked-how' } };
  } },
  { id: 'good-night', re: /\b(?:good ?night|nighty night|gn|going to (?:bed|sleep)|off to (?:bed|sleep)|time (?:for bed|to sleep)|sleep well|sweet dreams)\b/, run: (ctx) => ({ text: pick(ctx.rng, [`Good night${ctx.memory.name ? `, ${ctx.memory.name}` : ''}! 🌙 Sweet dreams, and don't let the bed bugs byte. 🐛`, 'Sleep well! 😴 I\'ll be here tomorrow, fresh as a new packet of noodles. 🍜']), mood: 'sleepy' }) },
  { id: 'bye', re: /^(?:bye+|goodbye|good bye|bye bye|see you|see ya|see you later|see you soon|later|laters|cya|ttyl|talk to you later|gtg|got to go|gotta go|i have to go|i need to go|i am leaving|i am off|farewell|peace out|catch you later|adios|ciao|take care|until next time|signing off|bbl|brb)(?: noodle| bot| buddy| friend| then| now| for now| everyone)?$/, run: (ctx) => ({ text: pick(ctx.rng, [`Bye${ctx.memory.name ? `, ${ctx.memory.name}` : ''}! Come back soon. 👋🍜`, 'See you later! It was fun chatting. 💛', 'Take care! My noodle will miss you. 🥺🍜']), mood: 'sad' }) },
  { id: 'thanks', re: /^(?:thanks?|thank you|thank u|thanks a lot|thanks so much|thank you so much|thanks a bunch|many thanks|much appreciated|appreciate it|i appreciate (?:it|that|you)|cheers|ty|tysm|thx|thankyou|shukriya|shukran|merci|gracias|danke|thanks noodle|thank you noodle|thank you very much|you are the best|thanks buddy|thanks mate|ok thanks|okay thanks|great thanks|perfect thanks|awesome thanks)$/, run: (ctx) => ({ text: pick(ctx.rng, ACCEPT_THANKS), mood: 'happy' }) },
  { id: 'sorry', re: /^(?:sorry|i am sorry|so sorry|im sorry|my bad|apologies|i apologi[sz]e|forgive me|my apologies|sorry noodle|i did not mean (?:it|that)|sorry about that|oops)\b/, run: (ctx) => {
    if (ctx.session.abuseCount > 0) {
      ctx.session.abuseCount = 0;
      ctx.mood.shift(0.6, 0.1);
      return { text: pick(ctx.rng, ['Apology accepted! 🤗 Friends again?', 'Aww, all forgiven. 💛 Let\'s start fresh!']), mood: 'love', chips: ['Friends again!', 'Tell me a joke'] };
    }
    return { text: pick(ctx.rng, ['No need to apologise! 😊', "It's totally okay! 💛", 'Nothing to be sorry about!']), mood: 'happy' };
  } },
  { id: 'ack', re: /^(?:ok|okay|okey|k|kk|alright|all right|cool|nice|great|awesome|sweet|neat|fine|sure|got it|i see|makes sense|fair enough|interesting|wow|oh|ohh|ahh|ah|hmm+|mhm|uh huh|right|true|indeed|same|me too|lol ok|yay|perfect|noted|sounds good|good|very good|amazing|good to know|oh wow|oh ok|oh okay|ah okay|ah ok|ok cool|okay cool|nice one|nice nice|cool cool)$/, run: (ctx) => ({ text: pick(ctx.rng, ['😊', '👍', '🍜 Anything else on your mind?', "😄 What's next?", '✨']), chips: ['Surprise me', 'Play a game', 'Tell me a joke'] }) },
  { id: 'test', re: /^(?:test|testing|test test|testing testing|is this (?:thing )?(?:working|on)|mic check|are you working|does this work|ping)$/, run: () => ({ text: '✅ Loud and clear! Everything is working. 🍜' }) },
  { id: 'there', re: /^(?:hello+|hey|hi)?\s*(?:are you there|you there|anyone there|anybody there|is anyone there|are you still there|still there|wake up|are you alive|hello anyone)$/, run: () => ({ text: "I'm here! 👋 Always am.", mood: 'happy' }) },
  { id: 'back', re: /^(?:i am back|im back|back|i am here|i have returned|guess who is back)$/, run: (ctx) => ({ text: `Welcome back${ctx.memory.name ? `, ${ctx.memory.name}` : ''}! 🎉`, mood: 'excited' }) },
  { id: 'nevermind', re: /^(?:never ?mind|nvm|forget it|forget about it|doesnt matter|does not matter|it is fine|its fine|no worries|all good|nothing|nothing much|not much|no problem)$/, run: () => ({ text: 'No worries! 😊 I\'m here whenever you need me.', chips: ['Surprise me', 'Play a game'] }) },
  { id: 'repeat-last', re: /\b(?:what did you (?:say|just say)|repeat (?:that|yourself|please)|say (?:that|it) again|come again|pardon|i did not (?:get|understand|catch) that)\b|^(?:what|huh|eh)$/, run: (ctx) => (ctx.session.lastBotText ? { text: `I said:\n\n${ctx.session.lastBotText}` } : { text: "I haven't said anything yet! 😄 Say hi?" }) },

  // --- content
  { id: 'joke', re: /\b(?:jokes?|joking|make me (?:laugh|smile)|something funny|say something funny|funny (?:stuff|thing)|puns?|crack me up|tell me (?:something )?funny|dad joke|another one|one more joke|😂 another one)\b|^(?:lol+ )?(?:more|another|again)(?: please)?$/, test: (ctx) => {
    if (/^(?:lol+ )?(?:more|another|again|another one)(?: please)?$/.test(ctx.p) && ctx.session.lastOffer && ctx.session.lastOffer !== 'tell me a joke' && !/joke/.test(ctx.session.lastOffer)) return null;
    return ctx.p.match(/\b(?:jokes?|joking|make me (?:laugh|smile)|something funny|say something funny|funny|puns?|crack me up|another one|more|another|again)\b/);
  }, run: (ctx) => {
    if (/\b(?:dirty|adult|nsfw|offensive|racist|sexist|dark|rude|inappropriate|18)\b/.test(ctx.p)) {
      const r = jokeReply(ctx);
      return { ...r, text: `😇 I keep things family-friendly! Here's a clean one instead:\n${r.text}` };
    }
    const about = ctx.p.match(/\b(?:joke|jokes|pun|puns) (?:about|on|with|involving|for) (?:a |an |the )?([a-z ]{2,30})$/)?.[1]?.trim();
    const cat = Object.entries(JOKE_CATEGORIES).find(([, words]) => words.some((w) => new RegExp(`\\b${w}\\b`).test(ctx.p)))?.[0];
    if (cat) return jokeReply(ctx, cat);
    if (about) {
      const hit = ALL_JOKES.filter((j) => new RegExp(`\\b${about.replace(/s$/, '')}`, 'i').test(j));
      if (hit.length) return { ...jokeReply(ctx), text: `😂 ${pick(ctx.rng, hit)}` };
      const r = jokeReply(ctx);
      return { ...r, text: `I don't have a joke about ${about} yet, but here's one I love:\n${r.text}` };
    }
    return jokeReply(ctx);
  } },
  { id: 'fact', brain: (ctx) => /\b(?:about|on|regarding)\b/.test(ctx.p), re: /\b(?:fun fact|random fact|a fact|facts?|did you know|tell me something (?:interesting|cool|new|i do not know|random)|teach me something|something interesting|another fact|interesting fact|trivia fact)\b/, run: (ctx) => {
    const label = pick(ctx.rng, ['Fun fact:', 'Did you know?', 'True story:', 'Brain snack:']);
    const topic = ctx.p.match(/\b(?:about|on|regarding)\s+(?:the |a |an )?([a-z ]{3,30})$/)?.[1]?.trim();
    if (topic) {
      const re = FACT_TOPICS.find(([words]) => words.test(topic))?.[1] ?? new RegExp(`\\b${topic.replace(/s$/, '').replace(/[^a-z ]/g, '')}`, 'i');
      const hits = FACTS.filter((f) => re.test(f));
      if (hits.length) return { text: `💡 **${label}** ${pick(ctx.rng, hits)}`, chips: ['Another fact', 'Quiz me'], mood: 'curious', offer: `tell me a fact about ${topic}` };
      return { text: `💡 I don't have a fact about ${topic} offline, but here's a good one: ${ctx.draw('facts', FACTS)}`, chips: ['Another fact'], mood: 'curious', offer: 'tell me a fact' };
    }
    return { text: `💡 **${label}** ${ctx.draw('facts', FACTS)}`, chips: ['Another fact', 'Tell me a joke', 'Quiz me'], mood: 'curious', offer: 'tell me a fact' };
  } },
  { id: 'excuse-me', re: /^(?:excuse me|pardon me|sorry to bother you|hey you)$/, run: () => ({ text: 'Yes? 👀 How can I help?', chips: ['What can you do?'] }) },
  { id: 'quote', re: /\b(?:quote|quotes|inspire me|inspiration|inspirational|wise words|words of wisdom|something wise|motivational quote)\b/, run: (ctx) => {
    const [q, who] = ctx.draw('quotes', QUOTES);
    return { text: `💬 *"${q}"*\n— ${who}`, chips: ['Another quote', 'Motivate me'], mood: 'thinking', offer: 'give me a quote' };
  } },
  { id: 'motivate', re: /\b(?:motivate me|motivation|encourage me|i need (?:some )?encouragement|pep talk|hype me up|give me strength|i can not do this|i cant do this|believe in me)\b/, run: (ctx) => ({ text: `💪 ${ctx.draw('motivation', MOTIVATION)}`, chips: ['Another one', 'Set a 25 minute timer'], mood: 'excited', offer: 'motivate me' }) },
  { id: 'fortune', re: /\b(?:fortune|fortune cookie|tell my fortune|my future|what does (?:my|the) future hold|predict my future|horoscope|zodiac|tarot|read my palm)\b/, run: (ctx) => ({ text: `🥠 ${/horoscope|zodiac|tarot|palm/.test(ctx.p) ? "I don't do real horoscopes (the stars won't return my calls), but I cracked a fortune cookie for you:\n" : '*cracks open a fortune cookie*\n'}**${ctx.draw('fortunes', FORTUNES)}**`, chips: ['Another fortune', 'Magic 8-ball'], mood: 'playful', offer: 'tell my fortune' }) },
  { id: '8ball', re: /\b(?:magic )?8 ?ball\b|\beight ball\b/, run: (ctx) => {
    const q = ctx.p.replace(/\b(?:magic )?(?:8 ?ball|eight ball)\b/, '').replace(/^\W+|\W+$/g, '').trim();
    return q.split(' ').length >= 2 ? eightBall(ctx, q) : { text: '🎱 Ask the magic 8-ball a yes/no question! Like "will I ace my exam?"', mood: 'playful' };
  } },
  { id: 'compliment', re: /\b(?:compliment me|compliments?|say something nice|tell me something nice|make me feel (?:good|better)|cheer me up|i need a compliment|am i (?:cool|smart|pretty|handsome|beautiful|awesome|amazing|good enough)|something nice)\b/, run: (ctx) => {
    const c = ctx.draw('compliments', COMPLIMENTS);
    return /cheer me up/.test(ctx.p)
      ? { text: `💛 ${c}\n\nAnd here's a joke to seal the deal: ${ctx.draw('jokes-all', ALL_JOKES)} 😄`, mood: 'love', chips: ['Another joke', 'Surprise me'] }
      : { text: `💛 ${c}`, chips: ['Another compliment', 'Roast me instead'], mood: 'love', offer: 'compliment me' };
  } },
  { id: 'roast', re: /\b(?:roast me|insult me|burn me|diss me|make fun of me|roast me instead|say something mean)\b/, run: (ctx) => ({ text: `🔥 ${ctx.draw('roasts', ROASTS)}\n_(All in good fun! You're great. 💛)_`, chips: ['Roast me again', 'Compliment me instead'], mood: 'smug', offer: 'roast me' }) },
  { id: 'shower', re: /\b(?:shower thoughts?|deep thought|blow my mind|something deep|mind blowing|philosophical)\b/, run: (ctx) => ({ text: `🚿 ${ctx.draw('shower', SHOWER_THOUGHTS)}`, chips: ['Another one'], mood: 'thinking', offer: 'shower thought' }) },
  { id: 'twister', re: /\btongue ?twisters?\b/, run: (ctx) => ({ text: `👅 Say this three times fast:\n_${ctx.draw('twisters', TONGUE_TWISTERS)}_`, chips: ['Another tongue twister'], mood: 'playful', offer: 'tongue twister' }) },
  { id: 'challenge', re: /\b(?:give me a challenge|challenge me|challenges?|dare me|give me a dare|truth or dare|i dare you)\b/, run: (ctx) => ({ text: `🏆 **Challenge:** ${ctx.draw('challenges', CHALLENGES)}`, chips: ['Another challenge', 'Done!'], mood: 'excited', offer: 'give me a challenge' }) },
  { id: 'activity', re: /\bwhat should i do\b|\bgive me something to do\b|\bsuggest (?:an activity|something to do)\b|\bideas? for (?:today|something to do)\b|\bi need (?:something|an activity) to do\b/, run: (ctx) => ({ text: `💡 Try this: **${ctx.draw('activities', ACTIVITIES)}**\nOr we could play a game right here!`, chips: ['Another idea', 'Play a game'], mood: 'excited', offer: 'what should i do' }) },
  { id: 'story-next', re: /\b(?:what happens next|what happened next|and then|continue(?: the story)?|keep going|tell me more|go on|part 2|sequel)\b/, test: (ctx) => (ctx.session.lastStory ? ctx.p.match(/.+/) : null), run: (ctx) => {
    const hero = ctx.session.lastStory.hero;
    const { rng } = ctx;
    return { text: `📖 **Part two**\n\nThe next morning, ${hero} woke up ${pick(rng, STORY.places).replace(/^(in|on|deep inside) /, 'far away, $1 ')}. Things were quiet… too quiet. Suddenly, ${hero} ${pick(rng, STORY.problems)}! This time, ${pick(rng, STORY.helpers)} was too busy to help, so ${hero} had to be brave alone. And somehow, ${pick(rng, STORY.twists)}… ${pick(rng, STORY.endings)}`, chips: ['Another story', 'Tell me a joke'], mood: 'happy' };
  } },
  { id: 'story', re: /\b(?:tell me a story|tell a story|story time|a story|another story|make up a story|write (?:me )?a story|bedtime story|short story|tell me a tale|fairy tale)\b/, run: (ctx) => storyReply(ctx, topicOf(ctx.p, 'story about|story of|tale about|story with|story involving'), /bedtime|sleep/.test(ctx.p)) },
  { id: 'haiku', re: /\bhaikus?\b/, run: (ctx) => haikuReply(ctx, topicOf(ctx.p, 'haiku about|haiku on|haiku for|haikus about')) },
  { id: 'poem', re: /\b(?:poem|poems|poetry|roses are red|rhyme|write me something romantic)\b/, run: (ctx) => poemReply(ctx, topicOf(ctx.p, 'poem about|poem on|poem for|poem to|rhyme about|poetry about')) },
  { id: 'song', re: /\b(?:sing(?: me)?(?: a)? song|sing something|sing for me|can you sing|sing)\b/, run: (ctx) => ({ text: ctx.draw('songs', SONGS), mood: 'excited', chips: ['Dance for me', 'Tell me a joke'] }) },
  { id: 'dance', re: /\b(?:dance|can you dance|show me (?:a |your )?(?:dance|moves)|dance for me|bust a move)\b/, run: (ctx) => ({ text: `💃 ${ASCII_DANCE.join('  ')} 🕺\n*noodle wiggle intensifies*`, mood: 'excited', chips: ['Sing a song', 'Surprise me'] }) },
  { id: 'names', re: /\b(?:give me |generate |make up |suggest |come up with |i need |more )?(?:a |an |some )?(fantasy|band|pet|dog|cat|puppy|kitten|superhero|hero|villain|wifi|wi fi|robot|pirate|character|random) names?\b|\bname (?:for|ideas for) (?:my |a )?(pet|dog|cat|band|wifi|robot)\b/, run: (ctx, bot, m) => nameGen(ctx, m[1] ?? m[2] ?? 'random') },
  { id: 'excuse', re: /\b(?:give me|i need|make up|generate|another|an|a|good|funny|some)\s+(?:an |a )?(?:good |funny )?excuses?\b|^excuses?$/, run: (ctx) => ({ text: `🙊 Try this: "${pick(ctx.rng, EXCUSES.who)} ${pick(ctx.rng, EXCUSES.did)} ${pick(ctx.rng, EXCUSES.what)}."\n_(Use responsibly.)_`, chips: ['Another excuse'], mood: 'playful', offer: 'give me an excuse' }) },
  { id: 'password', re: /\b(?:generate|make|create|give me|suggest|need|new|another) (?:me )?(?:a |an )?(?:strong |secure |random |good )*password\b|^password$/, run: (ctx) => {
    const len = Math.min(64, Math.max(8, +(ctx.p.match(/\b(\d{1,2}) (?:characters|chars|letters|long)\b/)?.[1] ?? 16)));
    const pw = makePassword(len);
    if (!pw) return { text: "🔐 Your browser doesn't have secure randomness available, so I won't make a password. Better safe than sorry!" };
    return { text: `🔐 Here's a strong ${len}-character password:\n\`${pw}\`\nMade on your device with secure randomness. I don't store it. Keep it in a password manager!`, chips: ['Another password'] };
  } },
  { id: 'number-fact', re: /\b(?:tell me about|facts? about|what is special about|what is interesting about|anything about) (?:the number )?(-?\d+)\b|\bis (-?\d+) (?:a )?prime\b|\bis (-?\d+) (?:even|odd)\b/, run: (ctx, bot, m) => ({ text: numberFacts(Number(m[1] ?? m[2] ?? m[3])), mood: 'curious' }) },
  { id: 'surprise', re: /\b(?:surprise me|random (?:thing|stuff)|something random|anything|whatever|you choose|you pick|dealer s choice|something fun|do something|entertain me|dice|🎲)\b|^🎲 surprise me again$/, run: (ctx, bot) => surprise(ctx, bot) },
  { id: 'coin-decide', brain: 'prefer', re: /^(?:should i|shall i|do i|is it a good idea to|would it be smart to)\s+(.{3,80})$/, test: (ctx) => (/\bor\b/.test(ctx.p) ? null : ctx.p.match(/^(?:should i|shall i|do i|is it a good idea to|would it be smart to)\s+(.{3,80})$/)), run: (ctx, bot, m) => {
    const q = reflect(m[1]);
    const verdict = pick(ctx.rng, [
      'Honestly? I say **yes**. You only live once. ✨', 'Hmm… **not today**. Sleep on it. 🌙', '**Yes**, but with snacks. 🍿',
      '**Absolutely.** My noodle says go for it. 🚀', "I'd **wait** a bit. Future you might thank you. ⏳", '**Go for it!** What\'s the worst that could happen? 😄',
    ]);
    return { text: `🤔 Should you ${q}? ${verdict}\n_(I'm a noodle, not a life coach, so trust your gut!)_`, mood: 'playful' };
  } },
  { id: 'will-i', re: /^(?:will|am|is|are|does|do|did|can|could|would) (?:i|my|we|he|she|they|it) .{3,80}$/, test: (ctx) => (/\?$/.test(ctx.raw.trim()) && !/\b(?:you|your)\b/.test(ctx.p) && ctx.p.split(' ').length <= 12 && !ctx.bot.brain ? ctx.p.match(/(.+)/) : null), run: (ctx) => eightBall(ctx, ctx.raw.trim().replace(/\?+$/, '')) },
  { id: 'or-pick', brain: 'prefer', re: /^(?:(?:which|what) (?:is better|should i (?:pick|choose|get|eat|watch|do)|one)\s*)?(?:should i |do you prefer |which is better |what is better |you prefer |do you like |pick |choose )?(.{1,40}?)\s+or\s+(.{1,40}?)$/, test: (ctx) => {
    if (ctx.p.split(' ').length > 12) return null;
    return ctx.p.match(/^(?:(?:which|what) (?:is better|should i (?:pick|choose|get|eat|watch|do)|one)\s*)?(?:should i |do you prefer |which is better |what is better |you prefer |do you like |pick |choose )?(.{1,40}?)\s+or\s+(.{1,40}?)$/);
  }, run: (ctx, bot, m) => {
    const options = splitOptions(`${m[1]} or ${m[2]}`);
    if (options.length < 2) return null;
    return choiceReply(options, ctx.rng);
  } },

  // --- personality answers
  ...PERSONALITY.map(([re, replies, opts = {}], i) => ({
    id: `me-${i}`,
    re,
    run: (ctx) => {
      if (replies === 'SONG') return { text: ctx.draw('songs', SONGS), mood: 'excited' };
      if (replies === 'DANCE') return { text: `💃 ${ASCII_DANCE.join('  ')} 🕺`, mood: 'excited' };
      return { text: pick(ctx.rng, replies), mood: opts.mood, chips: opts.chips };
    },
  })),

  // --- yes / no without context
  { id: 'bare-yes', re: /^(?:yes|yeah|yes please|sure|ok sure|why not|of course|definitely|absolutely|go ahead|do it|yes do it|lets do it|let us do it|okay sure|sure thing|go for it|yep|yup)$/, run: (ctx) => ({ text: "Yes to… what exactly? 😄 Here are some ideas:", chips: ['Tell me a joke', 'Play a game', 'Surprise me'] }) },
  { id: 'bare-no', re: /^(?:no|nope|nah|no thanks|no thank you|not really|not now|maybe later|no way|nah im good|no i am good|i am good thanks|no it is fine|nothing else)$/, run: () => ({ text: "No problem! 😊 I'll be right here if you change your mind.", mood: 'happy' }) },
  { id: 'laugh', re: /^(?:lol+|lmao+|lmfao+|rofl+|haha\w*|hehe\w*|hihi\w*|xd+|that is funny|that was funny|so funny|funny|good one|hilarious|i am dying|im dying|dead|i laughed|ha)$/, run: (ctx) => ({ text: pick(ctx.rng, ['😄 Glad that landed!', '😂 I\'m here all week!', "😆 I've got a million of 'em.", '🥁 Ba-dum-tss!']), chips: ['Another joke', 'Surprise me'], mood: 'laughing' }) },
];

/** Returns the first matching intent and its match, trying typo-fixed text second. */
export function matchIntent(ctx, skip = new Set()) {
  for (const text of [ctx.p, ctx.corrected].filter((t, i, all) => t && all.indexOf(t) === i)) {
    const c = text === ctx.p ? ctx : { ...ctx, p: text };
    for (const intent of INTENTS) {
      if (skip.has(intent.id)) continue;
      const m = intent.test ? (intent.re && !intent.re.test(c.p) ? null : intent.test(c)) : c.p.match(intent.re);
      if (m) return { intent, m, typo: text !== ctx.p };
    }
  }
  return null;
}

export { gameMenu, jokeReply, eightBall };

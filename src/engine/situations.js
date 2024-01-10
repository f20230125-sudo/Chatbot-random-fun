// Detectors for the unusual messages people actually send: keyboard smashes,
// emoji-only replies, shouting, pasted code, links, other languages and so on.

import { ALL_JOKES, FACTS, SHOWER_THOUGHTS, COMPLIMENTS, MOTIVATION, FORTUNES, QUOTES, STORY } from './data/content.js';

// A small English corpus: the bot's own content plus everyday words. Its letter
// pairs decide whether a word looks like language or like a cat on a keyboard.
const EVERYDAY = `the be to of and a in that have i it for not on with he as you do at this but his by from they we say her she or an will my one all
would there their what so up out if about who get which go me when make can like time no just him know take people into year your good some could
them see other than then now look only come its over think also back after use two how our work first well way even new want because any these give
day most us hello hey thanks please yes okay sorry love hate happy sad tired bored hungry thirsty angry lonely stressed anxious excited nervous game
play joke fact story riddle trivia music movie song book food pizza pasta noodle noodles weather school college university exam homework friend family
mother father brother sister boyfriend girlfriend dog cat bird fish computer phone laptop internet program programming code python javascript java
question answer help name age birthday tomorrow yesterday today morning night evening afternoon week month weekend holiday christmas dubai india
strength strengths rhythm rhythms lymph nymph crypt gym gyms myth myths lynx sync synths twelfth sixths fifths eighths months texts glimpsed
chatbot robot claude anthropic amazing awesome cool nice great terrible awful beautiful weird strange crazy wonderful fantastic brilliant hmm`;

const CORPUS_TEXT = [EVERYDAY, ...ALL_JOKES, ...FACTS, ...SHOWER_THOUGHTS, ...COMPLIMENTS, ...MOTIVATION, ...FORTUNES,
  ...QUOTES.map((q) => q[0]), ...Object.values(STORY).flat()].join(' ').toLowerCase();

let model = null;
function getModel() {
  if (model) return model;
  const known = new Set();
  const bigrams = new Map();
  for (const w of CORPUS_TEXT.match(/[a-z]+/g)) {
    known.add(w);
    for (let i = 0; i < w.length - 1; i++) {
      const bg = w.slice(i, i + 2);
      bigrams.set(bg, (bigrams.get(bg) ?? 0) + 1);
    }
  }
  model = { known, common: new Set([...bigrams].filter(([, n]) => n >= 2).map(([bg]) => bg)) };
  return model;
}

const ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm', '1234567890'];
const INTERJECTIONS = /^(?:h+m+|hm+|mm+|uh+|um+|er+m*|ah+|oh+|ooh+|aw+|eh+|meh|shh+|pfft+|psst+|brr+|grr+|zzz+|tsk|hmph|ugh+|argh+|yay+|woo+|wow+|whoa+|hehe+|haha+|lol+|lmao+|rofl|xd+|brb|afk|gg|ok+|kk+|idk|smh|tbh|imo|ikr|omg+|fyi|asap|lmk|nvm|ty|np|yw|ftw|wtf|irl)$/;

function keyboardRun(w) {
  for (const row of ROWS) {
    for (const r of [row, [...row].reverse().join('')]) {
      for (let i = 0; i + 4 <= w.length; i++) if (r.includes(w.slice(i, i + 4))) return true;
    }
  }
  return false;
}

/** Does this single word look like random key-mashing? */
export function isGibberishWord(word) {
  const w = word.toLowerCase();
  if (w.length < 5 || !/^[a-z]+$/.test(w)) return false;
  const { known, common } = getModel();
  if (known.has(w) || known.has(w.replace(/(?:s|es|ed|ing|ly)$/, '')) || INTERJECTIONS.test(w)) return false;
  if (/(.)\1{3,}/.test(w)) return false; // "sooooo" is emphasis, not gibberish
  if (keyboardRun(w)) return true;
  if (!/[aeiouy]/.test(w)) return true;
  let rare = 0;
  for (let i = 0; i < w.length - 1; i++) if (!common.has(w.slice(i, i + 2))) rare++;
  return rare / (w.length - 1) >= 0.45;
}

const EMOJI_RE = /\p{Extended_Pictographic}(?:️|‍\p{Extended_Pictographic}|\p{Emoji_Modifier})*/gu;

const EMOJI_MEANINGS = [
  ['love', /[❤💕😍🥰😘💖💗💓💞💘💝😻💜💙💚💛🧡🤍🖤🤎♥]/u],
  ['laugh', /[😂🤣😆😹😁😄😅]/u],
  ['sad', /[😢😭😞😔☹🙁💔😿🥺😥😓]/u],
  ['angry', /[😡🤬😠👿💢]/u],
  ['ok', /[👍👌✅🆗🤙✔]/u],
  ['bad', /[👎❌]/u],
  ['wave', /[👋🙋]/u],
  ['noodle', /[🍜🍝]/u],
  ['party', /[🎉🥳🎊🎂🎈]/u],
  ['thinking', /[🤔🧐]/u],
  ['sleepy', /[😴💤🥱]/u],
  ['fire', /[🔥💯⚡]/u],
  ['food', /[🍕🍔🌮🍟🌯🍣🍩🍪🍰🍫🍦🥐🍎🍌]/u],
  ['animal', /[🐶🐱🐭🐹🐰🦊🐻🐼🐨🐯🦁🐮🐷🐸🐵🐔🐧🐦🐤🦄🐝🐙🐢🐍🦖🐳🐬🐟]/u],
  ['poop', /💩/u],
  ['thanks', /🙏/u],
  ['eyes', /👀/u],
  ['robot', /🤖/u],
  ['cool', /[😎🕶]/u],
  ['shock', /[😱😮😲🤯😳]/u],
  ['wink', /[😉😜😝😛🤪]/u],
  ['skull', /[💀☠]/u],
  ['sick', /[🤢🤮🤒🤧😷]/u],
];

export function emojiMeaning(text) {
  for (const [meaning, re] of EMOJI_MEANINGS) if (re.test(text)) return meaning;
  return 'other';
}

const SCRIPTS = [
  ['ur', 'Urdu', /[ٹڈڑںھہے]/u, 'آداب! 👋'],
  ['ar', 'Arabic', /\p{Script=Arabic}/u, 'أهلاً وسهلاً! 👋'],
  ['hi', 'Hindi', /\p{Script=Devanagari}/u, 'नमस्ते! 🙏'],
  ['bn', 'Bengali', /\p{Script=Bengali}/u, 'নমস্কার! 🙏'],
  ['pa', 'Punjabi', /\p{Script=Gurmukhi}/u, 'ਸਤ ਸ੍ਰੀ ਅਕਾਲ! 🙏'],
  ['ta', 'Tamil', /\p{Script=Tamil}/u, 'வணக்கம்! 🙏'],
  ['te', 'Telugu', /\p{Script=Telugu}/u, 'నమస్కారం! 🙏'],
  ['ml', 'Malayalam', /\p{Script=Malayalam}/u, 'നമസ്കാരം! 🙏'],
  ['ja', 'Japanese', /[\p{Script=Hiragana}\p{Script=Katakana}]/u, 'こんにちは！👋'],
  ['ko', 'Korean', /\p{Script=Hangul}/u, '안녕하세요! 👋'],
  ['zh', 'Chinese', /\p{Script=Han}/u, '你好！👋'],
  ['ru', 'Russian', /\p{Script=Cyrillic}/u, 'Привет! 👋'],
  ['el', 'Greek', /\p{Script=Greek}/u, 'Γειά σου! 👋'],
  ['he', 'Hebrew', /\p{Script=Hebrew}/u, 'שלום! 👋'],
  ['th', 'Thai', /\p{Script=Thai}/u, 'สวัสดี! 🙏'],
];

// Latin-script languages, identified by distinctive words and greetings.
const LATIN_LANGS = [
  ['es', 'Spanish', '¡Hola! 👋', /\b(?:hola|gracias|cómo estás|como estas|qué tal|que tal|buenos días|buenos dias|buenas noches|buenas tardes|adiós|adios|por favor|habla[s]? español|estoy|tengo|quiero|muy bien|amigo|señor|mañana)\b/g],
  ['fr', 'French', 'Bonjour ! 👋', /\b(?:bonjour|bonsoir|salut|merci|comment ça va|comment ca va|ça va|ca va|je suis|s'il vous plaît|s il vous plait|au revoir|oui|parlez vous|parles tu|très bien|tres bien|je m'appelle)\b/g],
  ['de', 'German', 'Hallo! 👋', /\b(?:hallo|guten tag|guten morgen|guten abend|danke|wie geht|ich bin|tschüss|tschuss|bitte|sprichst du|sprechen sie|sehr gut|ich heiße|ich heisse)\b/g],
  ['it', 'Italian', 'Ciao! 👋', /\b(?:ciao|grazie|come stai|buongiorno|buonasera|prego|sono|molto bene|parli italiano)\b/g],
  ['pt', 'Portuguese', 'Olá! 👋', /\b(?:olá|obrigado|obrigada|tudo bem|bom dia|boa noite|boa tarde|você|voce|falas português|fala português)\b/g],
  ['tr', 'Turkish', 'Merhaba! 👋', /\b(?:merhaba|nasılsın|nasilsin|teşekkürler|tesekkurler|teşekkür ederim|günaydın|gunaydin|iyi geceler)\b/g],
  ['id', 'Indonesian', 'Halo! 👋', /\b(?:apa kabar|terima kasih|selamat pagi|selamat malam|selamat siang|sampai jumpa)\b/g],
  ['nl', 'Dutch', 'Hoi! 👋', /\b(?:dank je|dankjewel|goedemorgen|hoe gaat het|goedenavond|tot ziens)\b/g],
  ['sw', 'Swahili', 'Jambo! 👋', /\b(?:jambo|habari|asante|karibu|hujambo)\b/g],
  ['tl', 'Filipino', 'Kumusta! 👋', /\b(?:kumusta|kamusta|salamat|magandang umaga|mahal kita)\b/g],
];

// Romanised greetings from languages many people type in Latin script.
const ROMAN_GREETINGS = [
  [/\b(?:as ?salamu? ?alaikum|assalamualaikum|assalam o alaikum|asalam alaikum|salam alaikum|salamu alaikum|as salaam alaikum|aoa)\b/, 'Wa alaikum assalam! 👋 Peace be upon you too.'],
  [/^(?:salam|salaam|salam aleikum)$/, 'Wa alaikum assalam! 👋'],
  [/^(?:marhaba|marhaban|ahlan|ahlan wa sahlan)(?: \w+)?$/, 'Ahlan wa sahlan! 👋 Welcome!'],
  [/^(?:namaste|namaskar|namaskaram|pranam)(?: \w+)?$/, 'Namaste! 🙏'],
  [/\b(?:kaise ho|kaisa hai|kaisi ho|kya haal|kya hal|kya haal hai|kese ho|kaise hain)\b/, 'Main badhiya hoon, shukriya! 😄 Aap kaise ho? (My Hindi/Urdu is mostly greetings, so let\'s continue in English!)'],
  [/^(?:shukriya|dhanyavad|dhanyawad|shukran|merci|gracias|danke|grazie|obrigado|arigato|arigatou|xie xie|spasibo|asante|salamat)(?: \w+)?$/, 'You\'re welcome! 😊 (I recognise "thank you" in lots of languages!)'],
  [/^(?:sat sri akal|vanakkam|nomoskar|adaab)$/, '🙏 Hello to you too!'],
  [/^(?:konnichiwa|ohayo|ohayou|annyeong|annyeonghaseyo|ni hao|nihao|privet|shalom|sawasdee|aloha|jambo)$/, '👋 Hello! Great greeting. I speak a little of everything, and a lot of English!'],
];

/** Guesses the language of a non-English message. */
export function detectLanguage(raw) {
  const letters = raw.match(/\p{L}/gu) ?? [];
  if (letters.length >= 2) {
    for (const [code, name, re, greeting] of SCRIPTS) {
      const count = letters.filter((ch) => re.test(ch)).length;
      if (count / letters.length >= 0.5 || (code === 'ur' && count > 0 && letters.some((ch) => /\p{Script=Arabic}/u.test(ch)))) {
        return { code, name, greeting };
      }
    }
  }
  const lower = raw.toLowerCase();
  const wordCount = (lower.match(/\S+/g) ?? []).length;
  for (const [code, name, greeting, re] of LATIN_LANGS) {
    const hits = lower.match(re)?.length ?? 0;
    if (hits >= 2 || (hits === 1 && wordCount <= 4)) return { code, name, greeting };
  }
  return null;
}

export function romanGreeting(plainText) {
  for (const [re, reply] of ROMAN_GREETINGS) if (re.test(plainText)) return reply;
  return null;
}

const CODE_HINTS = [
  ['Python', /^\s*(?:def |class \w+.*:|import \w|from \w+ import|print\(|if __name__|elif |self\.)/m],
  ['JavaScript', /\b(?:const|let|var) \w+\s*=|=>|console\.log|function\s*\w*\s*\(|document\.|require\(/],
  ['TypeScript', /:\s*(?:string|number|boolean)\b|interface \w+\s*\{/],
  ['Java', /\bpublic (?:static )?(?:class|void)\b|System\.out\.println/],
  ['C/C++', /#include\s*<|std::|printf\(|int main\s*\(/],
  ['C#', /\busing System;|Console\.WriteLine/],
  ['HTML', /<(?:html|div|span|body|head|p|a|script)\b[^>]*>/i],
  ['CSS', /^[.#]?[\w-]+\s*\{[^}]*:[^}]*;/m],
  ['SQL', /\b(?:SELECT .+ FROM|INSERT INTO|CREATE TABLE|UPDATE \w+ SET|DELETE FROM)\b/i],
  ['JSON', /^\s*[{[]\s*"[\w-]+"\s*:/],
  ['Shell', /^\s*(?:#!\/bin\/(?:ba)?sh|sudo |apt(?:-get)? |npm |pip |cd |ls |echo \$)/m],
  ['Rust', /\bfn main\(\)|let mut |println!\(/],
  ['Go', /\bpackage main\b|func \w+\(|fmt\.Print/],
];

export function detectCode(raw) {
  const fenced = /```/.test(raw);
  const lines = raw.split('\n');
  const codeish = lines.filter((l) => /[;{}]\s*$|^\s{2,}\S|^\s*(?:def|class|import|return|if|for|while|function|const|let|var|#include|public|private)\b/.test(l)).length;
  if (!fenced && !(lines.length >= 3 && codeish >= 2) && !(lines.length <= 2 && CODE_HINTS.slice(0, 5).some(([, re]) => re.test(raw)) && /[(){};=]/.test(raw))) return null;
  const language = CODE_HINTS.find(([, re]) => re.test(raw))?.[0] ?? (raw.match(/```(\w+)/)?.[1] ?? null);
  const pairs = [['(', ')'], ['[', ']'], ['{', '}']];
  const body = raw.replace(/```\w*/g, '').replace(/(["'`])(?:\\.|(?!\1).)*\1/g, '""');
  const unbalanced = pairs.map(([o, c]) => [o, c, body.split(o).length - 1, body.split(c).length - 1]).filter(([, , a, b]) => a !== b);
  return { language, lines: raw.replace(/```\w*\n?/g, '').trim().split('\n').length, unbalanced };
}

export const URL_RE = /\bhttps?:\/\/[^\s<>"')]+|\bwww\.[^\s<>"')]+\.[a-z]{2,}[^\s<>"')]*/gi;

/**
 * Summarises what kind of message this is. `history` is the list of the
 * user's previous normalised messages (most recent last).
 */
export function analyze(raw, plainText, history = []) {
  const letters = raw.match(/\p{L}/gu) ?? [];
  const upper = letters.filter((c) => c !== c.toLowerCase()).length;
  const emojis = raw.match(EMOJI_RE) ?? [];
  const withoutEmoji = raw.replace(EMOJI_RE, '').replace(/[\s️‍]/g, '');
  const wordsAll = raw.match(/[a-z]+/gi) ?? [];
  const longWords = wordsAll.filter((w) => w.length >= 5);
  const gibberishWords = longWords.filter(isGibberishWord);
  const urls = raw.match(URL_RE) ?? [];
  let repeatCount = 0;
  for (let i = history.length - 1; i >= 0 && history[i] === plainText; i--) repeatCount++;

  return {
    empty: raw.trim().length === 0,
    punctuationOnly: raw.trim().length > 0 && /^[\p{P}\p{S}\s]+$/u.test(raw) && emojis.length === 0,
    emojiOnly: emojis.length > 0 && withoutEmoji.length === 0,
    emojis,
    shouting: letters.length >= 8 && upper / letters.length >= 0.85 && /\s/.test(raw.trim()),
    gibberish: longWords.length > 0 && gibberishWords.length / Math.max(1, wordsAll.filter((w) => w.length >= 3).length) >= 0.5,
    keyboardSmash: wordsAll.length <= 3 && gibberishWords.length >= 1 && gibberishWords.some((w) => keyboardRun(w.toLowerCase()) || w.length >= 7),
    scream: /^(?:a{4,}h*|a+h{3,}|e{5,}|o{5,}|n{4,}o+)!*$/i.test(raw.trim()),
    long: raw.length > 1500,
    wordCount: (raw.match(/\S+/g) ?? []).length,
    code: detectCode(raw),
    urls,
    urlOnly: urls.length > 0 && raw.replace(URL_RE, '').trim().length === 0,
    numberOnly: /^\s*-?\d[\d,]*(?:\.\d+)?\s*$/.test(raw),
    laughter: /^(?:(?:ha|he|hi|ja|je|jaja|ho|kek)+h?|l+o+l+(?:z+)?|lmf?a+o+|rofl|xd+|haha\w*|hehe\w*|😂+|🤣+|ahaha\w*|bahaha\w*)[!. ]*$/i.test(plainText.replace(/\s+/g, '')) && plainText.length > 0,
    language: detectLanguage(raw),
    repeatCount,
  };
}

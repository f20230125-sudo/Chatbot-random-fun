// Helpers shared by the games.

import { plain, similarity, fuzzyEquals } from '../util.js';

const YES = /^(?:y|yes|yea|yeah|yep|yup|ya|yas+|sure|ok|okay|of course|definitely|absolutely|correct|right|true|affirmative|indeed|certainly|aye|yes it is|yes it does|yes it can|it is|it does|it can|i think so|probably|mostly|usually|pretty much|totally|haan|han|ji|haan ji|si|oui|ja|da|bingo|you got it|that is right|thats right|that is it|got it|yes you are right)\b/;
const NO = /^(?:n|no|nope|nah|naw|not|never|negative|false|wrong|incorrect|no it is not|no it does not|it is not|it does not|it cannot|i do not think so|probably not|not really|nahi|nahin|nai|non|nein|nyet|no way|not at all|hardly)\b/;
const MAYBE = /^(?:maybe|idk|i do not know|not sure|dunno|do not know|sometimes|kind of|kinda|sort of|depends|it depends|partially|partly|unsure|no idea|possibly|perhaps|who knows)\b/;

/** 'yes' | 'no' | 'maybe' | null for free-text answers to a yes/no question. */
export function parseYesNo(text) {
  const raw = String(text ?? '').trim();
  if (/^(?:👍|✅|✔|🙆)/u.test(raw)) return 'yes';
  if (/^(?:👎|❌|🙅)/u.test(raw)) return 'no';
  if (/^(?:🤷|🤔)/u.test(raw)) return 'maybe';
  const p = plain(raw);
  if (!p) return null;
  if (NO.test(p) && !/^not sure\b/.test(p)) return 'no';
  if (MAYBE.test(p)) return 'maybe';
  if (YES.test(p)) return 'yes';
  return null;
}

/** Compact form for comparing answers: lowercase letters and digits only. */
export const squash = (s) => plain(s).replace(/\b(?:the|a|an)\b/g, '').replace(/\s+/g, '');

/** True when `input` names `answer` closely enough (typos allowed). */
export function answerMatches(input, answer) {
  const a = squash(answer);
  const i = squash(input);
  if (!a || !i) return false;
  if (i === a || i.includes(a)) return true;
  if (a.length >= 5 && similarity(i, a) >= 0.8) return true;
  // Any single word in the input matching the answer with a typo or two.
  return plain(input).split(' ').some((w) => w.length >= 4 && fuzzyEquals(w, a));
}

export const nudgeLine = (text) => `_${text}_`;

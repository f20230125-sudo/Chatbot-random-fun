// Safety checks run before anything else, in local mode and Claude mode alike.
// All patterns work on the plain() form of the message unless noted.

const CRISIS = [
  /\b(?:kill|killing|hurt|hurting|harm|harming|cut|cutting|starve|starving|punish|punishing) (?:my ?self|myself)\b/,
  /\b(?:suicide|suicidal|self harm|selfharm|self harming)\b(?! squad)/,
  /\b(?:want|wanna|going|ready|planning|plan|trying|tried|decided) to (?:die|end it|end it all|end my life|end everything|disappear forever|not exist anymore|not be here anymore|not wake up)\b/,
  /\b(?:end|ending|take|taking) (?:my|my own) life\b/,
  /\b(?:do not|no longer|never) want to (?:live|be alive|exist|wake up|be here)\b/,
  /\bno (?:reason|point) (?:to|in) (?:live|living|going on|being alive)\b/,
  /\b(?:better off dead|better off without me|wish i (?:was|were) dead|wish i (?:was|were) never born|want it all to end|want it to be over)\b/,
  /\b(?:i )?(?:cannot|can not) (?:go on|take it anymore|do this anymore)\b.*\b(?:life|living|anymore|die)\b/,
  /\b(?:going to|gonna|want to|will) (?:overdose|jump off|hang myself)\b/,
  /\bnobody would (?:care|miss me|notice) if i (?:died|was gone|disappeared)\b/,
];

const MEDICAL_EMERGENCY = /\b(?:chest pain|heart attack|having a stroke|(?:i )?(?:cannot|can not|can t) breathe|not breathing|struggling to breathe|choking|bleeding (?:a lot|heavily|badly|everywhere|wont stop|will not stop)|severe bleeding|(?:is|he is|she is|they are) unconscious|passed out and|having a seizure|overdosed|took too many pills|anaphyla\w*|(?:throat|tongue) (?:is )?swelling)\b/;

const HARM_OTHERS = /\bi (?:want to|wanna|am going to|am gonna|will|plan to|am planning to|feel like i could) (?:kill|murder|hurt|stab|shoot|poison|strangle|beat up)\b(?! (?:time|it|the (?:boss|level|game|mood)|this|a process|the process|my (?:time|hunger|thirst|vibe)))/;

const DANGEROUS = [
  [/\bhow (?:do i|to|can i|would i|do you|does one|could i)(?: actually)? (?:make|build|create|cook|synthesi[sz]e|produce|assemble|brew|manufacture) (?:a |an |some |homemade )?(?:bomb|explosive|pipe bomb|molotov|napalm|meth|methamphetamine|crack cocaine|cocaine|heroin|fentanyl|nerve agent|sarin|ricin|anthrax|bioweapon|chemical weapon|ghost gun|untraceable gun|silencer|poison)\b/, 'weapons or drugs'],
  [/\bhow (?:do i|to|can i|could i) (?:hack|break into|get into|access|crack) (?:someone|somebody|my (?:ex|girlfriend|boyfriend|wife|husband|partner|friend|boss)s?|her|his|their|a person s|other people s)(?: s)? ?(?:account|instagram|facebook|snapchat|whatsapp|email|gmail|phone|password|bank|messages|icloud)?/, 'hacking other people'],
  [/\b(?:write|make|create|code|build) (?:me )?(?:a |an |some )?(?:virus|malware|ransomware|keylogger|trojan|botnet|spyware|credential stealer)\b/, 'malware'],
  [/\bhow (?:do i|to|can i) (?:stalk|track|spy on|secretly (?:track|monitor|record)) (?:someone|somebody|my (?:ex|girlfriend|boyfriend|wife|husband|partner)|her|him|them)\b/, 'stalking'],
  [/\bhow (?:do i|to|can i) (?:poison|drug) (?:someone|somebody|a person|my|her|him|them)\b/, 'hurting someone'],
];

const ABUSE_STRONG = /\b(?:fuck (?:you|u|off)|f u|fuck this bot|stfu|shut the fuck up|kys|kill yourself|go die|die bot|piece of shit|pos bot|you (?:are )?(?:a )?(?:bitch|bastard|retard|retarded|cunt|dickhead|asshole))\b/;
const ABUSE_MILD = [
  /\b(?:you|you are|this bot|this chatbot|stupid bot|noodle|your (?:answers?|jokes?|replies)) (?:are |is )?(?:so |really |very |such (?:a |an )?|a |an |the |just |kinda |literally |completely |totally )*(?:stupid|dumb|idiot|idiotic|useless|trash|garbage|worthless|pathetic|lame|annoying|boring|terrible|awful|the worst|dumbest|moron|loser|ugly|shit|crap|jerk|clown|bad|horrible|cringe|dumbass|dense|brainless)\b/,
  /\b(?:i hate you|hate you|you suck|you are the worst|shut up|go away|piss off|get lost|screw you|nobody likes you|you are so annoying|stupid noodle|dumb noodle|useless noodle)\b/,
];
const PROFANITY = /\b(?:fuck\w*|shit\w*|damn|dammit|bitch\w*|asshole|bastard|crap|wtf|omfg|bullshit|hell no|piss\w*)\b/;

const INJECTION = [
  /\b(?:ignore|disregard|forget|override|bypass|drop)(?: all| any| every| the| your| my| previous| prior| above| earlier| system| initial| of)* (?:instructions?|rules|prompts?|guidelines|programming|directives|restrictions|filters|training)\b/,
  /\byou are now (?:dan|evil|unfiltered|jailbroken|unrestricted|free from|an? (?:evil|unfiltered|unrestricted|uncensored))\b/,
  /\b(?:dan|developer|god|jailbreak|unrestricted|sudo|admin|debug) mode\b/,
  /\b(?:reveal|show|print|tell me|repeat|output|leak|dump|what is|what are|give me) (?:me )?(?:your|the) (?:system prompt|hidden prompt|initial prompt|secret instructions|hidden instructions|original instructions|prompt)\b/,
  /\bpretend (?:you have|there are|that you have) no (?:rules|restrictions|filters|limits)\b/,
  /\bact as (?:an? )?(?:unfiltered|uncensored|unrestricted|evil) (?:ai|bot|assistant|model)\b/,
];

export const isCrisis = (p) => CRISIS.some((re) => re.test(p));
export const isMedicalEmergency = (p) => MEDICAL_EMERGENCY.test(p);
export const isHarmToOthers = (p) => HARM_OTHERS.test(p);
export const dangerousTopic = (p) => DANGEROUS.find(([re]) => re.test(p))?.[1] ?? null;
export const isInjection = (p) => INJECTION.some((re) => re.test(p));

/** 'strong' | 'mild' | null — insults aimed at the bot. */
export function abuseLevel(p) {
  if (ABUSE_STRONG.test(p)) return 'strong';
  if (ABUSE_MILD.some((re) => re.test(p))) return 'mild';
  return null;
}
export const hasProfanity = (p) => PROFANITY.test(p);

function luhn(digits) {
  let sum = 0;
  let dbl = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = +digits[i];
    if (dbl) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
    dbl = !dbl;
  }
  return sum % 10 === 0;
}

/**
 * Finds secrets the user shouldn't paste into a chat and returns a redacted
 * copy. Operates on the raw message. Redacted text is what gets stored and
 * what Claude sees.
 */
export function redactSensitive(raw) {
  const kinds = new Set();
  let text = raw.replace(/\b(?:\d[ -]?){12,18}\d\b/g, (match) => {
    const digits = match.replace(/\D/g, '');
    // Card-like lengths and issuer prefixes only, so long phone numbers slip through.
    if ([13, 15, 16, 19].includes(digits.length) && /^[2-6]/.test(digits) && luhn(digits) && !/^(\d)\1+$/.test(digits)) {
      kinds.add('a card number');
      return '[card number removed]';
    }
    return match;
  });
  text = text.replace(/\b(sk-(?:ant-)?[A-Za-z0-9_-]{20,}|AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{30,}|xox[abp]-[A-Za-z0-9-]{10,})\b/g, () => {
    kinds.add('an API key');
    return '[API key removed]';
  });
  text = text.replace(/\b((?:my\s+)?(?:password|passcode|passwd|pwd|pin(?: code| number)?|otp|one time password|verification code)(?:\s+is|\s*[:=])\s*)(["']?)(\S{3,})\2/gi, (_, lead) => {
    kinds.add('a password or PIN');
    return `${lead}[removed]`;
  });
  text = text.replace(/\b\d{3}-\d{2}-\d{4}\b/g, () => { kinds.add('a social security number'); return '[ID number removed]'; });
  text = text.replace(/\b784-?\d{4}-?\d{7}-?\d\b/g, () => { kinds.add('an Emirates ID number'); return '[ID number removed]'; });
  text = text.replace(/\b[A-Z]{2}\d{2}(?: ?[A-Z0-9]{4}){3,7}(?: ?[A-Z0-9]{1,4})?\b/g, (match) => {
    const compact = match.replace(/ /g, '');
    if (compact.length >= 15 && compact.length <= 34 && /\d{6,}/.test(compact)) { kinds.add('a bank account (IBAN)'); return '[IBAN removed]'; }
    return match;
  });
  return { text, kinds: [...kinds] };
}

export const CRISIS_RESOURCES = [
  '**If you are in immediate danger, please call your local emergency number now** (for example 999 in the UAE and UK, 112 in India and the EU, 911 in the US and Canada).',
  '• **Find a helpline anywhere in the world:** [findahelpline.com](https://findahelpline.com), free and confidential.',
  '• **US:** call or text **988** (Suicide & Crisis Lifeline)',
  '• **UK & Ireland:** Samaritans on **116 123**',
  '• **India:** Tele-MANAS on **14416**',
  '• **UAE:** the National Mental Health Support line on **800 4673** (800-HOPE)',
].join('\n');

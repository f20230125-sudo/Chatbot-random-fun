// Emotional support. These run before jokes and small talk so that "I'm sad"
// never gets a pun back. `support` puts the bot into listening mode for a few
// turns; with Claude connected, feelings are answered by Claude.

export const FEELINGS = [
  {
    id: 'grief',
    re: /\bmy (?:mom|mum|mother|dad|father|grandma|grandmother|nana|grandpa|grandfather|dog|cat|pet|best friend|friend|brother|sister|son|daughter|wife|husband|uncle|aunt|cousin|puppy|kitten|hamster|bird|fish|teacher|baby) (?:just )?(?:passed away|died|is dead|passed)\b|\b(?:lost|losing) my (?:mom|mum|mother|dad|father|grandma|grandmother|grandpa|grandfather|dog|cat|pet|best friend|brother|sister|son|daughter|wife|husband|baby)\b|\bfuneral\b|\bgrieving\b|\bin mourning\b/,
    replies: ["I'm so sorry. 💛 Losing someone you love is one of the hardest things there is. There's no right way to feel. If you want to tell me about them, I'd really like to hear.", "I'm really sorry for your loss. 💛 Grief can come in waves, so be gentle with yourself. I'm here if you want to talk about them, or about anything at all."],
    mood: 'caring', support: true, chips: ['I want to talk about them', 'Can you just distract me?'],
  },
  {
    id: 'heartbreak',
    re: /\b(?:broke up|break up with me|breakup|dumped me|got dumped|heartbroken|heart broken|broken heart|(?:girlfriend|boyfriend|partner|wife|husband|crush) (?:left|dumped|rejected) me|cheated on me|she left me|he left me|they left me|my crush does not like me)\b/,
    replies: ["Oh no. I'm really sorry. 💔 Breakups hurt like crazy, even when they're for the best. Do you want to vent about it, or would a distraction help more?", "💔 That's rough. Your feelings are completely valid. Be kind to yourself, eat something nice, and remember: you're more than one relationship. Want to talk, or shall I distract you?"],
    mood: 'caring', support: true, chips: ['I want to vent', 'Distract me', 'Tell me a joke'],
  },
  {
    id: 'sad',
    re: /\bi (?:am|feel|am feeling|have been feeling|have been|been|feel so|am so|m) (?:so |really |very |kind of |kinda |pretty |a bit |a little |just |super |extremely )?(?:sad|down|depressed|unhappy|miserable|blue|low|upset|awful|terrible|horrible|empty|hopeless|crappy|like crap|like shit|bad|not (?:ok|okay|good|great|fine|well)|broken|numb|lost|worthless|useless|like a failure)\b|\bhate my life\b|\b(?:bad|terrible|awful|horrible|rough|worst) day\b|\bfeeling down\b|\bi am crying\b|\bi cried\b|\bi want to cry\b|\bnot having a good (?:day|time)\b|^(?:sad|so sad|depressed|upset|miserable|not okay|not ok|heartbroken|devastated)$/,
    replies: ["I'm sorry you're feeling this way. 💛 Do you want to tell me what's going on? I'm a good listener, and I've got all the time in the world.", "That sounds really hard. 💛 You don't have to go through it alone. Want to talk about it, or would something to take your mind off it help?", "Sending you a big warm noodle hug. 🤗 What's been happening?"],
    mood: 'caring', support: true, chips: ['I want to talk', 'Cheer me up', 'Breathing exercise'],
  },
  {
    id: 'lonely',
    re: /\b(?:i am|i feel|feeling|so|very|really|i m) (?:so |very |really )?(?:lonely|alone|isolated|left out|invisible)\b|\bno (?:one|body) (?:likes|loves|cares about|talks to|understands) me\b|\bi (?:have|got) no friends\b|\bi do not have (?:any )?friends\b/,
    replies: ["I'm really glad you're talking to me. 💛 Feeling lonely is tough, and a lot more people feel it than you'd think. I'm right here. Want to chat for a bit?", "You're not alone right now: I'm here, and I'm happy you are too. 🤗 Tell me about your day? Or we could play something together."],
    mood: 'caring', support: true, chips: ['Tell me about your day', 'Play a game together'],
  },
  {
    id: 'anxious',
    re: /\bi (?:am|feel|am feeling|m) (?:so |really |very |super |kind of |kinda |a bit |a little )?(?:stressed|anxious|nervous|worried|overwhelmed|panicking|panicky|on edge|tense|scared about)\b|\b(?:stressed out|freaking out|panic attack|having a panic|anxiety attack|so much stress|too much stress|burn(?:ed|t) out|burnout|overthinking|cannot stop worrying|can not stop worrying)\b|\b(?:exam|exams|test|interview|presentation|deadline) (?:is )?(?:tomorrow|today|tonight|next week|soon|coming up)\b/,
    replies: ["That sounds like a lot. 💛 Let's slow down for a second: want to try a one-minute breathing exercise with me? It genuinely helps. Or tell me what's on your mind.", "Stress is your brain trying to help, just a bit too enthusiastically. 😮‍💨 One thing at a time: what's the very next small step? I can also set a focus timer or do a breathing exercise with you."],
    mood: 'caring', support: true, chips: ['Breathing exercise', 'Set a 25 minute timer', 'Motivate me'],
  },
  {
    id: 'angry',
    re: /\bi (?:am|feel|m) (?:so |really |very |super |extremely )?(?:angry|mad|furious|pissed|pissed off|annoyed|irritated|frustrated|fuming|livid|raging)\b|\bso (?:angry|mad|annoyed|frustrated)\b|\bthis is so frustrating\b/,
    replies: ["Ugh, that sounds frustrating. 😤 Want to vent? I won't judge, and I can't gossip because I don't know anyone else. 😄", "Totally valid to be angry. 💢 Sometimes it helps to let it all out. What happened?"],
    mood: 'caring', support: true, chips: ['I want to vent', 'Breathing exercise', 'Distract me'],
  },
  {
    id: 'setback',
    re: /\bi (?:just )?(?:failed|flunked|bombed|lost my job|got fired|got laid off|was laid off|got rejected|was rejected|did not get (?:the|in|into)|did not pass|messed up|screwed up|ruined everything)\b/,
    replies: ["Oof, I'm sorry. 😔 That really stings. But one setback doesn't define you: lots of amazing people failed loads before they got there. Want to talk it through?", "That's genuinely disappointing, and it's okay to feel gutted. 💛 Give yourself a moment. When you're ready, we can figure out a next step together, or I can just distract you."],
    mood: 'caring', support: true, chips: ['Motivate me', 'I want to talk', 'Distract me'],
  },
  {
    id: 'tired',
    re: /\bi (?:am|feel|m) (?:so |really |very |super |extremely |kinda |kind of )?(?:tired|exhausted|sleepy|drained|worn out|knackered|burnt|dead tired|wiped out)\b|^(?:tired|so tired|sleepy|exhausted)$/,
    replies: ["Sounds like you need a recharge. 😴 Water, a snack, and some rest if you can. Your noodle deserves a break!", "Tired brains need care. 🫖 Could you take a 10-minute break? I'll set a timer if you want."],
    mood: 'sleepy', chips: ['Set a 10 minute timer', 'Tell me a bedtime story'],
  },
  {
    id: 'cantsleep',
    re: /\b(?:cannot|can not) (?:fall )?(?:sleep|asleep)\b|\binsomnia\b|\bunable to sleep\b|\btrouble sleeping\b|\bwhy am i (?:still )?awake\b/,
    replies: ["Can't sleep? 🌙 A few things that help: dim your screen (hi 👋), try slow breathing, and put your phone out of reach. Want a calm bedtime story first?"],
    mood: 'sleepy', chips: ['Tell me a bedtime story', 'Breathing exercise'],
  },
  {
    id: 'bored',
    re: /\b(?:i am|i m|im|so|very|really|super|feeling|getting|kinda) bored\b|^bored$|\bnothing to do\b|\bi have nothing to do\b|\bentertain me\b|\bamuse me\b/,
    replies: ['BORED? In MY chat? Not on my watch. 😤 Pick one:', "Let's fix that right now! 🎉 How about:"],
    mood: 'excited', chips: ['Play a game', 'Surprise me', 'Tell me a joke', 'Give me a challenge'],
  },
  {
    id: 'good-news',
    re: /\bi (?:just )?(?:passed|aced|got the job|got a job|got hired|got promoted|got a promotion|won|got in|got into|got accepted|graduated|finished|did it|got engaged|got married|had a baby|got a (?:puppy|kitten|dog|cat)|bought a (?:car|house))\b|\bgood news\b|\bguess what\b/,
    replies: ["🎉 **Congratulations!!** That's amazing news! Tell me everything!", "No way! 🥳 That's fantastic, you should be really proud. How are you celebrating?"],
    mood: 'excited', actions: [{ type: 'confetti' }],
  },
  {
    id: 'happy',
    re: /\bi (?:am|feel|m) (?:so |really |very |super |pretty |extremely )?(?:happy|great|amazing|awesome|fantastic|good|excellent|wonderful|ecstatic|excited|blessed|on top of the world|fine|well|joyful|cheerful)\b|\b(?:best|great|good|amazing|awesome) day\b|^(?:happy|so happy|very happy|ecstatic|overjoyed)$/,
    replies: ["Yay! 😄 Love that for you. What's making today good?", "That's the best news! ✨ Happiness is contagious, I'm smiling too. 😊", "Woohoo! 🎉 Keep that energy going!"],
    mood: 'happy',
  },
  {
    id: 'sick',
    re: /\bi (?:am|feel|m) (?:so |really |very |a bit |kinda )?(?:sick|ill|unwell|not well|feverish|nauseous|under the weather)\b|\bi have (?:a |the )?(?:cold|flu|fever|headache|migraine|stomach ?ache|sore throat|covid|cough|toothache|backache)\b|\bi (?:got|caught) (?:a |the )?(?:cold|flu|covid)\b/,
    replies: ["Oh no, feel better soon! 🤒 Rest, fluids and something warm usually help. If it's severe, lasts more than a few days, or you're worried, please check with a doctor. I'm a noodle, not a nurse! 💛"],
    mood: 'caring', chips: ['Tell me a joke', 'Tell me a story'],
  },
  {
    id: 'hungry',
    re: /\bi (?:am|m) (?:so |really |very )?(?:hungry|starving|famished|peckish)\b|\bwhat should i (?:eat|have|cook|order)\b|\bwhat (?:should|can) i (?:have|make|cook|order) for (?:dinner|lunch|breakfast|a snack)\b|\bi do not know what to eat\b/,
    replies: 'FOOD',
    mood: 'excited',
  },
  {
    id: 'scared',
    re: /\bi (?:am|feel|m) (?:so |really |very )?(?:scared|afraid|frightened|terrified|spooked)\b|\bi had a (?:nightmare|bad dream)\b/,
    replies: ["It's okay, I'm here. 💛 Do you want to tell me what's scaring you? Sometimes saying it out loud makes it smaller.", "That sounds scary. 🫂 You're safe here with me. Want to talk about it, or want something cosy to think about instead?"],
    mood: 'caring', support: true, chips: ['I want to talk', 'Tell me something nice'],
  },
  {
    id: 'unmotivated',
    re: /\b(?:no motivation|unmotivated|procrastinating|procrastination|i do not want to (?:study|work|do (?:my )?homework|do anything)|cannot focus|can not focus|cant focus|i keep getting distracted)\b/,
    replies: ["Classic procrastination. 😅 Trick: commit to just **5 minutes**. Starting is the hardest part, and momentum does the rest. Want me to start a 25-minute focus timer? (Pomodoro style! 🍅)"],
    mood: 'playful', chips: ['Set a 25 minute timer', 'Motivate me'],
  },
  {
    id: 'talk',
    re: /\b(?:i (?:just )?need (?:someone )?to talk|can we (?:just )?talk|i need someone to talk to|i want to talk|i want to vent|let me vent|just listen|can you listen|i need a friend|talk to me)\b/,
    replies: ["I'm here, and I'm listening. 💛 Take your time and tell me whatever's on your mind.", "Of course. I'm all ears. 👂 What's going on?"],
    mood: 'caring', support: true, brainPrefer: true,
  },
];

export const LISTENING = [
  "That makes a lot of sense. 💛 How long have you been feeling like this?",
  "Thank you for telling me. That sounds really hard. What do you think would help, even a little?",
  "I hear you. 💛 You're allowed to feel exactly how you feel. Is there someone in your life you could share this with too?",
  "Mm. 💛 Go on, I'm listening.",
  "That's a lot to carry. Be gentle with yourself today. Is there one small kind thing you could do for yourself right now?",
  "I'm really glad you're sharing this with me. 💛 What's been the hardest part?",
];

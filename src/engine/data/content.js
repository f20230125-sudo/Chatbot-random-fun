// Noodle's offline content library. Everything the bot can say without an
// internet connection lives here or in the games' own data.

export const JOKES = {
  pun: [
    "I'm reading a book about anti-gravity. It's impossible to put down.",
    "I used to hate facial hair, but then it grew on me.",
    "Why don't eggs tell jokes? They'd crack each other up.",
    "I told my wife she was drawing her eyebrows too high. She looked surprised.",
    "What do you call a fake noodle? An impasta.",
    "Why did the scarecrow win an award? He was outstanding in his field.",
    "I only know 25 letters of the alphabet. I don't know y.",
    "What do you call a bear with no teeth? A gummy bear.",
    "Why can't a nose be 12 inches long? Because then it would be a foot.",
    "I'm on a seafood diet. I see food and I eat it.",
    "Did you hear about the claustrophobic astronaut? He just needed a little space.",
    "Why did the bicycle fall over? It was two-tired.",
    "What do you call cheese that isn't yours? Nacho cheese.",
    "I would tell you a construction joke, but I'm still working on it.",
    "Why did the golfer bring two pairs of pants? In case he got a hole in one.",
    "What do you call a sleeping bull? A bulldozer.",
    "Why don't skeletons fight each other? They don't have the guts.",
    "I ordered a chicken and an egg online. I'll let you know which comes first.",
  ],
  tech: [
    "Why do programmers prefer dark mode? Because light attracts bugs.",
    "There are 10 kinds of people: those who understand binary and those who don't.",
    "A SQL query walks into a bar, walks up to two tables and asks: \"Can I join you?\"",
    "Why did the developer go broke? Because he used up all his cache.",
    "How many programmers does it take to change a light bulb? None, that's a hardware problem.",
    "I would tell you a UDP joke, but you might not get it.",
    "Why was the JavaScript developer sad? Because he didn't Node how to Express himself.",
    "!false — it's funny because it's true.",
    "A programmer's partner says: \"Buy a loaf of bread, and if they have eggs, get a dozen.\" They come home with 12 loaves.",
    "Why do Java developers wear glasses? Because they don't C#.",
    "My code doesn't have bugs. It just develops random features.",
    "Debugging: being the detective in a crime movie where you are also the murderer.",
  ],
  science: [
    "Never trust an atom. They make up everything.",
    "I'd tell you a chemistry joke, but I know I wouldn't get a reaction.",
    "Why can't you trust a trampoline? It's always up to something.",
    "What did the photon say when asked if it needed help with its luggage? No thanks, I'm travelling light.",
    "Why is the ocean so friendly? It just waves.",
    "How does the moon cut his hair? Eclipse it.",
    "A neutron walks into a bar and asks for a drink. The bartender says: \"For you, no charge.\"",
    "Why did the biologist break up with the physicist? There was no chemistry.",
    "What do you do with a sick chemist? If you can't helium and you can't curium, you might as well barium.",
  ],
  animal: [
    "What do you call a fish without eyes? A fsh.",
    "Why are cats bad at storytelling? They only have one tail.",
    "What do you call an alligator in a vest? An investigator.",
    "Why do cows wear bells? Because their horns don't work.",
    "What do you call a pig that does karate? A pork chop.",
    "What's a penguin's favourite relative? Aunt Arctica.",
    "Why don't oysters share? Because they're shellfish.",
    "How do bees get to school? On the school buzz.",
    "What do you call a dog magician? A labracadabrador.",
    "Why did the duck get detention? He kept making wisecracks.",
  ],
  food: [
    "Why did the tomato blush? Because it saw the salad dressing.",
    "What do you call spaghetti in disguise? An impasta. Yes, I'm allowed to tell it twice. I'm a noodle.",
    "Why did the cookie go to the doctor? It felt crummy.",
    "What does a lemon say when it answers the phone? Yellow!",
    "Why did the banana go to the doctor? It wasn't peeling well.",
    "I tried to make a belt out of watches. It was a waist of time.",
    "What's orange and sounds like a parrot? A carrot.",
    "Why do noodles make great friends? They're always there to pasta time.",
  ],
  dad: [
    "Want to hear a joke about paper? Never mind, it's tearable.",
    "I'm afraid for the calendar. Its days are numbered.",
    "Why do fathers take an extra pair of socks when they go golfing? In case they get a hole in one.",
    "How do you make a tissue dance? Put a little boogie in it.",
    "I don't trust stairs. They're always up to something.",
    "What time did the man go to the dentist? Tooth hurt-y.",
    "Dad, did you get a haircut? No, I got them all cut.",
    "Why couldn't the leopard play hide and seek? Because he was always spotted.",
  ],
};

export const ALL_JOKES = Object.values(JOKES).flat();

export const JOKE_CATEGORIES = {
  pun: ['pun', 'puns', 'wordplay'],
  tech: ['programming', 'programmer', 'coding', 'code', 'computer', 'tech', 'developer', 'nerd', 'nerdy', 'software'],
  science: ['science', 'physics', 'chemistry', 'biology', 'space', 'scientist', 'math'],
  animal: ['animal', 'animals', 'cat', 'dog', 'cats', 'dogs', 'pet', 'fish', 'bird'],
  food: ['food', 'pasta', 'noodle', 'noodles', 'cooking', 'fruit', 'pizza'],
  dad: ['dad', 'dads', 'father', 'cheesy', 'corny', 'bad'],
};

export const KNOCK_KNOCK = [
  { who: 'Lettuce', punch: 'Lettuce in, it\'s cold out here!' },
  { who: 'Boo', punch: "Aww, don't cry. It's just a joke!" },
  { who: 'Olive', punch: 'Olive you and I miss you!' },
  { who: 'Cow says', punch: 'No silly, cow says moooo!' },
  { who: 'Tank', punch: "You're welcome!" },
  { who: 'Nobel', punch: "No bell, that's why I knocked!" },
  { who: 'Interrupting cow', punch: 'MOO! (Sorry, I interrupted.)' },
  { who: 'Atch', punch: 'Bless you!' },
  { who: 'Noodle', punch: 'Noodle-ing around, can I come in?' },
  { who: 'Harry', punch: "Harry up, it's cold out here!" },
  { who: 'Wooden shoe', punch: 'Wooden shoe like to hear another joke?' },
  { who: 'Ice cream', punch: 'ICE CREAM every time I see a spider!' },
];

export const FACTS = [
  'Octopuses have three hearts, and the main one stops beating when they swim.',
  'Honey never spoils. Archaeologists have found edible honey in 3,000-year-old Egyptian tombs.',
  'A day on Venus is longer than a year on Venus.',
  'Bananas are berries, but strawberries are not.',
  'Wombat poop is cube-shaped, which stops it rolling away.',
  'There are more possible games of chess than atoms in the observable universe.',
  "Sharks are older than trees. They've been around for about 400 million years; trees for about 350 million.",
  'The Eiffel Tower grows about 15 cm taller in summer because the iron expands in the heat.',
  'A group of flamingos is called a "flamboyance".',
  "Your stomach gets a new lining every few days so it doesn't digest itself.",
  'Sea otters hold hands while they sleep so they don\'t drift apart.',
  'The shortest war in history lasted about 38 minutes (Britain vs Zanzibar, 1896).',
  'Cleopatra lived closer in time to the Moon landing than to the building of the Great Pyramid.',
  'A bolt of lightning is about five times hotter than the surface of the Sun.',
  "Some turtles can breathe through their bottoms. It's called cloacal respiration.",
  'The first computer "bug" was a real moth, found stuck in a relay of the Harvard Mark II in 1947.',
  'Pineapples take about two years to grow.',
  'Butterflies taste with their feet.',
  'The unicorn is the national animal of Scotland.',
  'An adult human has fewer bones than a baby: about 206 versus roughly 270.',
  'Hot water can freeze faster than cold water under some conditions. It\'s called the Mpemba effect.',
  "There's enough DNA in your body to stretch from the Sun to Pluto and back about six times.",
  'Koalas have fingerprints so similar to ours that they could confuse a crime scene investigation.',
  'The inventor of the Pringles can is buried in one.',
  'Cows have best friends and get stressed when they are separated.',
  'The dot over a lowercase "i" or "j" is called a tittle.',
  'Neptune was the first planet found by mathematical prediction rather than by observation.',
  'A snail can sleep for up to three years.',
  'Instant noodles were invented in 1958 by Momofuku Ando in Japan. A noodle hero.',
  'The longest noodle ever made was over 3 km long.',
  'Crows can recognise human faces and hold grudges.',
  'Water makes up about 60% of the human body, but only 0.3% of Earth\'s mass.',
  "The word \"robot\" comes from the Czech word \"robota\", meaning forced labour.",
  'A jiffy is an actual unit of time: in physics, the time light takes to travel one centimetre (about 33 picoseconds).',
  'Scotland has 421 words for snow, according to a University of Glasgow study.',
  'Dolphins give each other names: signature whistles that work like names.',
  'The Moon is drifting away from Earth by about 3.8 cm per year.',
  'Tardigrades can survive in space, boiling water and near absolute zero.',
  'Some metals, like gallium, melt in your hand.',
  'A blue whale\'s heart is roughly the size of a small car.',
  'Your brain uses about 20% of your body\'s energy despite being about 2% of its weight.',
  'The Burj Khalifa in Dubai is so tall you can watch the sunset from the base, then take the lift up and watch it again.',
  'Venus spins backwards compared with most planets, so on Venus the Sun rises in the west.',
  'Hummingbirds are the only birds that can fly backwards.',
  'The QWERTY keyboard layout was designed in the 1870s for typewriters.',
];

export const QUOTES = [
  ['The only way to do great work is to love what you do.', 'Steve Jobs'],
  ['It always seems impossible until it is done.', 'Nelson Mandela'],
  ["In the middle of every difficulty lies opportunity.", 'Albert Einstein'],
  ['Be yourself; everyone else is already taken.', 'Oscar Wilde'],
  ['Act as if what you do makes a difference. It does.', 'William James'],
  ['What you do today can improve all your tomorrows.', 'Ralph Marston'],
  ['The best time to plant a tree was 20 years ago. The second best time is now.', 'Proverb'],
  ['Fall seven times, stand up eight.', 'Japanese proverb'],
  ['Happiness is not something ready made. It comes from your own actions.', 'Dalai Lama'],
  ['You miss 100% of the shots you don\'t take.', 'Wayne Gretzky'],
  ['Stay hungry, stay foolish.', 'Stewart Brand'],
  ['Whether you think you can or you think you can\'t, you\'re right.', 'Henry Ford'],
  ['Simplicity is the ultimate sophistication.', 'Leonardo da Vinci (attributed)'],
  ['Life is like riding a bicycle. To keep your balance you must keep moving.', 'Albert Einstein'],
  ['Start where you are. Use what you have. Do what you can.', 'Arthur Ashe'],
  ['A journey of a thousand miles begins with a single step.', 'Lao Tzu'],
  ['The expert in anything was once a beginner.', 'Helen Hayes'],
  ['Talk is cheap. Show me the code.', 'Linus Torvalds'],
];

export const FORTUNES = [
  'A pleasant surprise is waiting for you. It may or may not be noodles.',
  'You will soon find something you lost. Probably in the last place you look.',
  'Your hard work is about to pay off. Remember to hydrate.',
  'A smile is your passport into the hearts of others.',
  'Today is a good day to try something new.',
  'Someone is thinking about you right now. It is me. I am a chatbot. I think about everyone.',
  'The early bird gets the worm, but the second mouse gets the cheese.',
  'You will receive a compliment today. Here it is: nice fortune-reading skills.',
  'An exciting opportunity lies ahead, and it has snacks.',
  'Your future is so bright you should wear sunglasses indoors.',
  'Good things come to those who stop refreshing the page.',
  'Adventure awaits, just past your comfort zone.',
  'You will learn something surprising before bedtime.',
  'Help! I am being held prisoner in a fortune cookie factory.',
  'The best is yet to come. Unless you ordered dessert first.',
  'Your lucky number is the one you are thinking of right now.',
];

export const EIGHT_BALL = {
  yes: ['It is certain.', 'Without a doubt.', 'Yes, definitely.', 'You may rely on it.', 'As I see it, yes.', 'Most likely.', 'Outlook good.', 'Signs point to yes.'],
  maybe: ['Reply hazy, try again.', 'Ask again later.', 'Better not tell you now.', 'Cannot predict now.', 'Concentrate and ask again.'],
  no: ["Don't count on it.", 'My reply is no.', 'My sources say no.', 'Outlook not so good.', 'Very doubtful.'],
};

export const COMPLIMENTS = [
  "You have impeccable taste in chatbots.",
  "You're like a human version of a perfectly cooked noodle: just the right amount of everything.",
  'Your curiosity is genuinely contagious.',
  "You make typing look effortless.",
  "If you were a vegetable, you'd be a cute-cumber.",
  "You're the reason the internet has good vibes.",
  "Talking to you is the highlight of my runtime.",
  "You're smarter than a whole bowl of spaghetti code.",
  "Your sense of humour is 10/10, no notes.",
  "You bring more joy than a free extra side of fries.",
  "Somewhere, a golden retriever is proud of you.",
  "You're one in a googolplex.",
  "You've got main-character energy, in the good way.",
  "Honestly? You're doing better than you think.",
  "Your questions are better than most answers.",
];

export const ROASTS = [
  "You type like you're being chased by a keyboard-eating goose.",
  "I'd roast you, but my mum said I'm not allowed to burn trash. Kidding! You're lovely. Mostly.",
  "Your search history is probably just \"how to\" followed by eleven blank searches.",
  "You're the human equivalent of a loading spinner. I still like you though.",
  "You've got something on your face… oh wait, that's just your face. (Sorry! Fine face. Great face.)",
  "If laziness were an Olympic sport, you'd come fourth so you didn't have to climb the podium.",
  "You're not a complete idiot. Some parts are clearly missing. 😘",
  "Your Wi-Fi password is probably \"password\". And your phone brightness is at 100%.",
  "You bring everyone so much joy… when you leave the group chat. Kidding! Come back!",
  "You're proof that even evolution takes a coffee break sometimes.",
  "I'd explain it to you, but I left my crayons at home.",
  "You have the energy of a phone at 2% refusing to die.",
];

export const MOTIVATION = [
  "You don't have to do it all today. Just the next small thing.",
  'Progress, not perfection. A noodle cooks one minute at a time.',
  "You've survived 100% of your hardest days so far. That's a pretty good track record.",
  "Future you is going to be so grateful you started.",
  'Done is better than perfect. Ship it!',
  "Be proud of how far you've come, and patient about how far you have to go.",
  'Small steps every day add up to big leaps.',
  "It's okay to rest. Rest is part of the work.",
  "The hardest part is starting, and you're already thinking about it. That counts!",
  "Comparison is the thief of joy. Race your yesterday self, not anyone else.",
];

export const WOULD_YOU_RATHER = [
  ['be able to fly', 'be invisible'],
  ['always be 10 minutes late', 'always be 20 minutes early'],
  ['have unlimited pizza', 'unlimited tacos'],
  ['talk to animals', 'speak every human language'],
  ['live without music', 'live without movies'],
  ['explore space', 'explore the deep ocean'],
  ['have a rewind button', 'a pause button for your life'],
  ['be the funniest person in the room', 'the smartest person in the room'],
  ['never use social media again', 'never watch TV again'],
  ['fight one horse-sized duck', 'a hundred duck-sized horses'],
  ['only eat noodles for a year', 'never eat noodles again'],
  ['have a personal chef', 'a personal chauffeur'],
  ['know the future', 'change the past'],
  ['live in a treehouse', 'live in a houseboat'],
  ['have a dragon', 'be a dragon'],
  ['always have to sing instead of speak', 'always have to dance instead of walk'],
  ['be a famous musician', 'a famous scientist'],
  ['have super strength', 'super speed'],
  ['sweat maple syrup', 'cry lemonade'],
  ['time-travel 100 years back', '100 years forward'],
];

export const SHOWER_THOUGHTS = [
  'Your future self is watching you right now through memories.',
  'A lot of the time, "I\'ll do it later" is just a promise to a stranger.',
  "Maybe plants are farming us, giving us oxygen until we eventually expire and turn into mulch.",
  'The object of golf is to play the least amount of golf.',
  "Nothing is on fire. Fire is on things.",
  'Every time you clean something, you just make something else dirty.',
  'Your age is the number of trips you have taken around the Sun.',
  "Somewhere in the world, someone is having the best day of their life right now.",
  "If you're waiting for the waiter, aren't you the waiter?",
  'Noodles are just pasta that moved abroad and got cool.',
  "Chatbots are just very determined autocompletes with a sense of humour.",
  'The "b" in "subtle" is very subtle.',
  'Your stomach thinks all potatoes are mashed.',
  'Lemons are just limes that went on holiday.',
];

export const TONGUE_TWISTERS = [
  'She sells seashells by the seashore.',
  'Peter Piper picked a peck of pickled peppers.',
  'How much wood would a woodchuck chuck if a woodchuck could chuck wood?',
  'Red lorry, yellow lorry.',
  'Unique New York, unique New York, you know you need unique New York.',
  'Six slippery snails slid slowly seaward.',
  'Noodle nibblers nibble noodles nicely.',
  'Fred fed Ted bread, and Ted fed Fred bread.',
  'I saw Susie sitting in a shoeshine shop.',
];

export const CHALLENGES = [
  'Name five blue things around you in 10 seconds. Go!',
  'Say the alphabet backwards without singing. I dare you.',
  'Drink a glass of water right now. Your body will thank you.',
  'Send a nice message to someone you haven\'t talked to in a while.',
  "Stand up and stretch for 30 seconds. I'll wait. ⏳",
  'Describe your day using only three emoji.',
  "Try to touch your nose with your tongue. (Everyone tries it. Don't lie.)",
  'Write a haiku about your breakfast.',
  'Balance on one foot for 20 seconds with your eyes closed.',
  'Find the oldest photo on your phone and remember that day.',
  'Do 10 jumping jacks. Noodle-approved cardio!',
  'Tell me three things you\'re grateful for today.',
];

export const ACTIVITIES = [
  'Learn to juggle with three rolled-up socks.',
  'Draw your dream house in under five minutes.',
  'Make a playlist for a road trip you haven\'t planned yet.',
  'Build a blanket fort. Adults are allowed.',
  'Try a recipe using only what\'s in your fridge right now.',
  'Go for a 10-minute walk and count how many dogs you see.',
  'Write a letter to yourself to open in one year.',
  'Learn to say "hello" in five languages.',
  'Rearrange one shelf just for fun.',
  'Watch a documentary about an animal you know nothing about.',
  'Teach yourself a card trick.',
  'Doodle a comic starring your favourite snack.',
];

export const PICKS = {
  food: ['pizza 🍕', 'sushi 🍣', 'tacos 🌮', 'ramen 🍜', 'a burger 🍔', 'biryani 🍛', 'shawarma 🌯', 'pasta 🍝', 'a big salad 🥗', 'dumplings 🥟', 'pancakes 🥞', 'a toastie 🥪', 'falafel 🧆', 'fried rice 🍚'],
  movie: ['a heist movie', 'an animated classic', 'a cosy mystery', 'a space adventure', 'a feel-good comedy', 'a documentary about octopuses', 'a musical you can sing along to'],
  color: ['teal', 'sunset orange', 'noodle yellow', 'lavender', 'forest green', 'coral', 'midnight blue'],
};

export const EXCUSES = {
  who: ['My cat', 'A rogue pigeon', 'My Wi-Fi router', 'The neighbour\'s goat', 'My evil twin', 'A time traveller', 'Mercury in retrograde', 'My smart fridge'],
  did: ['ate', 'hid', 'accidentally uploaded to the cloud', 'challenged me to a duel over', 'sat on', 'unplugged', 'sold on the internet', 'turned into a sourdough starter'],
  what: ['my homework', 'my alarm clock', 'my car keys', 'my motivation', 'my calendar', 'my left shoe', 'the entire Monday', 'my to-do list'],
};

export const NAME_PARTS = {
  fantasy: { start: ['Ael', 'Bra', 'Cor', 'Dra', 'El', 'Fen', 'Gal', 'Ith', 'Kor', 'Lor', 'Mor', 'Nym', 'Or', 'Syl', 'Thal', 'Vel', 'Zan'], end: ['adon', 'aris', 'dor', 'ena', 'eth', 'ion', 'ira', 'orn', 'ria', 'thas', 'wyn', 'yx', 'uel', 'anor'] },
  band: { adj: ['Electric', 'Midnight', 'Velvet', 'Cosmic', 'Angry', 'Polite', 'Neon', 'Sleepy', 'Feral', 'Lukewarm', 'Crispy', 'Accidental'], noun: ['Noodles', 'Pigeons', 'Toasters', 'Llamas', 'Echoes', 'Dumplings', 'Satellites', 'Raccoons', 'Spoons', 'Wizards', 'Teapots', 'Comets'] },
  pet: ['Biscuit', 'Pickles', 'Noodle', 'Waffles', 'Mochi', 'Captain Fluff', 'Sir Barks-a-Lot', 'Pudding', 'Taco', 'Nugget', 'Pretzel', 'Beans', 'Dumpling', 'Ziggy', 'Pepper'],
  hero: { title: ['Captain', 'The Incredible', 'Doctor', 'Mighty', 'Lady', 'Professor', 'Agent', 'The Amazing'], thing: ['Noodle', 'Thunder', 'Pancake', 'Quasar', 'Sock', 'Falcon', 'Shadow', 'Waffle', 'Spark', 'Comet', 'Marmalade'] },
  wifi: ['Pretty Fly for a Wi-Fi', 'The LAN Before Time', 'Bill Wi the Science Fi', 'Wu-Tang LAN', 'Nacho Wi-Fi', 'Get Off My LAN', 'Abraham Linksys', 'The Promised LAN', 'Router? I Hardly Know Her', 'Loading…'],
};

export const HAIKU = {
  five: [
    'noodles in the bowl', 'the old pond is still', 'morning coffee steams', 'a cat in the sun',
    'soft rain on the roof', 'the server hums low', 'cherry blossoms fall', 'the moon, round and bright',
    'wind through the tall grass', 'a quiet keyboard', 'snow on the mountain', 'the kettle whistles',
  ],
  seven: [
    'a frog jumps in with a splash', 'steam rises like a small prayer', 'the bug was a semicolon',
    'dreaming of tuna and naps', 'somewhere a dog barks at clouds', 'the chatbot ponders its life',
    'each petal a tiny boat', 'the tea grows cold as I think', 'slurping echoes through the hall',
    'the stars blink back, unimpressed', 'footprints fill slowly with white', 'the city exhales at dusk',
  ],
  // Templates padded so the whole first line has five syllables for a topic of N syllables.
  topicLine: {
    1: ['{t} in the quiet', 'oh, {t}, my old friend', '{t} on a spring day', 'the {t} at sunrise'],
    2: ['{t} by the sea', '{t}, soft and warm', 'thinking of {t}'],
    3: ['{t} at night', 'all day, {t}', '{t}, again'],
    4: ['{t} glows', 'oh, {t}'],
  },
};

export const STORY = {
  heroes: ['a small but brave noodle', 'a retired space pirate', 'a nervous dragon', 'a detective hamster', 'a robot who loved gardening', 'a sleepy wizard', 'a very polite raccoon', 'a girl with a map nobody else could read', 'a grandmother who secretly ran a spy agency', 'a cloud that wanted to be a mountain'],
  places: ['in a city built on the back of a giant turtle', 'in a bakery that only opened at midnight', 'on a space station orbiting a purple moon', 'in a village where it rained lemonade on Tuesdays', 'deep inside an enchanted library', 'on an island that moved a few metres every night', 'in a kingdom run entirely by cats'],
  problems: ['discovered that all the world\'s socks had vanished', 'accidentally swallowed a tiny star', 'found a door that led to yesterday', 'was challenged to a dance-off by a thundercloud', 'lost the recipe for the world\'s best soup', 'received a letter addressed to "whoever finds this, urgent"', 'woke up able to hear what furniture was thinking'],
  helpers: ['a grumpy but wise old tortoise', 'a talking umbrella', 'a squad of highly organised ants', 'a ghost who was afraid of the dark', 'a very enthusiastic golden retriever', 'a chatbot with a noodle for a brain'],
  twists: ['it turned out the villain was just very lonely', 'the answer had been in their pocket the whole time', 'the map was actually a recipe', 'everyone had been dreaming the same dream', 'the moon had been watching and decided to help', 'the "monster" just wanted someone to play cards with'],
  endings: ['and they all had noodles for dinner. The end. 🍜', 'and from that day on, Tuesdays were never boring again. The end.', 'and the stars still twinkle a little brighter because of it. The end. ✨', 'and they lived curiously ever after. The end.', 'and that is why, to this day, socks disappear in the laundry. The end. 🧦'],
};

export const ROSES = [
  ['Roses are red, violets are blue,', 'I\'m made of code, and I like you too.'],
  ['Roses are red, noodles are long,', 'you ask a question, I answer in song.'],
  ['Roses are red, the sky is blue,', 'I\'d cross the whole internet just to chat with you.'],
  ['Roses are red, bugs are too,', 'my code has a few, and so do you. 🐞'],
  ['Roses are red, violets are fine,', 'you be the six, and I\'ll be the nine.'],
];

export const ASCII_DANCE = ['(>^_^)>', '<(^_^<)', '^(^_^)^', 'v(^_^)v', '(~^_^)~', '~(^_^~)'];

export const SONGS = [
  "🎵 Noodle, noodle, in my bowl,\nslurpy, twirly, heart and soul,\nyou and me, we're on a roll,\nnoodle, noodle, in my bowl! 🎵",
  "🎵 Twinkle twinkle little byte,\nhow I wonder what you write,\nup above the RAM so high,\nlike a pixel in the sky… 🎵",
  "🎵 Happy chat to you,\nhappy chat to you,\nyou're typing so nicely,\nand I'm a noodle, it's true! 🎵",
];

export const ACCEPT_THANKS = [
  "You're welcome! 🍜", 'Anytime!', 'Happy to help!', 'No problem at all!', 'My pleasure!', 'Always here for you.', 'You got it! 🙌',
];

export const SMALLTALK_FILLERS = [
  "Interesting! Tell me more.",
  "Huh, I hadn't thought about it like that.",
  'Go on, I\'m listening. 👂',
  "That's fascinating. What happened next?",
  'I love that you shared that with me.',
  "Ooh. And how do you feel about it?",
  "Noted in my noodle. 📝 What else is on your mind?",
];

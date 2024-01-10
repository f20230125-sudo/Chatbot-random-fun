// Every game Noodle can play. A game is an object with start(), move(),
// quit(), nudge() and optionally hint(), giveUp() and repeat().

import { trivia } from './trivia.js';
import { riddles } from './riddles.js';
import { hangman } from './hangman.js';
import { tictactoe } from './tictactoe.js';
import { rps } from './rps.js';
import { guessNumber, botGuesses } from './guess.js';
import { animal } from './animal.js';
import { emojiQuiz } from './emoji.js';
import { madlibs } from './madlibs.js';
import { knockTell, knockListen } from './knock.js';
import { wyr } from './wyr.js';

export const GAMES = Object.fromEntries(
  [trivia, riddles, hangman, tictactoe, rps, guessNumber, botGuesses, animal, emojiQuiz, madlibs, knockTell, knockListen, wyr].map((g) => [g.id, g]),
);

/** Games shown in the menu, in order. */
export const MENU = [trivia, riddles, hangman, tictactoe, rps, guessNumber, botGuesses, animal, emojiQuiz, madlibs, wyr];

export const QUIT = /^(?:quit|stop|exit|end|cancel|abort|i quit|forfeit|end game|end the game|stop playing|stop the game|quit game|quit the game|enough|no more|i am done|done playing|let us stop|lets stop|stop it|leave|leave game|exit game|i do not want to play|i do not want to play anymore|not anymore|something else|play something else|change game|different game)$/;
export const GIVE_UP = /^(?:i give up|give up|i surrender|tell me the answer|what is the answer|what was the answer|show me the answer|reveal|reveal the answer|i do not know|idk|no idea|pass)$/;
export const HINT = /^(?:hint|a hint|clue|a clue|give me a hint|give me a clue|hint please|another hint|i need a hint|tip|help me|hint costs a life|hint \(costs a life\)|50 50|50\/50|50 50 hint|fifty fifty)$/;
export const REPEAT = /^(?:repeat|repeat that|what was the question|say that again|repeat the question|where were we|what now|show me the board|show the board|board|score|what is the score|status|remind me)$/;
export const RULES = /^(?:rules|how to play|how do i play|instructions|what are the rules|how does this game work|explain the rules)$/;

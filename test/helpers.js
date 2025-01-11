import { Noodle } from '../src/engine/bot.js';
import { memoryStore } from '../src/engine/memory.js';
import { mulberry32 } from '../src/engine/util.js';

/** 28 Sep 2026, 15:00 local time: a fixed clock keeps tests deterministic. */
export const NOW = new Date(2026, 8, 28, 15, 0);

export function makeBot({ seed = 1, store = memoryStore(), brain = null, now = NOW } = {}) {
  return new Noodle({ rng: mulberry32(seed), now: () => now, store, brain });
}

/** A bot that already knows the user's name, so the name question is out of the way. */
export async function friendlyBot(opts) {
  const bot = makeBot(opts);
  bot.greet();
  await bot.reply('Sam');
  return bot;
}

export async function say(bot, ...messages) {
  let last;
  for (const m of messages) last = await bot.reply(m);
  return last;
}

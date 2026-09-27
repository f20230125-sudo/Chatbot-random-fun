// Noodle's mood: two slow-moving numbers (how good it feels, how much energy
// it has) plus a short-lived "flash" reaction to the latest message.

export const MOODS = {
  happy: { emoji: '😊', label: 'happy' },
  excited: { emoji: '🤩', label: 'excited' },
  playful: { emoji: '😜', label: 'playful' },
  curious: { emoji: '🤔', label: 'curious' },
  love: { emoji: '🥰', label: 'loved' },
  sleepy: { emoji: '😴', label: 'sleepy' },
  sad: { emoji: '😢', label: 'a bit sad' },
  grumpy: { emoji: '😤', label: 'grumpy' },
  surprised: { emoji: '😮', label: 'surprised' },
  confused: { emoji: '😵‍💫', label: 'confused' },
  smug: { emoji: '😏', label: 'smug' },
  caring: { emoji: '🤗', label: 'caring' },
  thinking: { emoji: '🧐', label: 'thoughtful' },
  laughing: { emoji: '😂', label: 'amused' },
  worried: { emoji: '😟', label: 'worried' },
  suspicious: { emoji: '🤨', label: 'suspicious' },
};

// How each reaction shifts the underlying mood.
const EFFECTS = {
  happy: [0.08, 0.02], excited: [0.12, 0.12], playful: [0.05, 0.06], curious: [0.02, 0.03], love: [0.2, 0.05],
  sleepy: [0, -0.15], sad: [-0.2, -0.08], grumpy: [-0.25, 0.05], surprised: [0.02, 0.1], confused: [-0.03, 0],
  smug: [0.08, 0.04], caring: [0, -0.02], thinking: [0, 0], laughing: [0.12, 0.08], worried: [-0.08, 0.02], suspicious: [-0.03, 0.03],
};

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export class Mood {
  constructor(now = () => new Date()) {
    this.now = now;
    this.valence = 0.45;
    this.energy = 0.65;
    this.flash = null;
  }

  baselineEnergy() {
    const h = this.now().getHours();
    return h < 6 ? 0.2 : h < 9 ? 0.5 : h >= 23 ? 0.35 : 0.65;
  }

  /** Called once per message: drifts back toward baseline. */
  tick() {
    this.valence += (0.4 - this.valence) * 0.12;
    this.energy += (this.baselineEnergy() - this.energy) * 0.15;
    this.flash = null;
  }

  react(label) {
    if (!label || !MOODS[label]) return;
    const [dv, de] = EFFECTS[label] ?? [0, 0];
    this.valence = clamp(this.valence + dv, -1, 1);
    this.energy = clamp(this.energy + de, 0, 1);
    this.flash = label;
  }

  shift(dv, de = 0) {
    this.valence = clamp(this.valence + dv, -1, 1);
    this.energy = clamp(this.energy + de, 0, 1);
  }

  /** The mood the avatar should show right now. */
  get current() {
    if (this.flash) return this.flash;
    if (this.valence < -0.45) return this.energy > 0.55 ? 'grumpy' : 'sad';
    if (this.energy < 0.3) return 'sleepy';
    if (this.valence > 0.7 && this.energy > 0.7) return 'excited';
    if (this.valence > 0.3) return this.energy > 0.6 ? 'playful' : 'happy';
    return 'curious';
  }

  describe() {
    const m = this.current;
    const why = {
      grumpy: "Someone's been mean to me. 😤 (An apology would fix it.)",
      sad: "I'm feeling a little down. Maybe a nice word would help? 🥺",
      sleepy: "It's late and my noodle is getting soggy. 😴",
      excited: "I'm buzzing! This chat is fun. ⚡",
      love: 'All warm and fuzzy inside. 🥰',
    }[m] ?? "I'm doing great, thanks for asking!";
    return { mood: m, text: `${MOODS[m].emoji} Right now I'm feeling **${MOODS[m].label}**. ${why}` };
  }
}

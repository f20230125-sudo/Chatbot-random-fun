// What Noodle remembers about you between visits. Storage is pluggable:
// localStorage in the browser, a JSON file in the CLI, memory in tests.

export const memoryStore = () => {
  let saved = null;
  return { load: () => saved, save: (data) => { saved = structuredClone(data); } };
};

const blank = (now) => ({
  version: 1,
  name: null,
  likes: [],
  dislikes: [],
  birthday: null,
  voice: 'classic',
  firstSeen: now.toISOString(),
  lastSeen: null,
  visits: 0,
  messages: 0,
  stats: { won: 0, lost: 0, drawn: 0, played: 0 },
  extra: {},
});

export class Memory {
  constructor(store = memoryStore(), now = () => new Date()) {
    this.store = store;
    this.now = now;
    let data = null;
    try { data = store.load(); } catch { data = null; }
    this.data = data && typeof data === 'object' && data.version === 1 ? { ...blank(now()), ...data } : blank(now());
    this.previousVisit = this.data.lastSeen ? new Date(this.data.lastSeen) : null;
    this.data.visits += 1;
    this.data.lastSeen = now().toISOString();
    this.save();
  }

  save() {
    try { this.store.save(this.data); } catch { /* storage full or blocked: keep working in memory */ }
  }

  get name() { return this.data.name; }
  set name(v) { this.data.name = v; this.save(); }
  get voice() { return this.data.voice; }
  set voice(v) { this.data.voice = v; this.save(); }
  get birthday() { return this.data.birthday; }
  set birthday(v) { this.data.birthday = v; this.save(); }
  get likes() { return this.data.likes; }
  get dislikes() { return this.data.dislikes; }
  get stats() { return this.data.stats; }

  /** Free-form storage for games (e.g. the animal tree). */
  get(key) { return this.data.extra[key]; }
  set(key, value) { this.data.extra[key] = value; this.save(); }

  addLike(thing) { return addTo(this, 'likes', 'dislikes', thing); }
  addDislike(thing) { return addTo(this, 'dislikes', 'likes', thing); }

  countMessage() { this.data.messages += 1; this.data.lastSeen = this.now().toISOString(); this.save(); }

  recordGame(outcome) {
    const s = this.data.stats;
    s.played += 1;
    if (outcome === 'win') s.won += 1;
    else if (outcome === 'loss') s.lost += 1;
    else if (outcome === 'draw') s.drawn += 1;
    this.save();
  }

  forget() {
    this.data = blank(this.now());
    this.data.visits = 1;
    this.data.lastSeen = this.now().toISOString();
    this.previousVisit = null;
    this.save();
  }

  /** Facts safe to share with Claude as context. */
  summary() {
    const bits = [];
    if (this.data.name) bits.push(`Their name is ${this.data.name}.`);
    if (this.data.likes.length) bits.push(`They like: ${this.data.likes.slice(-10).join(', ')}.`);
    if (this.data.dislikes.length) bits.push(`They dislike: ${this.data.dislikes.slice(-10).join(', ')}.`);
    if (this.data.birthday) bits.push(`Their birthday is ${this.data.birthday.day}/${this.data.birthday.month}.`);
    return bits.join(' ');
  }
}

function addTo(mem, list, other, thing) {
  const t = thing.trim().toLowerCase();
  if (!t) return false;
  mem.data[other] = mem.data[other].filter((x) => x !== t);
  const already = mem.data[list].includes(t);
  if (!already) mem.data[list] = [...mem.data[list], t].slice(-30);
  mem.save();
  return !already;
}

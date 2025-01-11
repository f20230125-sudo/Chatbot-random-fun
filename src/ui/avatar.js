// Noodle's face: an SVG character whose eyes follow your pointer, who blinks,
// talks while replying, and changes expression with its mood.

import { MOODS } from '../engine/mood.js';

const FACES = {
  happy: { mouth: 'M38 66 Q50 77 62 66', eyes: 'open' },
  excited: { mouth: 'M36 63 Q50 86 64 63 Z', eyes: 'wide', fill: true, extras: ['sparkles'] },
  playful: { mouth: 'M38 65 Q50 77 62 65', eyes: 'wink', tongue: true },
  curious: { mouth: 'M46 69 Q50 63 54 69 Q50 75 46 69 Z', eyes: 'open', brows: 'raised-one', fill: true, extras: ['question'] },
  love: { mouth: 'M39 66 Q50 77 61 66', eyes: 'happy', blush: true, extras: ['hearts'] },
  sleepy: { mouth: 'M45 69 Q50 72 55 69', eyes: 'closed', extras: ['zzz'] },
  sad: { mouth: 'M39 73 Q50 63 61 73', eyes: 'open', brows: 'sad', extras: ['tear'] },
  grumpy: { mouth: 'M40 72 Q50 66 60 72', eyes: 'squint', brows: 'angry', extras: ['steam'] },
  surprised: { mouth: 'M44 70 Q44 61 50 61 Q56 61 56 70 Q56 78 50 78 Q44 78 44 70 Z', eyes: 'wide', brows: 'raised', fill: true },
  confused: { mouth: 'M38 69 Q42 65 46 69 T54 69 T62 69', eyes: 'open', brows: 'raised-one', extras: ['question', 'sweat'] },
  smug: { mouth: 'M40 68 Q53 74 62 62', eyes: 'half', brows: 'raised-one' },
  caring: { mouth: 'M40 66 Q50 74 60 66', eyes: 'happy', blush: true, extras: ['hearts'] },
  thinking: { mouth: 'M43 69 L57 67', eyes: 'up', brows: 'raised-one', extras: ['dots'] },
  laughing: { mouth: 'M36 63 Q50 86 64 63 Z', eyes: 'happy', fill: true, extras: ['joy'] },
  worried: { mouth: 'M40 71 Q45 67 50 70 T60 70', eyes: 'open', brows: 'sad', extras: ['sweat'] },
  suspicious: { mouth: 'M42 69 L58 69', eyes: 'squint-one', brows: 'raised-one' },
};

let uid = 0;

function svgMarkup(id) {
  return `
<svg class="noodle-face" viewBox="0 0 100 100" role="img" aria-label="Noodle" data-mood="happy">
  <defs>
    <radialGradient id="nf-grad-${id}" cx="38%" cy="30%" r="75%">
      <stop offset="0%" class="nf-stop-hi"/>
      <stop offset="100%" class="nf-stop"/>
    </radialGradient>
  </defs>
  <ellipse class="nf-shadow" cx="50" cy="95" rx="25" ry="3"/>
  <g class="nf-float">
    <g class="nf-squash">
      <path class="nf-noodle" d="M52 17 C49 9 57 5 60 10 C63 15 55 18 54 12"/>
      <path class="nf-body" fill="url(#nf-grad-${id})" d="M50 16 C77 16 89 32 89 55 C89 79 72 91 50 91 C28 91 11 79 11 55 C11 32 23 16 50 16 Z"/>
      <path class="nf-shine" d="M27 33 Q33 24 43 22"/>
      <g class="nf-cheeks"><ellipse cx="27" cy="64" rx="6.5" ry="3.6"/><ellipse cx="73" cy="64" rx="6.5" ry="3.6"/></g>
      <g class="nf-brows">
        <path class="nf-brow nf-brow-l" d="M29 37 Q35 34 42 37"/>
        <path class="nf-brow nf-brow-r" d="M58 37 Q65 34 71 37"/>
      </g>
      <g class="nf-eye nf-eye-l" transform="translate(36 50)">
        <g class="nf-lid">
          <ellipse class="nf-white" rx="7.5" ry="8.5"/>
          <g class="nf-pupil"><circle r="4.4"/><circle class="nf-glint" cx="1.6" cy="-1.8" r="1.4"/></g>
        </g>
        <path class="nf-arc" d="M-6 2 Q0 -6 6 2"/>
        <path class="nf-line" d="M-6 1 Q0 4 6 1"/>
      </g>
      <g class="nf-eye nf-eye-r" transform="translate(64 50)">
        <g class="nf-lid">
          <ellipse class="nf-white" rx="7.5" ry="8.5"/>
          <g class="nf-pupil"><circle r="4.4"/><circle class="nf-glint" cx="1.6" cy="-1.8" r="1.4"/></g>
        </g>
        <path class="nf-arc" d="M-6 2 Q0 -6 6 2"/>
        <path class="nf-line" d="M-6 1 Q0 4 6 1"/>
      </g>
      <path class="nf-mouth" d="${FACES.happy.mouth}"/>
      <ellipse class="nf-tongue" cx="54" cy="72.5" rx="4" ry="3.2"/>
    </g>
    <g class="nf-x nf-hearts"><path d="M80 22 c-2-3-7-1-5 3 l5 5 l5-5 c2-4-3-6-5-3z"/><path d="M16 30 c-1.5-2.2-5.2-.8-3.8 2.2 l3.8 3.8 l3.8-3.8 c1.4-3-2.3-4.4-3.8-2.2z"/></g>
    <g class="nf-x nf-zzz"><text x="74" y="26">z</text><text x="81" y="17">z</text><text x="88" y="9">z</text></g>
    <g class="nf-x nf-sparkles"><path d="M83 20 l1.8 4.5 4.5 1.8 -4.5 1.8 -1.8 4.5 -1.8-4.5 -4.5-1.8 4.5-1.8z"/><path d="M15 22 l1.2 3 3 1.2 -3 1.2 -1.2 3 -1.2-3 -3-1.2 3-1.2z"/></g>
    <path class="nf-x nf-tear" d="M31 60 q-3 5 0 7.5 q3 -2.5 0 -7.5z"/>
    <g class="nf-x nf-joy"><path d="M26 56 q-3 5 0 7.5 q3 -2.5 0 -7.5z"/><path d="M74 56 q-3 5 0 7.5 q3 -2.5 0 -7.5z"/></g>
    <path class="nf-x nf-sweat" d="M80 32 q-4 6 0 9 q4 -3 0 -9z"/>
    <g class="nf-x nf-steam"><path d="M14 22 q-4 -5 1 -8 q5 -3 3 -8"/><path d="M86 22 q4 -5 -1 -8 q-5 -3 -3 -8"/></g>
    <g class="nf-x nf-dots"><circle cx="78" cy="24" r="2.2"/><circle cx="85" cy="16" r="3"/><circle cx="92" cy="7" r="3.8"/></g>
    <text class="nf-x nf-question" x="80" y="26">?</text>
  </g>
</svg>`;
}

export function createAvatar(container) {
  const id = ++uid;
  container.innerHTML = svgMarkup(id);
  const svg = container.querySelector('svg');
  const mouth = svg.querySelector('.nf-mouth');
  const pupils = [...svg.querySelectorAll('.nf-pupil')];
  let mood = 'happy';
  let lookTarget = { x: 0, y: 0 };
  let blinkTimer = null;
  let destroyed = false;
  const reduced = () => globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  function applyLook() {
    const face = FACES[mood] ?? FACES.happy;
    const up = face.eyes === 'up' ? -2.2 : 0;
    for (const p of pupils) p.setAttribute('transform', `translate(${lookTarget.x.toFixed(2)} ${(lookTarget.y + up).toFixed(2)})`);
  }

  function setMood(next) {
    const face = FACES[next] ?? FACES.happy;
    mood = FACES[next] ? next : 'happy';
    svg.dataset.mood = mood;
    svg.dataset.eyes = face.eyes;
    svg.dataset.brows = face.brows ?? 'none';
    svg.classList.toggle('has-fill', !!face.fill);
    svg.classList.toggle('has-tongue', !!face.tongue);
    svg.classList.toggle('has-blush', !!face.blush);
    for (const x of svg.querySelectorAll('.nf-x')) x.classList.toggle('on', (face.extras ?? []).some((e) => x.classList.contains(`nf-${e}`)));
    mouth.setAttribute('d', face.mouth);
    svg.setAttribute('aria-label', `Noodle looks ${MOODS[mood]?.label ?? mood}`);
    applyLook();
    if (!reduced()) {
      svg.classList.remove('pop');
      void svg.getBoundingClientRect();
      svg.classList.add('pop');
    }
  }

  /** Point the pupils toward a screen coordinate. */
  function lookAt(clientX, clientY) {
    const r = svg.getBoundingClientRect();
    if (!r.width) return;
    const dx = clientX - (r.left + r.width / 2);
    const dy = clientY - (r.top + r.height * 0.5);
    const dist = Math.hypot(dx, dy) || 1;
    const reach = Math.min(1, dist / 300) * 2.6;
    lookTarget = { x: (dx / dist) * reach, y: (dy / dist) * reach };
    applyLook();
  }

  function lookRandom() {
    const a = Math.random() * Math.PI * 2;
    lookTarget = { x: Math.cos(a) * 2, y: Math.sin(a) * 1.5 };
    applyLook();
  }

  function scheduleBlink() {
    if (destroyed) return;
    blinkTimer = setTimeout(() => {
      if (!reduced()) {
        svg.classList.add('blink');
        setTimeout(() => svg.classList.remove('blink'), 140);
      }
      scheduleBlink();
    }, 2200 + Math.random() * 4200);
  }
  scheduleBlink();
  setMood('happy');

  return {
    el: svg,
    get mood() { return mood; },
    setMood,
    lookAt,
    lookRandom,
    speak(on) { svg.classList.toggle('speaking', !!on); },
    destroy() { destroyed = true; clearTimeout(blinkTimer); },
  };
}

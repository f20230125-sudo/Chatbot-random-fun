// Clocks, calendars and countdowns, computed offline with the built-in Intl API.

import { capitalize, plural } from '../util.js';

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
const MONTH_RE = '(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)';
const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

export const CITY_ZONES = {
  dubai: 'Asia/Dubai', 'abu dhabi': 'Asia/Dubai', sharjah: 'Asia/Dubai', uae: 'Asia/Dubai', 'the uae': 'Asia/Dubai',
  london: 'Europe/London', uk: 'Europe/London', 'the uk': 'Europe/London', england: 'Europe/London', manchester: 'Europe/London',
  dublin: 'Europe/Dublin', paris: 'Europe/Paris', france: 'Europe/Paris', berlin: 'Europe/Berlin', germany: 'Europe/Berlin',
  madrid: 'Europe/Madrid', spain: 'Europe/Madrid', rome: 'Europe/Rome', italy: 'Europe/Rome', amsterdam: 'Europe/Amsterdam',
  zurich: 'Europe/Zurich', stockholm: 'Europe/Stockholm', athens: 'Europe/Athens', moscow: 'Europe/Moscow', russia: 'Europe/Moscow',
  istanbul: 'Europe/Istanbul', turkey: 'Europe/Istanbul', cairo: 'Africa/Cairo', egypt: 'Africa/Cairo', lagos: 'Africa/Lagos',
  nigeria: 'Africa/Lagos', nairobi: 'Africa/Nairobi', kenya: 'Africa/Nairobi', johannesburg: 'Africa/Johannesburg', 'cape town': 'Africa/Johannesburg',
  riyadh: 'Asia/Riyadh', 'saudi arabia': 'Asia/Riyadh', jeddah: 'Asia/Riyadh', mecca: 'Asia/Riyadh', doha: 'Asia/Qatar', qatar: 'Asia/Qatar',
  kuwait: 'Asia/Kuwait', muscat: 'Asia/Muscat', oman: 'Asia/Muscat', bahrain: 'Asia/Bahrain', tehran: 'Asia/Tehran', iran: 'Asia/Tehran',
  karachi: 'Asia/Karachi', lahore: 'Asia/Karachi', islamabad: 'Asia/Karachi', pakistan: 'Asia/Karachi', kabul: 'Asia/Kabul',
  delhi: 'Asia/Kolkata', 'new delhi': 'Asia/Kolkata', mumbai: 'Asia/Kolkata', bangalore: 'Asia/Kolkata', bengaluru: 'Asia/Kolkata',
  hyderabad: 'Asia/Kolkata', chennai: 'Asia/Kolkata', kolkata: 'Asia/Kolkata', pune: 'Asia/Kolkata', pilani: 'Asia/Kolkata', goa: 'Asia/Kolkata', india: 'Asia/Kolkata',
  kathmandu: 'Asia/Kathmandu', nepal: 'Asia/Kathmandu', dhaka: 'Asia/Dhaka', bangladesh: 'Asia/Dhaka', colombo: 'Asia/Colombo', 'sri lanka': 'Asia/Colombo',
  bangkok: 'Asia/Bangkok', thailand: 'Asia/Bangkok', singapore: 'Asia/Singapore', 'kuala lumpur': 'Asia/Kuala_Lumpur', malaysia: 'Asia/Kuala_Lumpur',
  jakarta: 'Asia/Jakarta', indonesia: 'Asia/Jakarta', bali: 'Asia/Makassar', manila: 'Asia/Manila', philippines: 'Asia/Manila',
  'hong kong': 'Asia/Hong_Kong', beijing: 'Asia/Shanghai', shanghai: 'Asia/Shanghai', china: 'Asia/Shanghai', taipei: 'Asia/Taipei',
  tokyo: 'Asia/Tokyo', japan: 'Asia/Tokyo', osaka: 'Asia/Tokyo', seoul: 'Asia/Seoul', korea: 'Asia/Seoul', 'south korea': 'Asia/Seoul',
  sydney: 'Australia/Sydney', melbourne: 'Australia/Melbourne', brisbane: 'Australia/Brisbane', perth: 'Australia/Perth', australia: 'Australia/Sydney',
  auckland: 'Pacific/Auckland', 'new zealand': 'Pacific/Auckland', honolulu: 'Pacific/Honolulu', hawaii: 'Pacific/Honolulu',
  'new york': 'America/New_York', nyc: 'America/New_York', boston: 'America/New_York', washington: 'America/New_York', miami: 'America/New_York',
  atlanta: 'America/New_York', toronto: 'America/Toronto', montreal: 'America/Toronto', chicago: 'America/Chicago', texas: 'America/Chicago',
  houston: 'America/Chicago', dallas: 'America/Chicago', denver: 'America/Denver', phoenix: 'America/Phoenix', 'los angeles': 'America/Los_Angeles',
  la: 'America/Los_Angeles', 'san francisco': 'America/Los_Angeles', 'silicon valley': 'America/Los_Angeles', seattle: 'America/Los_Angeles',
  'las vegas': 'America/Los_Angeles', california: 'America/Los_Angeles', vancouver: 'America/Vancouver', anchorage: 'America/Anchorage', alaska: 'America/Anchorage',
  'mexico city': 'America/Mexico_City', mexico: 'America/Mexico_City', 'sao paulo': 'America/Sao_Paulo', 'são paulo': 'America/Sao_Paulo', 'rio de janeiro': 'America/Sao_Paulo',
  brazil: 'America/Sao_Paulo', 'buenos aires': 'America/Argentina/Buenos_Aires', argentina: 'America/Argentina/Buenos_Aires', lima: 'America/Lima', bogota: 'America/Bogota',
  santiago: 'America/Santiago', reykjavik: 'Atlantic/Reykjavik', iceland: 'Atlantic/Reykjavik', utc: 'UTC', gmt: 'UTC', greenwich: 'Europe/London',
};

const HOLIDAYS = {
  christmas: [12, 25, '🎄 Christmas'], xmas: [12, 25, '🎄 Christmas'], 'christmas eve': [12, 24, '🎄 Christmas Eve'],
  'new year': [1, 1, '🎆 New Year'], 'new years': [1, 1, '🎆 New Year'], 'new years day': [1, 1, '🎆 New Year'], 'new years eve': [12, 31, "🥂 New Year's Eve"],
  halloween: [10, 31, '🎃 Halloween'], valentines: [2, 14, "💘 Valentine's Day"], 'valentines day': [2, 14, "💘 Valentine's Day"], valentine: [2, 14, "💘 Valentine's Day"],
  'april fools': [4, 1, "🤡 April Fools' Day"], 'april fools day': [4, 1, "🤡 April Fools' Day"], 'pi day': [3, 14, '🥧 Pi Day'],
  'star wars day': [5, 4, '✨ Star Wars Day'], 'earth day': [4, 22, '🌍 Earth Day'], 'uae national day': [12, 2, '🇦🇪 UAE National Day'], 'national day': [12, 2, '🇦🇪 UAE National Day'],
  summer: [6, 21, '☀️ the first day of summer (northern hemisphere)'], winter: [12, 21, '❄️ the first day of winter (northern hemisphere)'],
  spring: [3, 20, '🌸 the first day of spring (northern hemisphere)'], autumn: [9, 22, '🍂 the first day of autumn (northern hemisphere)'], fall: [9, 22, '🍂 the first day of autumn (northern hemisphere)'],
  'world noodle day': [10, 6, '🍜 World Noodle Day'], 'noodle day': [10, 6, '🍜 World Noodle Day'],
};
const LUNAR = /\b(eid|ramadan|ramzan|diwali|deepavali|holi|chinese new year|lunar new year|hanukkah|chanukah|passover|navratri|dussehra|vesak|rosh hashanah)\b/;

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const dayDiff = (a, b) => Math.round((startOfDay(b) - startOfDay(a)) / 86400000);
const fmtDate = (d, opts = {}) => d.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', ...opts });

/** Easter Sunday (Gregorian), via the anonymous Gregorian algorithm. */
export function easter(year) {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

export const isLeap = (y) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

const monthIndex = (name) => MONTHS.findIndex((m) => m.startsWith(name.slice(0, 3)));

function validDate(y, m, d) {
  const dt = new Date(y, m, d);
  return dt.getFullYear() === y && dt.getMonth() === m && dt.getDate() === d ? dt : null;
}

/**
 * Parses loose date text. Returns { date, explicitYear, note, label } or null.
 * Dates without a year resolve to their next occurrence.
 */
export function parseDate(text, now, memory) {
  const t = text.toLowerCase().replace(/[?!.,]+$/, '').replace(/\bthe\b/g, ' ').replace(/\s+/g, ' ').trim();
  const today = startOfDay(now);
  const next = (m, d) => {
    let dt = validDate(today.getFullYear(), m, d);
    if (!dt || dt < today) dt = validDate(today.getFullYear() + 1, m, d) ?? validDate(today.getFullYear() + 4 - (today.getFullYear() % 4), m, d);
    return dt;
  };
  if (/^(today|now)$/.test(t)) return { date: today };
  if (/^tomorrow$/.test(t)) return { date: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1) };
  if (/^yesterday$/.test(t)) return { date: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1) };
  if (/^(?:my )?(?:birthday|bday|b day)$/.test(t) || /^my birthday$/.test(t)) {
    if (!memory?.birthday) return { needBirthday: true };
    return { date: next(memory.birthday.month - 1, memory.birthday.day), label: '🎂 your birthday' };
  }
  if (/^(?:the )?weekend$/.test(t)) {
    const d = new Date(today);
    d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7));
    return { date: d, label: '🛋️ the weekend' };
  }
  if (/^easter$/.test(t)) {
    let e = easter(today.getFullYear());
    if (e < today) e = easter(today.getFullYear() + 1);
    return { date: e, label: '🐣 Easter Sunday' };
  }
  const key = t.replace(/'/g, '');
  const holiday = HOLIDAYS[key] ?? HOLIDAYS[key.replace(/ day$/, '')];
  if (holiday) return { date: next(holiday[0] - 1, holiday[1]), label: holiday[2] };
  if (LUNAR.test(t)) return { lunar: t.match(LUNAR)[1] };

  let m = t.match(/^(?:next |this |on )?(sunday|monday|tuesday|wednesday|thursday|friday|saturday)$/);
  if (m) {
    const target = WEEKDAYS.indexOf(m[1]);
    const d = new Date(today);
    const add = (target - d.getDay() + 7) % 7 || 7;
    d.setDate(d.getDate() + add);
    return { date: d };
  }
  m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) {
    const d = validDate(+m[1], +m[2] - 1, +m[3]);
    return d ? { date: d, explicitYear: true } : { invalid: true };
  }
  m = t.match(/^(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?$/);
  if (m) {
    let [a, b] = [+m[1], +m[2]];
    let year = m[3] ? +m[3] : null;
    if (year !== null && year < 100) year += 2000;
    let day, month, note;
    if (a > 12 && b <= 12) { day = a; month = b; }
    else if (b > 12 && a <= 12) { month = a; day = b; }
    else { day = a; month = b; if (a !== b) note = `reading that as day ${a} of ${capitalize(MONTHS[b - 1] ?? '?')}`; }
    if (month < 1 || month > 12) return { invalid: true };
    const d = year !== null ? validDate(year, month - 1, day) : next(month - 1, day);
    return d ? { date: d, explicitYear: year !== null, note } : { invalid: true };
  }
  m = t.match(new RegExp(`^(\\d{1,2})(?:st|nd|rd|th)?(?: of)? ${MONTH_RE}(?: (\\d{4}))?$`)) ??
      t.match(new RegExp(`^${MONTH_RE} (\\d{1,2})(?:st|nd|rd|th)?(?: (\\d{4}))?$`));
  if (m) {
    const [dayStr, monthStr] = /^\d/.test(m[1]) ? [m[1], m[2]] : [m[2], m[1]];
    const month = monthIndex(monthStr);
    const year = m[3] ? +m[3] : null;
    const d = year !== null ? validDate(year, month, +dayStr) : next(month, +dayStr);
    return d ? { date: d, explicitYear: year !== null } : { invalid: true };
  }
  return null;
}

function zoneTime(zone, now) {
  const fmt = new Intl.DateTimeFormat('en-US', { timeZone: zone, hour: 'numeric', minute: '2-digit', weekday: 'long' });
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: zone, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' })
    .formatToParts(now).reduce((acc, p) => ({ ...acc, [p.type]: +p.value }), {});
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour % 24, parts.minute);
  const wall = new Date(now); wall.setSeconds(0, 0);
  const zoneOffset = Math.round((asUtc - wall.getTime()) / 60000);
  const localOffset = -now.getTimezoneOffset();
  return { text: fmt.format(now), diff: zoneOffset - localOffset, hour: parts.hour % 24 };
}

function describeDiff(minutes) {
  if (minutes === 0) return 'the same time as you';
  const h = Math.floor(Math.abs(minutes) / 60);
  const m = Math.abs(minutes) % 60;
  const amount = [h ? plural(h, 'hour') : '', m ? plural(m, 'minute') : ''].filter(Boolean).join(' ');
  return `${amount} ${minutes > 0 ? 'ahead of' : 'behind'} you`;
}

function countdown(target, now, label, note) {
  const days = dayDiff(now, target.date);
  const name = label ?? fmtDate(target.date);
  const suffix = note ? ` _(${note})_` : '';
  if (days === 0) return `🎉 ${capitalize(name)} is **today**!${suffix}`;
  if (days < 0) return `📅 ${capitalize(name)} was **${plural(-days, 'day')} ago**.${suffix}`;
  const weeks = days >= 14 ? ` That's about ${plural(Math.round(days / 7), 'week')}.` : '';
  const sleeps = days <= 10 ? ` Only ${plural(days, 'sleep')}! 😴` : '';
  return `⏳ **${plural(days, 'day')}** until ${name}${label ? ` (${fmtDate(target.date)})` : ''}.${weeks}${sleeps}${suffix}`;
}

/**
 * Handles time/date questions. Keeps date punctuation like 12/25 intact.
 * Returns { text, needBirthday? } or null.
 */
export function tryDates(raw, { now, memory }) {
  const p = String(raw).toLowerCase().replace(/[‘’']/g, '').replace(/[?!,;:]+/g, ' ').replace(/\.+(\s|$)/g, '$1')
    .replace(/\bwhats\b/g, 'what is').replace(/\bwhens\b/g, 'when is').replace(/\s+/g, ' ').trim();
  let m;
  // Time somewhere else.
  m = p.match(/\b(?:what(?: is)? (?:the )?time(?: is it)?|current time|time(?: is it)?|time now|clock) (?:right now )?(?:in|at|for) ([a-zÀ-ɏ .'-]+?)(?: right now| now)?$/);
  if (m) {
    const rawPlace = m[1].trim();
    const place = rawPlace.replace(/^the /, '');
    const zone = CITY_ZONES[rawPlace] ?? CITY_ZONES[place];
    if (!zone) return { text: `🗺️ I don't know the time zone for "${place}" yet. Try a big city nearby, like "time in Dubai" or "time in Tokyo".` };
    try {
      const z = zoneTime(zone, now);
      const vibe = z.hour < 5 ? ' Probably asleep. 😴' : z.hour < 9 ? ' Coffee time. ☕' : z.hour >= 22 ? ' Getting late there! 🌙' : '';
      const name = place.length <= 3 ? place.toUpperCase() : place.split(' ').map((w) => (w === 'de' ? w : capitalize(w))).join(' ');
      return { text: `🕐 In ${name} it's **${z.text}**, which is ${describeDiff(z.diff)}.${vibe}` };
    } catch {
      return { text: "🕐 Your device doesn't have time-zone data for that place, sorry!" };
    }
  }
  if (/\b(?:what(?: is)? (?:the )?time(?: is it)?(?: now| right now)?|what time|current time|time is it|time please|tell me the time|got the time)$|^time$|^(?:the )?time now$/.test(p)) {
    const t = now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    const h = now.getHours();
    const vibe = h < 5 ? " Shouldn't you be asleep? 🌙" : h < 12 ? ' Good morning! ☀️' : h < 17 ? ' Good afternoon!' : h < 22 ? ' Good evening! 🌆' : ' Getting late! 🌙';
    return { text: `🕐 It's **${t}** on your clock.${vibe}` };
  }
  if (/\bwhat(?: is)? (?:the )?(?:date|day)(?: is it)?(?: today)?$|\btoday(?:s|s)? date\b|\bwhat day is (?:it|today)\b|^date$|^(?:what is )?today$|\bwhat is today\b/.test(p)) {
    return { text: `📅 Today is **${fmtDate(now)}**.` };
  }
  if (/\bwhat (?:year|month) is it\b|\bwhat is the (?:year|month)\b|\bwhich (?:year|month) is it\b/.test(p)) {
    return /year/.test(p)
      ? { text: `📅 It's **${now.getFullYear()}**.` }
      : { text: `📅 It's **${now.toLocaleDateString(undefined, { month: 'long' })}**.` };
  }
  // Leap years.
  m = p.match(/\bis (\d{3,4}) a leap year\b/);
  if (m) {
    const y = +m[1];
    return { text: isLeap(y) ? `✅ Yes! ${y} is a leap year: February has 29 days.` : `❌ Nope, ${y} isn't a leap year.` };
  }
  if (/\bnext leap year\b|\bwhen is (?:the next )?leap year\b/.test(p)) {
    let y = now.getFullYear() + (now.getMonth() > 1 ? 1 : 0);
    while (!isLeap(y)) y++;
    return { text: `📅 The next leap year is **${y}**.` };
  }
  // Age from birth year or date.
  m = p.match(/\b(?:born (?:in |on )?(.+?)(?: how old| what age|$))|(?:how old (?:am i|would i be|will i be|is someone|is a person)(?: if| when)?(?: i was| i am| they were| you are)? born (?:in |on )?(.+))$/);
  if (m && /how old|age/.test(p)) {
    const when = (m[1] ?? m[2] ?? '').trim();
    const yearOnly = when.match(/^(\d{4})$/);
    if (yearOnly) {
      const y = +yearOnly[1];
      const age = now.getFullYear() - y;
      if (y > now.getFullYear()) return { text: "👶 That's in the future! You haven't been born yet. Hello, time traveller. ⏳" };
      return { text: `🎂 Born in ${y}? You're **${age}** this year (or ${age - 1} if your birthday hasn't come yet).` };
    }
    const parsed = parseDate(when, now, memory);
    if (parsed?.date && parsed.explicitYear) {
      const b = parsed.date;
      if (b > now) return { text: "👶 That date is in the future! Are you a time traveller? ⏳" };
      let age = now.getFullYear() - b.getFullYear();
      if (now.getMonth() < b.getMonth() || (now.getMonth() === b.getMonth() && now.getDate() < b.getDate())) age--;
      const days = dayDiff(b, now);
      return { text: `🎂 You're **${age}** years old, which is about **${days.toLocaleString()} days**. That's a lot of noodles.` };
    }
  }
  // Weekday of a date.
  m = p.match(/\bwhat day (?:of the week )?(?:was|is|will be|is it on|falls on|does)\s+(.+?)(?: fall on| on)?$/);
  if (m) {
    const parsed = parseDate(m[1], now, memory);
    if (parsed?.date) {
      const wd = parsed.date.toLocaleDateString(undefined, { weekday: 'long' });
      const past = parsed.date < startOfDay(now);
      return { text: `📅 ${fmtDate(parsed.date, { weekday: undefined })} ${past ? 'was' : 'is'} a **${wd}**.${parsed.note ? ` _(${parsed.note})_` : ''}` };
    }
  }
  // Days between two dates.
  m = p.match(/\b(?:days|how many days) between (.+?) and (.+)$/);
  if (m) {
    const a = parseDate(m[1], now, memory);
    const b = parseDate(m[2], now, memory);
    if (a?.date && b?.date) return { text: `📅 There are **${plural(Math.abs(dayDiff(a.date, b.date)), 'day')}** between those dates.` };
  }
  // Countdowns.
  m = p.match(/\b(?:how (?:many|much|long)(?: days| time| weeks)? (?:is it |are there |is there |left )?(?:until|till|til|before|to|untill)|days (?:until|till|til|to|left until|left till|left before|left for|untill)|countdown to|count down to|when is)\s+(.+?)$/);
  if (m) {
    const what = m[1].replace(/^(?:the|next|my next)\s+/, (x) => (x.includes('my') ? 'my ' : ''));
    const parsed = parseDate(what, now, memory);
    if (parsed?.needBirthday) return { text: "🎂 I don't know your birthday yet! Tell me with something like \"my birthday is 5 March\".", needBirthday: true };
    if (parsed?.lunar) return { text: `🌙 ${capitalize(parsed.lunar)} follows a lunar calendar, so its date moves every year and can depend on moon sightings. I can't work it out offline, but a quick search will tell you!` };
    if (parsed?.invalid) return { text: "📅 That date doesn't exist on any calendar I know. Double-check the day and month?" };
    if (parsed?.date) return { text: countdown(parsed, now, parsed.label, parsed.note) };
  }
  return null;
}

/** "my birthday is 5 march" -> { month, day } or null. */
export function parseBirthday(text, now) {
  const parsed = parseDate(text, now);
  if (!parsed?.date) return null;
  return { month: parsed.date.getMonth() + 1, day: parsed.date.getDate(), year: parsed.explicitYear ? parsed.date.getFullYear() : null };
}

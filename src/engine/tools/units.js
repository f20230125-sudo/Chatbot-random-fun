// Offline unit conversion. Each unit maps to a factor in its dimension's base
// unit; temperature is handled separately because it has offsets.

import { formatNumber } from '../util.js';

const U = (dim, factor, name, ...aliases) => ({ dim, factor, name, aliases });

const UNITS = [
  // length (base: metre)
  U('length', 1e-3, 'millimetres', 'mm', 'millimeter', 'millimeters', 'millimetre', 'millimetres'),
  U('length', 1e-2, 'centimetres', 'cm', 'centimeter', 'centimeters', 'centimetre', 'centimetres'),
  U('length', 1, 'metres', 'm', 'meter', 'meters', 'metre', 'metres'),
  U('length', 1e3, 'kilometres', 'km', 'kms', 'kilometer', 'kilometers', 'kilometre', 'kilometres'),
  U('length', 0.0254, 'inches', 'in', 'inch', 'inches', '"'),
  U('length', 0.3048, 'feet', 'ft', 'foot', 'feet', "'"),
  U('length', 0.9144, 'yards', 'yd', 'yds', 'yard', 'yards'),
  U('length', 1609.344, 'miles', 'mi', 'mile', 'miles'),
  U('length', 1852, 'nautical miles', 'nmi', 'nautical mile', 'nautical miles'),
  U('length', 9.4607e15, 'light years', 'ly', 'light year', 'light years', 'lightyear', 'lightyears'),
  // mass (base: kilogram)
  U('mass', 1e-6, 'milligrams', 'mg', 'milligram', 'milligrams'),
  U('mass', 1e-3, 'grams', 'g', 'gram', 'grams', 'gm', 'gms'),
  U('mass', 1, 'kilograms', 'kg', 'kgs', 'kilo', 'kilos', 'kilogram', 'kilograms'),
  U('mass', 1000, 'tonnes', 't', 'tonne', 'tonnes', 'metric ton', 'metric tons'),
  U('mass', 0.028349523125, 'ounces', 'oz', 'ounce', 'ounces'),
  U('mass', 0.45359237, 'pounds', 'lb', 'lbs', 'pound', 'pounds'),
  U('mass', 6.35029318, 'stone', 'st', 'stone', 'stones'),
  // volume (base: litre)
  U('volume', 1e-3, 'millilitres', 'ml', 'milliliter', 'milliliters', 'millilitre', 'millilitres'),
  U('volume', 1, 'litres', 'l', 'liter', 'liters', 'litre', 'litres'),
  U('volume', 0.00492892, 'teaspoons', 'tsp', 'teaspoon', 'teaspoons'),
  U('volume', 0.0147868, 'tablespoons', 'tbsp', 'tablespoon', 'tablespoons'),
  U('volume', 0.0295735, 'US fluid ounces', 'fl oz', 'floz', 'fluid ounce', 'fluid ounces'),
  U('volume', 0.24, 'cups', 'cup', 'cups'),
  U('volume', 0.473176, 'US pints', 'pt', 'pint', 'pints'),
  U('volume', 3.78541, 'US gallons', 'gal', 'gallon', 'gallons'),
  U('volume', 1000, 'cubic metres', 'm3', 'cubic meter', 'cubic meters', 'cubic metre', 'cubic metres'),
  // speed (base: metre per second)
  U('speed', 1, 'metres per second', 'm/s', 'mps', 'meters per second', 'metres per second'),
  U('speed', 1 / 3.6, 'km/h', 'km/h', 'kmh', 'kph', 'kmph', 'km per hour', 'kilometers per hour', 'kilometres per hour'),
  U('speed', 0.44704, 'mph', 'mph', 'miles per hour', 'mi/h'),
  U('speed', 0.514444, 'knots', 'knot', 'knots', 'kn', 'kt'),
  // time (base: second)
  U('time', 1e-3, 'milliseconds', 'ms', 'millisecond', 'milliseconds'),
  U('time', 1, 'seconds', 's', 'sec', 'secs', 'second', 'seconds'),
  U('time', 60, 'minutes', 'min', 'mins', 'minute', 'minutes'),
  U('time', 3600, 'hours', 'h', 'hr', 'hrs', 'hour', 'hours'),
  U('time', 86400, 'days', 'd', 'day', 'days'),
  U('time', 604800, 'weeks', 'wk', 'wks', 'week', 'weeks'),
  U('time', 2629746, 'months', 'month', 'months'),
  U('time', 31556952, 'years', 'yr', 'yrs', 'year', 'years'),
  // digital storage (base: byte)
  U('data', 1 / 8, 'bits', 'bit', 'bits'),
  U('data', 1, 'bytes', 'b', 'byte', 'bytes'),
  U('data', 1e3, 'kilobytes', 'kb', 'kilobyte', 'kilobytes'),
  U('data', 1e6, 'megabytes', 'mb', 'megabyte', 'megabytes', 'megs'),
  U('data', 1e9, 'gigabytes', 'gb', 'gigabyte', 'gigabytes', 'gigs'),
  U('data', 1e12, 'terabytes', 'tb', 'terabyte', 'terabytes'),
  U('data', 1024, 'kibibytes', 'kib', 'kibibyte'),
  U('data', 1024 ** 2, 'mebibytes', 'mib', 'mebibyte'),
  U('data', 1024 ** 3, 'gibibytes', 'gib', 'gibibyte'),
  // area (base: square metre)
  U('area', 1, 'square metres', 'm2', 'sq m', 'square meter', 'square meters', 'square metre', 'square metres', 'sqm'),
  U('area', 0.092903, 'square feet', 'sq ft', 'ft2', 'square foot', 'square feet', 'sqft'),
  U('area', 1e6, 'square kilometres', 'km2', 'sq km', 'square kilometer', 'square kilometers', 'square kilometre', 'square kilometres'),
  U('area', 4046.86, 'acres', 'acre', 'acres'),
  U('area', 1e4, 'hectares', 'ha', 'hectare', 'hectares'),
];

const TEMPS = {
  c: ['c', '°c', 'celsius', 'centigrade', 'degrees c', 'degrees celsius', 'degree celsius', 'deg c'],
  f: ['f', '°f', 'fahrenheit', 'farenheit', 'degrees f', 'degrees fahrenheit', 'degree fahrenheit', 'deg f'],
  k: ['k', 'kelvin', 'kelvins', '°k', 'degrees kelvin'],
};
const TEMP_NAMES = { c: '°C', f: '°F', k: 'K' };

const CURRENCIES = /\b(usd|eur|euros?|gbp|pounds? sterling|aed|dirhams?|inr|rupees?|yen|jpy|yuan|cny|rmb|dollars?|bitcoin|btc|riyals?|sar|pkr|cad|aud|chf|francs?|pesos?)\b|[$€£¥₹]/;

const lookup = new Map();
for (const u of UNITS) for (const a of u.aliases) lookup.set(a.toLowerCase(), u);
for (const [key, aliases] of Object.entries(TEMPS)) for (const a of aliases) lookup.set(a, { dim: 'temperature', key, name: TEMP_NAMES[key] });

function findUnit(text) {
  const t = text.toLowerCase().replace(/^(?:a|an|the|one)\s+/, '').replace(/[.?!]+$/, '').replace(/\s+/g, ' ').trim();
  return lookup.get(t) ?? lookup.get(t.replace(/^degrees? /, '')) ?? null;
}

function toKelvin(v, key) {
  if (key === 'c') return v + 273.15;
  if (key === 'f') return (v - 32) * (5 / 9) + 273.15;
  return v;
}
function fromKelvin(v, key) {
  if (key === 'c') return v - 273.15;
  if (key === 'f') return (v - 273.15) * (9 / 5) + 32;
  return v;
}

const tidy = (n) => formatNumber(Math.abs(n) >= 1 ? Math.round(n * 1e4) / 1e4 : Number(n.toPrecision(4)));

/**
 * Parses "5 km to miles", "convert 100f to c", "how many cm in an inch".
 * Returns { text } or null when the message isn't a conversion.
 */
export function tryConvert(raw) {
  const s = raw.toLowerCase().replace(/,(?=\d{3})/g, '').replace(/[?!]+$/, '').trim();
  let m = s.match(/(?:^|\b(?:convert|what is|what's|whats|how much is|how many|is))\s*(-?\d*\.?\d+)\s*([a-z°'"/ .2-3]+?)\s+(?:to|in|into|as|=|in to)\s+([a-z°'"/ 2-3]+?)\s*$/);
  let value; let fromText; let toText;
  if (m) {
    [, value, fromText, toText] = m;
  } else if ((m = s.match(/how many\s+([a-z°'"/ 2-3]+?)\s+(?:are |is )?(?:in|per|make up)\s+(?:an?|one|the)?\s*(-?\d*\.?\d+)?\s*([a-z°'"/ 2-3]+?)\s*$/))) {
    [, toText, value, fromText] = m;
    value = value ?? '1';
  } else if ((m = s.match(/^(-?\d*\.?\d+)\s*([a-z°'"/ .2-3]+?)\s+(?:to|in|into|as)\s+([a-z°'"/ 2-3]+)$/))) {
    [, value, fromText, toText] = m;
  } else {
    return null;
  }

  const num = parseFloat(value);
  if (!Number.isFinite(num)) return null;
  if (CURRENCIES.test(fromText) || CURRENCIES.test(toText) || CURRENCIES.test(raw)) {
    return { text: "💱 I can't do currency conversion: exchange rates change every minute, and I'm an offline noodle with no live data. A quick web search will give you today's rate!" };
  }
  const from = findUnit(fromText);
  const to = findUnit(toText);
  if (!from || !to) {
    if (from || to) {
      const unknown = (from ? toText : fromText).trim();
      return { text: `📏 I don't know the unit "${unknown}" yet. I know length, mass, volume, temperature, speed, time, area and data sizes.` };
    }
    return null;
  }
  if (from.dim !== to.dim) {
    return { text: `🍎🍊 Can't convert ${from.name} to ${to.name}: one is ${from.dim} and the other is ${to.dim}. That's apples and oranges!` };
  }
  let result;
  if (from.dim === 'temperature') {
    const kelvin = toKelvin(num, from.key);
    if (kelvin < -1e-9) return { text: `🥶 ${formatNumber(num)}${from.name} is colder than absolute zero, which physics doesn't allow. Nice try though!` };
    result = fromKelvin(kelvin, to.key);
    let quip = '';
    const c = fromKelvin(kelvin, 'c');
    if (c >= 100) quip = ' Hot enough to boil water! ♨️';
    else if (c >= 40) quip = ' That\'s a Dubai summer afternoon. 🥵';
    else if (c <= 0) quip = ' Brr, freezing! 🧊';
    return { text: `🌡️ ${formatNumber(num)}${from.name} = **${formatNumber(Math.round(result * 10) / 10)}${to.name}**.${quip}` };
  }
  if (num < 0 && from.dim !== 'time') {
    return { text: `🤔 A negative amount of ${from.name}? My noodle can't picture that one.` };
  }
  result = (num * from.factor) / to.factor;
  return { text: `📏 ${formatNumber(num)} ${num === 1 ? singular(from.name) : from.name} = **${tidy(result)} ${to.name}**` };
}

function singular(name) {
  if (name === 'feet') return 'foot';
  if (name === 'inches') return 'inch';
  if (name === 'km/h' || name === 'mph' || name.endsWith(' per second') || name === 'stone') return name;
  return name.replace(/s$/, '').replace(/ies$/, 'y');
}

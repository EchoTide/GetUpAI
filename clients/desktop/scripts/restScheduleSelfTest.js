function localMinuteOfDay(date) {
  return date.getHours() * 60 + date.getMinutes();
}

function computeRestUntil(now, settings) {
  if (!settings.restEnabled) return null;
  const m = localMinuteOfDay(new Date(now));
  const base = new Date(now);
  let best = null;
  for (const w of settings.restWindows) {
    if (!w.enabled) continue;
    const start = w.startMinute;
    const end = w.endMinute;
    const inRange = start < end ? m >= start && m < end : m >= start || m < end;
    if (!inRange) continue;
    const endDate = new Date(base);
    endDate.setHours(Math.floor(end / 60), end % 60, 0, 0);
    if (start < end) {
      if (endDate.getTime() <= now) endDate.setDate(endDate.getDate() + 1);
    } else {
      if (m >= start) endDate.setDate(endDate.getDate() + 1);
    }
    const ts = endDate.getTime();
    if (best === null || ts < best) best = ts;
  }
  return best;
}

function assert(name, condition) {
  if (!condition) {
    throw new Error(`Assertion failed: ${name}`);
  }
}

function ts(y, mo, d, h, mi) {
  return new Date(y, mo - 1, d, h, mi, 0, 0).getTime();
}

const settings = {
  restEnabled: true,
  restWindows: [{ enabled: true, startMinute: 12 * 60, endMinute: 13 * 60 }],
};

const now1 = ts(2026, 1, 29, 12, 30);
const until1 = computeRestUntil(now1, settings);
assert('noon rest active', until1 !== null);
assert('noon rest ends same day 13:00', until1 === ts(2026, 1, 29, 13, 0));

const now2 = ts(2026, 1, 29, 11, 30);
const until2 = computeRestUntil(now2, settings);
assert('outside noon rest', until2 === null);

const wrapSettings = {
  restEnabled: true,
  restWindows: [{ enabled: true, startMinute: 23 * 60, endMinute: 1 * 60 }],
};

const now3 = ts(2026, 1, 29, 23, 30);
const until3 = computeRestUntil(now3, wrapSettings);
assert('wrap rest active late', until3 !== null);
assert('wrap rest ends next day 01:00', until3 === ts(2026, 1, 30, 1, 0));

const now4 = ts(2026, 1, 29, 0, 30);
const until4 = computeRestUntil(now4, wrapSettings);
assert('wrap rest active early', until4 !== null);
assert('wrap rest ends same day 01:00', until4 === ts(2026, 1, 29, 1, 0));

console.log('restScheduleSelfTest: OK');

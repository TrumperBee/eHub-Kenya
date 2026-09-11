// All Friday Drops scheduling uses East Africa Time (EAT = UTC+3).
//
// BUSINESS RULE:
//   - A seller may SUBMIT a drop any day.
//   - A drop is ACTIVE only during the Friday 24-hour window:
//       00:00:00.000 EAT  ->  23:59:59.999 EAT  (the whole Friday day).
//   - The Friday a drop binds to:
//       submitted on Friday (any time)  -> the CURRENT Friday
//       submitted any other day         -> the NEXT Friday.
//
// Drop states are derived from this:
//   scheduled (upcoming)  now < Friday 00:00:00 EAT
//   live                  inside the Friday window
//   expired               after Friday 23:59:59.999 EAT

const EAT_OFFSET_MS = 3 * 60 * 60 * 1000;

function eatParts(date) {
  return new Date(date.getTime() + EAT_OFFSET_MS);
}

function eatISODate(eat) {
  return `${eat.getUTCFullYear()}-${String(eat.getUTCMonth() + 1).padStart(2, '0')}-${String(eat.getUTCDate()).padStart(2, '0')}`;
}

function eatDateToUTC(eat) {
  return new Date(eat.getTime() - EAT_OFFSET_MS);
}

export function getEATDate(date = new Date()) {
  return eatISODate(eatParts(date));
}

export function getEATYear(date = new Date()) {
  return eatParts(date).getUTCFullYear();
}

export function getEATDay(date = new Date()) {
  return eatParts(date).getUTCDay();
}

export function isFriday(date = new Date()) {
  return getEATDay(date) === 5;
}

// True during the entire Friday (00:00–23:59:59.999 EAT).
export function isDropLive(date = new Date()) {
  return getEATDay(date) === 5;
}

/**
 * The Friday (at 00:00 EAT) that a drop submitted at `date` binds to.
 * Friday submissions bind to the CURRENT Friday; any other day binds to the NEXT Friday.
 */
export function getTargetFridayMs(date = new Date()) {
  const nowEAT = eatParts(date);
  const day = nowEAT.getUTCDay();
  const diff = (5 - day + 7) % 7; // 0 on Friday (current), otherwise days until next Friday
  const fridayEAT = new Date(nowEAT);
  fridayEAT.setUTCDate(fridayEAT.getUTCDate() + diff);
  fridayEAT.setUTCHours(0, 0, 0, 0); // 00:00 EAT
  return eatDateToUTC(fridayEAT);
}

/**
 * The next Friday at 00:00 EAT, strictly after `date`.
 * Used only for the "upcoming" countdown (never during a live Friday).
 */
export function getNextFriday(date = new Date()) {
  const nowEAT = eatParts(date);
  const day = nowEAT.getUTCDay();
  let diff = (5 - day + 7) % 7;
  if (diff === 0) diff = 7; // already Friday -> following Friday
  const fridayEAT = new Date(nowEAT);
  fridayEAT.setUTCDate(fridayEAT.getUTCDate() + diff);
  fridayEAT.setUTCHours(0, 0, 0, 0);
  return eatDateToUTC(fridayEAT);
}

// ISO EAT date (YYYY-MM-DD) of the Friday a submission at `date` binds to.
export function getUpcomingFridayISO(date = new Date()) {
  return eatISODate(eatParts(getTargetFridayMs(date)));
}

export function getTimeUntilFriday(date = new Date()) {
  const target = getNextFriday(date).getTime();
  let diff = Math.max(0, target - date.getTime());
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  return { days, hours, minutes, seconds };
}

// Time remaining in the current Friday window (used for the LIVE "Ends in" countdown).
export function getTimeUntilDropEnd(date = new Date()) {
  const end = getDropWindowEndMs(getEATDate(date));
  let diff = Math.max(0, end - date.getTime());
  const totalHours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  return { days: Math.floor(totalHours / 24), hours: totalHours, minutes, seconds };
}

export function getWeekNumber(date = new Date()) {
  const d = eatParts(date);
  const base = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = (base.getUTCDay() + 6) % 7;
  base.setUTCDate(base.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(base.getUTCFullYear(), 0, 4));
  const firstDayNum = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNum + 3);
  const week = 1 + Math.round((base - firstThursday) / (7 * 24 * 60 * 60 * 1000));
  return week;
}

export function getCurrentDropWeek(date = new Date()) {
  const fridayISO = getUpcomingFridayISO(date);
  const friday = new Date(`${fridayISO}T12:00:00Z`);
  return {
    year: Number(fridayISO.slice(0, 4)),
    weekNum: getWeekNumber(friday),
    fridayISO,
  };
}

export function calcDiscount(regularPrice, dropPrice) {
  const r = Number(regularPrice) || 0;
  const d = Number(dropPrice) || 0;
  if (r <= 0 || d <= 0 || d >= r) return 0;
  return Math.round(((r - d) / r) * 100);
}

// Go live is 00:00:00 EAT Friday = 21:00:00 UTC on the day before fridayDateISO.
export function getDropGoLiveMs(fridayDateISO) {
  const [y, m, d] = String(fridayDateISO).split('-').map(Number);
  return Date.UTC(y, m - 1, d - 1, 21, 0, 0, 0);
}

// Window ends 23:59:59.999 EAT Friday = 20:59:59.999 UTC on fridayDateISO.
export function getDropWindowEndMs(fridayDateISO) {
  const [y, m, d] = String(fridayDateISO).split('-').map(Number);
  return Date.UTC(y, m - 1, d, 20, 59, 59, 999);
}

export function classifyDrop(drop, now = new Date()) {
  if (!drop || !drop.fridayDateISO) return 'expired';
  if (drop.status === 'expired') return 'expired';
  if (drop.status !== 'approved') return 'expired'; // pending/rejected are not purchasable
  const nowMs = now.getTime();
  if (nowMs < getDropGoLiveMs(drop.fridayDateISO)) return 'scheduled';
  if (nowMs > getDropWindowEndMs(drop.fridayDateISO)) return 'expired';
  return 'live';
}

export function isDropRecordLive(drop, now = new Date()) {
  return classifyDrop(drop, now) === 'live';
}

export function isDropRecordUpcoming(drop, now = new Date()) {
  return classifyDrop(drop, now) === 'scheduled';
}

// Human label for the drop lifecycle states used across the UI.
export function dropStateLabel(drop, now = new Date()) {
  if (classifyDrop(drop, now) === 'expired') return 'expired';
  return classifyDrop(drop, now);
}

// "Friday, 11 Sep 2026" style label for an EAT calendar date.
const FRIDAY_WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function formatFridayLabel(isoDate) {
  if (!isoDate) return '';
  const date = new Date(`${isoDate}T12:00:00Z`);
  const parts = new Intl.DateTimeFormat('en-KE', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' }).formatToParts(date);
  const map = {};
  parts.forEach((p) => { if (p.type !== 'literal') map[p.type] = p.value; });
  return `${map.weekday || FRIDAY_WEEKDAYS[date.getUTCDay()]}, ${map.day || date.getUTCDate()} ${map.month || ''} ${map.year || ''}`.trim();
}

// Copy for the active window text.
export const FRIDAY_ACTIVE_PERIOD = '12:00 AM – 11:59 PM EAT';
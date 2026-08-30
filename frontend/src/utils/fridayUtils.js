// All Friday Drops scheduling uses East Africa Time (EAT = UTC+3).

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

export function isDropLive(date = new Date()) {
  const eat = eatParts(date);
  return eat.getUTCDay() === 5 && eat.getUTCHours() >= 12;
}

export function getNextFriday(date = new Date()) {
  const nowEAT = eatParts(date);
  const day = nowEAT.getUTCDay();
  let diff = (5 - day + 7) % 7;
  if (diff === 0 && nowEAT.getUTCHours() >= 12) diff = 7;
  const fridayEAT = new Date(nowEAT);
  fridayEAT.setUTCDate(fridayEAT.getUTCDate() + diff);
  fridayEAT.setUTCHours(12, 0, 0, 0);
  return eatDateToUTC(fridayEAT);
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

export function getUpcomingFridayISO(date = new Date()) {
  return eatISODate(eatParts(getNextFriday(date)));
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

const FRIDAY_WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function formatFridayLabel(isoDate) {
  if (!isoDate) return '';
  const date = new Date(`${isoDate}T12:00:00Z`);
  const parts = new Intl.DateTimeFormat('en-KE', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' }).formatToParts(date);
  const map = {};
  parts.forEach((p) => { if (p.type !== 'literal') map[p.type] = p.value; });
  return `${map.weekday || FRIDAY_WEEKDAYS[date.getUTCDay()]}, ${map.day || date.getUTCDate()} ${map.month || ''} ${map.year || ''}`.trim();
}
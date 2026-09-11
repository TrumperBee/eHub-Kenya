// Server-side copy of the Friday Drops scheduling rules (EAT = UTC+3) so the
// backend can compute the binding Friday independently of the browser clock.
//
// BUSINESS RULE:
//   - A seller may SUBMIT a drop any day.
//   - A drop binds to: submitted on Friday (EAT) -> the CURRENT Friday,
//     submitted any other day -> the NEXT Friday.
//   - A drop is LIVE only during the whole Friday day EAT.

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

function getEATDay(date = new Date()) {
  return eatParts(date).getUTCDay();
}

function getTargetFridayMs(date = new Date()) {
  const nowEAT = eatParts(date);
  const day = nowEAT.getUTCDay();
  const diff = (5 - day + 7) % 7; // 0 on Friday (current), otherwise days until next Friday
  const fridayEAT = new Date(nowEAT);
  fridayEAT.setUTCDate(fridayEAT.getUTCDate() + diff);
  fridayEAT.setUTCHours(0, 0, 0, 0); // 00:00 EAT
  return eatDateToUTC(fridayEAT);
}

// ISO EAT date (YYYY-MM-DD) of the Friday a submission at `date` binds to.
function getUpcomingFridayISO(date = new Date()) {
  return eatISODate(eatParts(getTargetFridayMs(date)));
}

// ISO-8601 week number (Python/ISO semantics, matches the frontend helper).
function getWeekNumber(date = new Date()) {
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

function getCurrentDropWeek(date = new Date()) {
  const fridayISO = getUpcomingFridayISO(date);
  const friday = new Date(`${fridayISO}T12:00:00Z`);
  return {
    year: Number(fridayISO.slice(0, 4)),
    weekNum: getWeekNumber(friday),
    fridayISO,
  };
}

function isFriday(date = new Date()) {
  return getEATDay(date) === 5;
}

// ISO EAT calendar date (YYYY-MM-DD) for `date`. Used to match a live drop
// (status approved and fridayDateISO === the EAT date "today").
function getEATDateString(date = new Date()) {
  return eatISODate(eatParts(date));
}

module.exports = { getCurrentDropWeek, getUpcomingFridayISO, isFriday, getEATDay, getEATDateString };
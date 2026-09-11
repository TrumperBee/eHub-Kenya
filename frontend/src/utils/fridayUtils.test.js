import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getUpcomingFridayISO,
  getTargetFridayMs,
  getNextFriday,
  getTimeUntilDropEnd,
  isDropLive,
  getDropGoLiveMs,
  getDropWindowEndMs,
  classifyDrop,
  isDropRecordLive,
} from './fridayUtils.js';

// Build a UTC timestamp that reads as the given wall-clock time in EAT (UTC+3).
const eat = (y, m, d, h, min = 0, sec = 0, ms = 0) => Date.UTC(y, m - 1, d, h - 3, min, sec, ms);

const THU_2346 = new Date(eat(2026, 9, 10, 23, 59, 59));
const FRI_0001 = new Date(eat(2026, 9, 11, 0, 1));
const FRI_1200 = new Date(eat(2026, 9, 11, 12, 0));
const FRI_2359 = new Date(eat(2026, 9, 11, 23, 59, 59));
const SAT_0001 = new Date(eat(2026, 9, 12, 0, 1));
const SUN_1200 = new Date(eat(2026, 9, 13, 12, 0));

test('submit on Thursday -> schedules the NEXT Friday', () => {
  assert.equal(getUpcomingFridayISO(THU_2346), '2026-09-11');
});

test('submit on Friday 00:01 EAT -> CURRENT Friday', () => {
  assert.equal(getUpcomingFridayISO(FRI_0001), '2026-09-11');
});

test('submit on Friday 12:00 EAT -> CURRENT Friday', () => {
  assert.equal(getUpcomingFridayISO(FRI_1200), '2026-09-11');
});

test('submit on Friday 23:59 EAT -> CURRENT Friday', () => {
  assert.equal(getUpcomingFridayISO(FRI_2359), '2026-09-11');
});

test('submit on Saturday 00:01 EAT -> NEXT Friday', () => {
  assert.equal(getUpcomingFridayISO(SAT_0001), '2026-09-18');
});

test('submit on Sunday -> NEXT Friday', () => {
  assert.equal(getUpcomingFridayISO(SUN_1200), '2026-09-18');
});

test('target Friday is 00:00 EAT of the bound date', () => {
  assert.equal(getTargetFridayMs(FRI_1200).getTime(), eat(2026, 9, 11, 0, 0));
  assert.equal(getTargetFridayMs(SAT_0001).getTime(), eat(2026, 9, 18, 0, 0));
});

test('getNextFriday (countdown) is the strictly-next Friday 00:00 EAT', () => {
  assert.equal(getNextFriday(SAT_0001).getTime(), eat(2026, 9, 18, 0, 0));
  assert.equal(getNextFriday(FRI_1200).getTime(), eat(2026, 9, 18, 0, 0));
  assert.equal(getNextFriday(THU_2346).getTime(), eat(2026, 9, 11, 0, 0));
});

test('go-live is 00:00:00 EAT Friday (21:00 UTC the day before)', () => {
  assert.equal(getDropGoLiveMs('2026-09-11'), Date.UTC(2026, 8, 10, 21, 0, 0, 0));
  assert.equal(getDropGoLiveMs('2026-09-11'), eat(2026, 9, 11, 0, 0));
  assert.equal(getDropGoLiveMs('2026-09-18'), eat(2026, 9, 18, 0, 0));
});

test('window ends 23:59:59.999 EAT Friday', () => {
  assert.equal(getDropWindowEndMs('2026-09-11'), Date.UTC(2026, 8, 11, 20, 59, 59, 999));
});

test('isDropLive is true for the whole Friday, false otherwise', () => {
  assert.equal(isDropLive(FRI_0001), true);
  assert.equal(isDropLive(FRI_1200), true);
  assert.equal(isDropLive(FRI_2359), true);
  assert.equal(isDropLive(THU_2346), false);
  assert.equal(isDropLive(SAT_0001), false);
});

const FRI_DROP = { status: 'approved', fridayDateISO: '2026-09-11' };

test('approved drop is scheduled before Friday 00:00 EAT', () => {
  assert.equal(classifyDrop(FRI_DROP, THU_2346), 'scheduled');
  assert.equal(isDropRecordLive(FRI_DROP, THU_2346), false);
});

test('approved drop is live at Friday 00:00 EAT', () => {
  assert.equal(classifyDrop(FRI_DROP, new Date(eat(2026, 9, 11, 0, 0))), 'live');
});

test('approved drop is live at Friday 23:59:59.999 EAT', () => {
  assert.equal(classifyDrop(FRI_DROP, new Date(eat(2026, 9, 11, 23, 59, 59, 999))), 'live');
});

test('approved drop is expired at Saturday 00:00 EAT', () => {
  assert.equal(classifyDrop(FRI_DROP, SAT_0001), 'expired');
});

test('status-expired drop is always expired', () => {
  assert.equal(classifyDrop({ status: 'expired', fridayDateISO: '2026-09-11' }, FRI_1200), 'expired');
});

test('pending and rejected drops are not purchasable (not live)', () => {
  assert.equal(classifyDrop({ status: 'pending', fridayDateISO: '2026-09-11' }, FRI_1200), 'expired');
  assert.equal(classifyDrop({ status: 'rejected', fridayDateISO: '2026-09-11' }, FRI_1200), 'expired');
});

test('drop with no date is expired', () => {
  assert.equal(classifyDrop({ status: 'approved' }, FRI_1200), 'expired');
  assert.equal(classifyDrop(null, FRI_1200), 'expired');
});

test('Ends-in countdown inside the Friday window counts toward the window end', () => {
  const t = getTimeUntilDropEnd(new Date(eat(2026, 9, 11, 23, 58, 30)));
  assert.equal(t.hours, 0);
  assert.equal(t.minutes, 1);
  assert.ok(t.seconds <= 30);
  assert.ok(t.seconds >= 29);
});
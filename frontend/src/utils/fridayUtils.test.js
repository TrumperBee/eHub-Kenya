import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyDrop, isDropRecordLive, isDropRecordUpcoming, getDropGoLiveMs } from './fridayUtils.js';

const FRI = '2026-08-07'; // a Friday's EAT date

function ms(y, m, d, h, min = 0) {
  return Date.UTC(y, m - 1, d, h, min, 0, 0);
}

// Go live is 12:00 EAT = 09:00 UTC on the drop date.
test('go-live is EAT 12:00 (09:00 UTC) of the drop date', () => {
  assert.equal(getDropGoLiveMs(FRI), ms(2026, 8, 7, 9));
});

test('approved drop before go-live is upcoming', () => {
  const drop = { status: 'approved', fridayDateISO: FRI };
  assert.equal(classifyDrop(drop, new Date(ms(2026, 8, 7, 8, 59))), 'upcoming');
  assert.equal(isDropRecordUpcoming(drop, new Date(ms(2026, 8, 7, 8, 59))), true);
  assert.equal(isDropRecordLive(drop, new Date(ms(2026, 8, 7, 8, 59))), false);
});

test('approved drop at/beyond go-live is live', () => {
  const drop = { status: 'approved', fridayDateISO: FRI };
  assert.equal(classifyDrop(drop, new Date(ms(2026, 8, 7, 9))), 'live');
  assert.equal(classifyDrop(drop, new Date(ms(2026, 8, 9, 0))), 'live'); // later in the week
  assert.equal(isDropRecordLive(drop, new Date(ms(2026, 8, 7, 9))), true);
});

test('approved drop after its week window is expired', () => {
  const drop = { status: 'approved', fridayDateISO: FRI };
  // window ends just before the NEXT Friday 09:00 UTC (7 days later)
  assert.equal(classifyDrop(drop, new Date(ms(2026, 8, 14, 9))), 'expired');
  assert.equal(isDropRecordLive(drop, new Date(ms(2026, 8, 14, 9))), false);
});

test('status-expired drop is always expired even mid-window', () => {
  const drop = { status: 'expired', fridayDateISO: FRI };
  assert.equal(classifyDrop(drop, new Date(ms(2026, 8, 8, 0))), 'expired');
});

test('pending and rejected drops are not purchasable (treated expired)', () => {
  assert.equal(classifyDrop({ status: 'pending', fridayDateISO: FRI }, new Date(ms(2026, 8, 8, 0))), 'expired');
  assert.equal(classifyDrop({ status: 'rejected', fridayDateISO: FRI }, new Date(ms(2026, 8, 8, 0))), 'expired');
});

test('drop with no date is expired', () => {
  assert.equal(classifyDrop({ status: 'approved' }, new Date(ms(2026, 8, 8, 0))), 'expired');
  assert.equal(classifyDrop(null, new Date(ms(2026, 8, 8, 0))), 'expired');
});

test('multi-day (Monday) drop is live once the Friday has passed that week', () => {
  const drop = { status: 'approved', fridayDateISO: FRI };
  assert.equal(classifyDrop(drop, new Date(ms(2026, 8, 10, 12))), 'live'); // following Monday
});

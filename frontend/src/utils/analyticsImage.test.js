import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  ANALYTICS_IMAGE_SIZE,
  ANALYTICS_FOOTER_HEIGHT,
  analyticsDateStamp,
  analyticsImageFileName,
  analyticsFooterDate,
  analyticsImageLayout,
} from './analyticsImage.js';

test('export is a square image with a footer bar', () => {
  assert.equal(ANALYTICS_IMAGE_SIZE, 1080);
  assert.equal(ANALYTICS_FOOTER_HEIGHT, 120);
});

test('file name uses local date in YYYY-MM-DD form', () => {
  const date = new Date(2026, 10, 22, 23, 45);
  assert.equal(analyticsDateStamp(date), '2026-11-22');
  assert.equal(analyticsImageFileName(date), 'ehubmarket-stats-2026-11-22.png');
});

test('single digit months and days are zero padded', () => {
  assert.equal(analyticsDateStamp(new Date(2026, 0, 5)), '2026-01-05');
});

test('footer date is readable', () => {
  assert.equal(analyticsFooterDate(new Date(2026, 10, 22)), '22 Nov 2026');
});

test('capture is scaled to fit the square without stretching', () => {
  const layout = analyticsImageLayout(1000, 500);
  assert.equal(layout.width, 1016);
  assert.equal(layout.height, 508);
  assert.equal(layout.x, 32);
  assert.ok(layout.y > 32);
});

test('tall captures stay above the branded footer', () => {
  const layout = analyticsImageLayout(600, 1800);
  assert.ok(layout.y >= 32);
  assert.ok(layout.y + layout.height <= ANALYTICS_IMAGE_SIZE - ANALYTICS_FOOTER_HEIGHT);
});

test('degenerate dimensions do not produce NaN', () => {
  const layout = analyticsImageLayout(0, 0);
  assert.ok(Number.isFinite(layout.x) && Number.isFinite(layout.y));
  assert.ok(layout.width > 0 && layout.height > 0);
});

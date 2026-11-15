import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_MAINTENANCE_MESSAGE,
  isMaintenanceExemptPath,
  normalizeMaintenanceDoc,
  resolveMaintenanceMessage,
} from './maintenance.js';
import { ADMIN_ROUTE } from './constants.js';

test('admin route is exempt from the maintenance page', () => {
  assert.equal(isMaintenanceExemptPath(ADMIN_ROUTE), true);
  assert.equal(isMaintenanceExemptPath(`${ADMIN_ROUTE}/orders`), true);
  assert.equal(isMaintenanceExemptPath(`${ADMIN_ROUTE}/disputes`), true);
});

test('storefront routes are not exempt', () => {
  assert.equal(isMaintenanceExemptPath('/'), false);
  assert.equal(isMaintenanceExemptPath('/browse'), false);
  assert.equal(isMaintenanceExemptPath('/orders/abc'), false);
  assert.equal(isMaintenanceExemptPath('/login'), false);
});

test('a lookalike admin prefix does not grant an exemption', () => {
  assert.equal(isMaintenanceExemptPath(`${ADMIN_ROUTE}-evil`), false);
  assert.equal(isMaintenanceExemptPath('/hub-command'), false);
});

test('only a literal true enables maintenance mode', () => {
  assert.equal(normalizeMaintenanceDoc({ enabled: true }).enabled, true);
  assert.equal(normalizeMaintenanceDoc({ enabled: 'true' }).enabled, false);
  assert.equal(normalizeMaintenanceDoc({ enabled: false }).enabled, false);
  assert.equal(normalizeMaintenanceDoc({}).enabled, false);
  assert.equal(normalizeMaintenanceDoc(null).enabled, false);
});

test('custom message is preserved, non-strings fall back to empty', () => {
  assert.equal(normalizeMaintenanceDoc({ enabled: true, message: 'Back at 6pm' }).message, 'Back at 6pm');
  assert.equal(normalizeMaintenanceDoc({ message: 42 }).message, '');
});

test('blank or missing custom message falls back to the default copy', () => {
  assert.equal(resolveMaintenanceMessage(''), DEFAULT_MAINTENANCE_MESSAGE);
  assert.equal(resolveMaintenanceMessage('   '), DEFAULT_MAINTENANCE_MESSAGE);
  assert.equal(resolveMaintenanceMessage(undefined), DEFAULT_MAINTENANCE_MESSAGE);
  assert.equal(resolveMaintenanceMessage('Upgrading payments tonight'), 'Upgrading payments tonight');
});

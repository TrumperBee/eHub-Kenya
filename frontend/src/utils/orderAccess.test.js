import test from 'node:test';
import assert from 'node:assert/strict';
import { canViewOrder, isAdminUser } from './orderAccess.js';
import { ADMIN_EMAIL } from './constants.js';

const order = { buyerId: 'buyer-1', sellerId: 'seller-1' };
const buyer = { uid: 'buyer-1', email: 'buyer@test.com' };
const seller = { uid: 'seller-1', email: 'seller@test.com' };
const stranger = { uid: 'stranger', email: 'stranger@test.com' };
const admin = { uid: 'admin-1', email: ADMIN_EMAIL };

test('buyer can view their own order', () => {
  assert.equal(canViewOrder(order, buyer), true);
});

test('seller can view the order they sold', () => {
  assert.equal(canViewOrder(order, seller), true);
});

test('admin can view any order', () => {
  assert.equal(canViewOrder(order, admin), true);
});

test('stranger cannot view another user order', () => {
  assert.equal(canViewOrder(order, stranger), false);
});

test('no user means no access', () => {
  assert.equal(canViewOrder(order, null), false);
});

test('no order means no access', () => {
  assert.equal(canViewOrder(null, buyer), false);
});

test('isAdminUser only true for the configured admin email', () => {
  assert.equal(isAdminUser(admin), true);
  assert.equal(isAdminUser(buyer), false);
  assert.equal(isAdminUser(null), false);
});
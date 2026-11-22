import { test } from 'node:test';
import assert from 'node:assert/strict';

import { resolveAuthRedirect, resolvePostSetupRedirect } from './authRedirect.js';

test('no redirect information defaults to the home page', () => {
  assert.equal(resolveAuthRedirect({}), '/');
  assert.equal(resolveAuthRedirect({ state: {}, search: '' }), '/');
});

test('auth guards store the original location in state.from', () => {
  assert.equal(
    resolveAuthRedirect({
      state: { from: { pathname: '/orders', search: '?tab=active', hash: '#top' } },
    }),
    '/orders?tab=active#top'
  );
  assert.equal(resolveAuthRedirect({ state: { from: '/saved' } }), '/saved');
});

test('a redirect query parameter is honoured', () => {
  assert.equal(resolveAuthRedirect({ search: '?redirect=/dashboard' }), '/dashboard');
  assert.equal(resolveAuthRedirect({ search: '?from=/orders&x=1' }), '/orders');
  assert.equal(resolveAuthRedirect({ search: '?next=/saved' }), '/saved');
});

test('external and protocol-relative destinations cannot be used as open redirects', () => {
  assert.equal(resolveAuthRedirect({ search: '?redirect=https://evil.example.com' }), '/');
  assert.equal(resolveAuthRedirect({ search: '?redirect=//evil.example.com' }), '/');
  assert.equal(resolveAuthRedirect({ state: { from: 'https://evil.example.com' } }), '/');
});

test('username setup never sends the user back to itself', () => {
  assert.equal(
    resolvePostSetupRedirect({ state: { from: { pathname: '/setup-username' } } }),
    '/'
  );
  assert.equal(
    resolvePostSetupRedirect({ state: { from: { pathname: '/orders' } } }),
    '/orders'
  );
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveImageUrl,
  isSignedStorageUrl,
} from './imageUrl.js';

test('Cloudinary URLs get an automatic delivery transform', () => {
  const url = resolveImageUrl(
    'https://res.cloudinary.com/demo/image/upload/v1700000000/squad.jpg',
    { width: 640 }
  );
  assert.equal(
    url,
    'https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,c_limit,w_640/v1700000000/squad.jpg'
  );
});

test('an existing Cloudinary transform chain is never doubled', () => {
  const original =
    'https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,w_400/v1/squad.jpg';
  assert.equal(resolveImageUrl(original), original);
});

test('unrelated absolute and relative URLs are returned unchanged', () => {
  assert.equal(
    resolveImageUrl('https://images.example.com/a.jpg'),
    'https://images.example.com/a.jpg'
  );
  assert.equal(resolveImageUrl('/logo.png'), '/logo.png');
});

test('missing or invalid sources resolve to null', () => {
  assert.equal(resolveImageUrl(''), null);
  assert.equal(resolveImageUrl('   '), null);
  assert.equal(resolveImageUrl(undefined), null);
  assert.equal(resolveImageUrl(42), null);
  assert.equal(resolveImageUrl('http://'), null);
});

test('signed storage links are detected so they are never cached', () => {
  assert.equal(
    isSignedStorageUrl(
      'https://bucket.r2.cloudflarestorage.com/key.jpg?X-Amz-Signature=abc'
    ),
    true
  );
  assert.equal(
    isSignedStorageUrl('https://res.cloudinary.com/demo/image/upload/a.jpg'),
    false
  );
  assert.equal(isSignedStorageUrl(null), false);
});

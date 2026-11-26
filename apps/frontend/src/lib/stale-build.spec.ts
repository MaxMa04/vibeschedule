import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isStaleBuildError } from './stale-build';

test('recognises chunk errors of an old build', () => {
  const chunk = new Error('Loading chunk 123 failed.');
  chunk.name = 'ChunkLoadError';
  assert.equal(isStaleBuildError(chunk), true);
  assert.equal(
    isStaleBuildError(new Error('Failed to load chunk /_next/static/chunks/abc.js')),
    true
  );
  assert.equal(
    isStaleBuildError(new TypeError('Failed to fetch dynamically imported module: x.js')),
    true
  );
});

test('leaves ordinary errors alone', () => {
  assert.equal(isStaleBuildError(new TypeError('(r || []).map is not a function')), false);
  assert.equal(isStaleBuildError(undefined), false);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseSaved,
  pickFilters,
  restoreQuery,
  sameFilters,
} from './persisted-filters';
import { channelMatches } from '../components/team/channel-match';

const keys = ['app', 'user', 'days'] as const;

test('picks only the filter keys with a value', () => {
  assert.deepEqual(pickFilters('app=a1&user=&post=p1&days=30', keys), {
    app: 'a1',
    days: '30',
  });
});

test('restores the saved filters when the page opens without them', () => {
  const next = restoreQuery('', keys, { app: 'a1', user: 'me' });
  assert.equal(next, 'app=a1&user=me');
});

test('a link into the page wins, missing keys come from the saved filters', () => {
  const next = restoreQuery('days=90&account=c1', keys, {
    app: 'a1',
    days: '7',
  });
  assert.deepEqual(pickFilters(next!, [...keys, 'account']), {
    app: 'a1',
    days: '90',
    account: 'c1',
  });
});

test('nothing to restore gives null, so the page does not navigate', () => {
  assert.equal(restoreQuery('app=a1', keys, { app: 'a2' }), null);
  assert.equal(restoreQuery('post=p1', keys, {}), null);
});

test('keeps params that are not filters', () => {
  assert.equal(
    restoreQuery('startDate=2026-11-23', keys, { user: 'u1' }),
    'startDate=2026-11-23&user=u1'
  );
});

test('ignores broken or foreign storage values', () => {
  assert.deepEqual(parseSaved(null, keys), {});
  assert.deepEqual(parseSaved('{oops', keys), {});
  assert.deepEqual(parseSaved('["app"]', keys), {});
  assert.deepEqual(
    parseSaved('{"app":"a1","user":5,"days":"","other":"x"}', keys),
    { app: 'a1' }
  );
});

test('compares filter states by value', () => {
  assert.equal(sameFilters({ app: 'a' }, { app: 'a' }), true);
  assert.equal(sameFilters({ app: 'a' }, { app: 'a', user: 'me' }), false);
  assert.equal(sameFilters({}, {}), true);
});

test('filters channels by app and responsible user like the API', () => {
  const channel = { app: { id: 'a1' }, users: [{ id: 'u1' }] };
  const loose = { app: null, users: [] };
  assert.equal(channelMatches(channel, {}), true);
  assert.equal(channelMatches(channel, { app: 'a1' }), true);
  assert.equal(channelMatches(channel, { app: 'a2' }), false);
  assert.equal(channelMatches(channel, { app: 'none' }), false);
  assert.equal(channelMatches(loose, { app: 'none' }), true);
  assert.equal(channelMatches(channel, { user: 'u1' }), true);
  assert.equal(channelMatches(channel, { user: 'me' }, 'u1'), true);
  assert.equal(channelMatches(channel, { user: 'me' }, 'u2'), false);
  assert.equal(channelMatches(channel, { user: 'me' }), false);
  assert.equal(channelMatches(loose, { user: 'u1' }), false);
  assert.equal(channelMatches(channel, { app: 'a1', user: 'u2' }), false);
});

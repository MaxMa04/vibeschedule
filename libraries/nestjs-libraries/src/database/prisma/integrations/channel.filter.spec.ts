import { test } from 'node:test';
import assert from 'node:assert/strict';
import { channelFilter, channelWhere } from './channel.filter';

test('no params means all channels', () => {
  assert.deepEqual(channelFilter({}), {});
  assert.deepEqual(channelFilter({ app: '', user: ' ' }, 'u1'), {});
  assert.deepEqual(channelWhere(channelFilter({})), {});
  assert.deepEqual(channelWhere(), {});
});

test('app filters by app id, none means without app', () => {
  assert.deepEqual(channelFilter({ app: 'a1' }), { appId: 'a1' });
  assert.deepEqual(channelFilter({ app: 'none' }), { appId: null });
  assert.deepEqual(channelWhere({ appId: 'a1' }), { appId: 'a1' });
  assert.deepEqual(channelWhere({ appId: null }), { appId: null });
});

test('user filters by responsible user, me is the signed-in user', () => {
  assert.deepEqual(channelFilter({ user: 'u2' }, 'u1'), { userId: 'u2' });
  assert.deepEqual(channelFilter({ user: 'me' }, 'u1'), { userId: 'u1' });
  assert.deepEqual(channelFilter({ user: 'u2' }), { userId: 'u2' });
  assert.deepEqual(channelWhere({ userId: 'u1' }), {
    users: { some: { userId: 'u1' } },
  });
});

test('user=me without a session is rejected', () => {
  assert.throws(() => channelFilter({ user: 'me' }), /Anmeldung/);
});

test('app and user combine', () => {
  assert.deepEqual(
    channelWhere(channelFilter({ app: 'none', user: 'me' }, 'u1')),
    { appId: null, users: { some: { userId: 'u1' } } }
  );
});

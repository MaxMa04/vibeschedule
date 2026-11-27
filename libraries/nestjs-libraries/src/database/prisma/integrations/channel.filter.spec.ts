import { test } from 'node:test';
import assert from 'node:assert/strict';
import { channelFilter, channelWhere, manualListWhere } from './channel.filter';

const clipper = (where = {}) => ({
  user: { organizations: { some: { role: 'CLIPPER', ...where } } },
});

test('no params means all channels', () => {
  assert.deepEqual(channelFilter({}), {});
  assert.deepEqual(
    channelFilter({ app: '', user: ' ', clippers: '' }, 'u1'),
    {}
  );
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
});

test('a user also covers the channels of the clippers they look after', () => {
  assert.deepEqual(channelWhere({ userId: 'u1' }), {
    users: {
      some: { OR: [{ userId: 'u1' }, clipper({ managerId: 'u1' })] },
    },
  });
});

test('clippers=no leaves out clipper channels', () => {
  assert.deepEqual(channelFilter({ clippers: 'no' }), { clippers: false });
  assert.deepEqual(channelFilter({ clippers: 'yes' }), {});
  assert.deepEqual(channelWhere({ clippers: false }), {
    users: { none: clipper() },
  });
  assert.deepEqual(channelWhere({ userId: 'u1', clippers: false }), {
    AND: [
      { users: { some: { userId: 'u1' } } },
      { users: { none: clipper() } },
    ],
  });
});

test('user=me without a session is rejected', () => {
  assert.throws(() => channelFilter({ user: 'me' }), /Anmeldung/);
});

test('app, user and clippers combine', () => {
  assert.deepEqual(
    channelWhere(
      channelFilter({ app: 'none', user: 'me', clippers: 'no' }, 'u1')
    ),
    {
      appId: null,
      AND: [
        { users: { some: { userId: 'u1' } } },
        { users: { none: clipper() } },
      ],
    }
  );
});

test('the team posts by hand on channels without a clipper or their own', () => {
  assert.deepEqual(manualListWhere('u1'), {
    OR: [{ users: { some: { userId: 'u1' } } }, { users: { none: clipper() } }],
  });
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ChannelUsersService } from './channel.users.service';

// a sync that found these new channels from clipper links, the members and
// the channels each user already has
const setup = (
  owned: { channelId: string; userId: string }[],
  roles: Record<string, string>,
  assigned: string[] = []
) => {
  const added: string[] = [];
  const manualOnly: string[] = [];
  const service = new ChannelUsersService(
    {
      addUserChannel: async (userId: string, channelId: string) => {
        const key = `${userId}:${channelId}`;
        if (assigned.includes(key)) {
          return false;
        }
        added.push(key);
        return true;
      },
    } as never,
    {
      getMembers: async (_org: string, ids: string[]) =>
        ids
          .filter((id) => roles[id])
          .map((userId) => ({ userId, role: roles[userId] })),
    } as never,
    {} as never,
    {
      setChannelManualOnly: async (_org: string, id: string, on: boolean) => {
        assert.equal(on, true);
        manualOnly.push(id);
        return { converted: 0 };
      },
    } as never,
    {
      sync: async () => ({ total: 3, added: owned.length, disabled: 0, owned }),
    } as never
  );
  return { service, added, manualOnly };
};

test('a channel from a clipper link lands with the clipper, manual-only', async () => {
  const { service, added, manualOnly } = setup(
    [{ channelId: 'c1', userId: 'clipper' }],
    { clipper: 'CLIPPER' }
  );
  assert.deepEqual(await service.sync('org'), {
    total: 3,
    added: 1,
    disabled: 0,
    assigned: 1,
  });
  assert.deepEqual(added, ['clipper:c1']);
  assert.deepEqual(manualOnly, ['c1']);
});

test('only clippers of the workspace get channels from a link', async () => {
  const { service, added, manualOnly } = setup(
    [
      { channelId: 'c1', userId: 'admin' },
      { channelId: 'c2', userId: 'gone' },
    ],
    { admin: 'ADMIN' }
  );
  assert.equal((await service.sync('org')).assigned, 0);
  assert.deepEqual(added, []);
  assert.deepEqual(manualOnly, []);
});

test('a channel the clipper already has stays as it is', async () => {
  const { service, manualOnly } = setup(
    [{ channelId: 'c1', userId: 'clipper' }],
    { clipper: 'CLIPPER' },
    ['clipper:c1']
  );
  assert.equal((await service.sync('org')).assigned, 0);
  assert.deepEqual(manualOnly, []);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ChannelUsersService } from './channel.users.service';

// a sync that found these new channels from clipper links, the members and
// the channels each user already has
const setup = (
  owned: { channelId: string; userId: string; accountId?: string | null }[],
  roles: Record<string, string>,
  assigned: string[] = []
) => {
  const added: string[] = [];
  const arrived: string[] = [];
  const manualOnly: string[] = [];
  const fees: string[] = [];
  const service = new ChannelUsersService(
    {
      setDefaultClipFee: async (_org: string, id: string, cents: number) => {
        fees.push(`${id}:${cents}`);
      },
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
    } as never,
    {
      channelArrived: async (
        _org: string,
        userId: string,
        channelId: string,
        accountId?: string | null
      ) => {
        arrived.push(`${userId}:${channelId}:${accountId ?? '-'}`);
      },
    } as never
  );
  return { service, added, manualOnly, fees, arrived };
};

test('a channel from a clipper link lands with the clipper, manual-only', async () => {
  const { service, added, manualOnly, fees } = setup(
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
  // the SOP fee, 30 euro a month
  assert.deepEqual(fees, ['c1:3000']);
});

test('a channel from the link of an onboarding account fills that account', async () => {
  const { service, arrived } = setup(
    [{ channelId: 'c1', userId: 'clipper', accountId: 'acc2' }],
    { clipper: 'CLIPPER' }
  );
  await service.sync('org');
  assert.deepEqual(arrived, ['clipper:c1:acc2']);
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
  const { service, manualOnly, arrived } = setup(
    [{ channelId: 'c1', userId: 'clipper' }],
    { clipper: 'CLIPPER' },
    ['clipper:c1']
  );
  assert.equal((await service.sync('org')).assigned, 0);
  assert.deepEqual(manualOnly, []);
  assert.deepEqual(arrived, []);
});

// a clipper with these channels and this many agreed accounts
const connectSetup = (disabled: boolean[], clipperAccounts: number) => {
  const links: (string | undefined)[] = [];
  const service = new ChannelUsersService(
    {
      getUserChannels: async () =>
        disabled.map((off, i) => ({
          id: `c${i}`,
          name: `c${i}`,
          customName: null,
          picture: null,
          providerIdentifier: 'tiktok',
          disabled: off,
        })),
    } as never,
    {
      getMember: async () => ({
        userId: 'clipper',
        role: 'CLIPPER',
        clipperAccounts,
      }),
    } as never,
    {} as never,
    {} as never,
    {
      getConnectUrl: async (
        _org: string,
        _id: string,
        _fields: unknown,
        owner?: string
      ) => {
        links.push(owner);
        return { url: 'https://www.tiktok.com/auth' };
      },
    } as never,
    {} as never
  );
  const clipper = { id: 'clipper', role: 'CLIPPER' } as never;
  return { service, clipper, links };
};

test('a clipper connects accounts up to the agreed number', async () => {
  const { service, clipper, links } = connectSetup([false], 2);
  assert.deepEqual(await service.connectUrl('org', clipper, 'tiktok'), {
    url: 'https://www.tiktok.com/auth',
  });
  assert.deepEqual(links, ['clipper']);
  assert.deepEqual((await service.ownChannels('org', clipper)).maxAccounts, 2);
});

test('no link once all agreed accounts are connected', async () => {
  const { service, clipper, links } = connectSetup([false, false], 2);
  await assert.rejects(
    service.connectUrl('org', clipper, 'tiktok'),
    /alle 2 Accounts/
  );
  assert.deepEqual(links, []);
});

test('a disconnected account does not count, it can be reconnected', async () => {
  const { service, clipper } = connectSetup([false, true], 2);
  await service.connectUrl('org', clipper, 'tiktok');
});

test('only TikTok can be connected from the posting page', async () => {
  const { service, clipper } = connectSetup([], 3);
  await assert.rejects(
    service.connectUrl('org', clipper, 'instagram'),
    /Plattform nicht verfügbar/
  );
});

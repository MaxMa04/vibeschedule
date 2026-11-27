import { PrismaRepository } from '@vibeschedule/nestjs-libraries/database/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { IntegrationTimeDto } from '@vibeschedule/nestjs-libraries/dtos/integrations/integration.time.dto';
import { PfmSocialAccount } from '@vibeschedule/nestjs-libraries/integrations/pfm.client';
import {
  ChannelFilter,
  channelWhere,
} from '@vibeschedule/nestjs-libraries/database/prisma/integrations/channel.filter';
import { TeamUser } from '@vibeschedule/helpers/channels/channel.filter';

// the people responsible for a channel, with their role in the workspace
const channelUsersInclude = (org: string) =>
  ({
    orderBy: { createdAt: 'asc' },
    select: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          organizations: {
            where: { organizationId: org },
            select: { role: true },
          },
        },
      },
    },
  } as const);

type ChannelUserRow = {
  user: {
    id: string;
    name: string | null;
    email: string;
    organizations: { role: TeamUser['role'] }[];
  };
};

export const toTeamUsers = (rows: ChannelUserRow[]): TeamUser[] =>
  rows.flatMap(({ user: { organizations, ...user } }) =>
    organizations[0] ? [{ ...user, role: organizations[0].role }] : []
  );

@Injectable()
export class IntegrationRepository {
  constructor(
    private _integration: PrismaRepository<'integration'>,
    private _posts: PrismaRepository<'post'>,
    private _apps: PrismaRepository<'app'>,
    private _userIntegration: PrismaRepository<'userIntegration'>,
    private _feedFormats: PrismaRepository<'feedPostFormat'>,
    private _inspiration: PrismaRepository<'inspirationLink'>
  ) {}

  getIntegrationsList(org: string, filter?: ChannelFilter) {
    return this._integration.model.integration.findMany({
      where: { organizationId: org, deletedAt: null, ...channelWhere(filter) },
      include: { app: true, users: channelUsersInclude(org) },
    });
  }

  getIntegrationById(org: string, id: string) {
    return this._integration.model.integration.findFirst({
      where: { organizationId: org, id, deletedAt: null },
    });
  }

  getInternalIds(org: string) {
    return this._integration.model.integration.findMany({
      where: { organizationId: org },
      select: { internalId: true, deletedAt: true, disabled: true },
    });
  }

  // a connected account comes back to life even if it was removed before
  async upsertFromPfm(
    org: string,
    account: PfmSocialAccount,
    picture: string | null
  ) {
    const name = account.username || account.platform;
    return this._integration.model.integration.upsert({
      where: {
        organizationId_internalId: {
          organizationId: org,
          internalId: account.id,
        },
      },
      create: {
        organizationId: org,
        internalId: account.id,
        providerIdentifier: account.platform,
        name,
        profile: account.username,
        picture,
      },
      update: {
        name,
        profile: account.username,
        picture,
        disabled: false,
        deletedAt: null,
      },
      select: { id: true },
    });
  }

  async disableMissing(org: string, connectedIds: string[]) {
    const { count } = await this._integration.model.integration.updateMany({
      where: {
        organizationId: org,
        deletedAt: null,
        disabled: false,
        internalId: { notIn: connectedIds },
      },
      data: { disabled: true },
    });
    return count;
  }

  async setTimes(org: string, id: string, times: IntegrationTimeDto) {
    return this._integration.model.integration.update({
      select: { id: true },
      where: { id, organizationId: org },
      data: { postingTimes: JSON.stringify(times.time) },
    });
  }

  async updateProviderSettings(org: string, id: string, settings: string) {
    await this._integration.model.integration.update({
      select: { id: true },
      where: { id, organizationId: org },
      data: { additionalSettings: settings },
    });
  }

  updateCustomName(org: string, id: string, name: string) {
    return this._integration.model.integration.update({
      select: { id: true },
      where: { id, organizationId: org },
      data: { customName: name.trim() || null },
    });
  }

  setApp(org: string, id: string, appId: string | null) {
    return this._integration.model.integration.update({
      select: { id: true },
      where: { id, organizationId: org },
      data: {
        app: !appId ? { disconnect: true } : { connect: { id: appId } },
      },
    });
  }

  getApp(orgId: string, id: string) {
    return this._apps.model.app.findFirst({
      where: { id, orgId, deletedAt: null },
      select: { id: true },
    });
  }

  getAppByName(orgId: string, name: string) {
    return this._apps.model.app.findFirst({
      where: { orgId, name, deletedAt: null },
    });
  }

  apps(orgId: string) {
    return this._apps.model.app.findMany({
      where: { orgId, deletedAt: null },
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { integrations: { where: { deletedAt: null } } },
        },
      },
    });
  }

  createApp(orgId: string, name: string) {
    return this._apps.model.app.create({ data: { orgId, name } });
  }

  updateAppName(orgId: string, id: string, name: string) {
    return this._apps.model.app.update({
      where: { id, orgId },
      data: { name },
    });
  }

  async deleteApp(orgId: string, id: string) {
    await this._integration.model.integration.updateMany({
      where: { organizationId: orgId, appId: id },
      data: { appId: null },
    });
    await this._inspiration.model.inspirationLink.updateMany({
      where: { orgId, appId: id },
      data: { appId: null },
    });
    return this._apps.model.app.update({
      where: { id, orgId },
      data: { deletedAt: new Date() },
    });
  }

  async setDisabled(org: string, id: string, disabled: boolean) {
    await this._integration.model.integration.update({
      select: { id: true },
      where: { id, organizationId: org },
      data: { disabled },
    });
  }

  async setManualOnly(org: string, id: string, manualOnly: boolean) {
    await this._integration.model.integration.update({
      select: { id: true },
      where: { id, organizationId: org },
      data: { manualOnly },
    });
  }

  // adds one responsible user, returns whether the user is new on the channel
  async addUserChannel(userId: string, integrationId: string) {
    const { count } =
      await this._userIntegration.model.userIntegration.createMany({
        data: [{ userId, integrationId }],
        skipDuplicates: true,
      });
    return count > 0;
  }

  // the accounts of one user as the clipper sees them on the posting page
  getUserChannels(org: string, userId: string) {
    return this._integration.model.integration.findMany({
      where: {
        organizationId: org,
        deletedAt: null,
        users: { some: { userId } },
      },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        name: true,
        customName: true,
        picture: true,
        providerIdentifier: true,
        disabled: true,
      },
    });
  }

  // every channel a clipper is responsible for, deleted ones included, so a
  // lost account still shows up in the month it was paid
  getClipperChannels(org: string) {
    const clipper = { organizationId: org, role: 'CLIPPER' as const };
    return this._integration.model.integration.findMany({
      where: {
        organizationId: org,
        users: { some: { user: { organizations: { some: clipper } } } },
      },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        name: true,
        customName: true,
        picture: true,
        providerIdentifier: true,
        disabled: true,
        deletedAt: true,
        clipFeeCents: true,
        clipPostsPerDay: true,
        users: {
          where: { user: { organizations: { some: clipper } } },
          orderBy: { createdAt: 'asc' },
          select: { user: { select: { id: true, name: true, email: true } } },
        },
      },
    });
  }

  // when every post of these channels went out, for the clipper pay
  getPostedTimes(org: string, integrationIds: string[]) {
    return this._posts.model.post.findMany({
      where: {
        organizationId: org,
        integrationId: { in: integrationIds },
        deletedAt: null,
        postedAt: { not: null },
      },
      select: { integrationId: true, postedAt: true },
    });
  }

  // the SOP fee for a channel that just got a clipper, a set fee stays
  async setDefaultClipFee(org: string, id: string, feeCents: number) {
    await this._integration.model.integration.updateMany({
      where: { id, organizationId: org, clipFeeCents: null },
      data: { clipFeeCents: feeCents },
    });
  }

  async setClipPay(
    org: string,
    id: string,
    data: { clipFeeCents: number | null; clipPostsPerDay: number }
  ) {
    const { count } = await this._integration.model.integration.updateMany({
      where: { id, organizationId: org },
      data,
    });
    return count > 0;
  }

  // the channels a user is responsible for; for a clipper also the only
  // channels it may see
  async getUserChannelIds(userId: string) {
    const rows = await this._userIntegration.model.userIntegration.findMany({
      where: { userId, integration: { deletedAt: null } },
      select: { integrationId: true },
    });
    return rows.map((row) => row.integrationId);
  }

  // replaces the channels of a user, returns the ones that are new
  async setUserChannels(org: string, userId: string, ids: string[]) {
    const channels = await this._integration.model.integration.findMany({
      where: { organizationId: org, deletedAt: null, id: { in: ids } },
      select: { id: true },
    });
    const wanted = channels.map((channel) => channel.id);
    const current = await this.getUserChannelIds(userId);

    await this._userIntegration.model.userIntegration.deleteMany({
      where: { userId, integrationId: { notIn: wanted } },
    });
    const added = wanted.filter((id) => !current.includes(id));
    if (added.length) {
      await this._userIntegration.model.userIntegration.createMany({
        data: added.map((integrationId) => ({ userId, integrationId })),
      });
    }
    return { channels: wanted, added };
  }

  // replaces the responsible users of a channel, returns the ones that are new
  async setChannelUsers(integrationId: string, userIds: string[]) {
    const current = (
      await this._userIntegration.model.userIntegration.findMany({
        where: { integrationId },
        select: { userId: true },
      })
    ).map((row) => row.userId);

    await this._userIntegration.model.userIntegration.deleteMany({
      where: { integrationId, userId: { notIn: userIds } },
    });
    const added = userIds.filter((id) => !current.includes(id));
    if (added.length) {
      await this._userIntegration.model.userIntegration.createMany({
        data: added.map((userId) => ({ userId, integrationId })),
      });
    }
    return { added };
  }

  async getChannelUsers(org: string, integrationId: string) {
    return toTeamUsers(
      await this._userIntegration.model.userIntegration.findMany({
        where: { integrationId },
        ...channelUsersInclude(org),
      })
    );
  }

  getPostGroupsForChannel(org: string, id: string) {
    return this._posts.model.post.groupBy({
      by: ['group'],
      where: { organizationId: org, integrationId: id, deletedAt: null },
    });
  }

  deleteChannel(org: string, id: string) {
    return this._integration.model.integration.update({
      select: { id: true },
      where: { id, organizationId: org },
      data: { deletedAt: new Date() },
    });
  }

  getPostingTimes(orgId: string, integrationId?: string) {
    return this._integration.model.integration.findMany({
      where: {
        ...(integrationId ? { id: integrationId } : {}),
        organizationId: orgId,
        disabled: false,
        deletedAt: null,
      },
      select: { postingTimes: true },
    });
  }

  // vibeschedule posts behind feed posts: PfM post id or platform post id
  postsForFeed(
    org: string,
    integrationId: string,
    pfmPostIds: string[],
    releaseIds: string[]
  ) {
    if (!pfmPostIds.length && !releaseIds.length) {
      return Promise.resolve([]);
    }
    return this._posts.model.post.findMany({
      where: {
        organizationId: org,
        integrationId,
        deletedAt: null,
        OR: [
          { pfmPostId: { in: pfmPostIds } },
          { releaseId: { in: releaseIds } },
        ],
      },
      select: {
        id: true,
        pfmPostId: true,
        releaseId: true,
        format: { select: { id: true, name: true } },
      },
    });
  }

  // formats given afterwards to posts published without vibeschedule
  feedFormatsFor(integrationId: string, platformPostIds: string[]) {
    if (!platformPostIds.length) return Promise.resolve([]);
    return this._feedFormats.model.feedPostFormat.findMany({
      where: {
        integrationId,
        platformPostId: { in: platformPostIds },
        format: { deletedAt: null },
      },
      select: {
        platformPostId: true,
        format: { select: { id: true, name: true } },
      },
    });
  }
}

import { PrismaRepository } from '@vibeschedule/nestjs-libraries/database/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { IntegrationTimeDto } from '@vibeschedule/nestjs-libraries/dtos/integrations/integration.time.dto';
import { PfmSocialAccount } from '@vibeschedule/nestjs-libraries/integrations/pfm.client';

@Injectable()
export class IntegrationRepository {
  constructor(
    private _integration: PrismaRepository<'integration'>,
    private _posts: PrismaRepository<'post'>,
    private _customers: PrismaRepository<'customer'>,
    private _userIntegration: PrismaRepository<'userIntegration'>
  ) {}

  getIntegrationsList(org: string) {
    return this._integration.model.integration.findMany({
      where: { organizationId: org, deletedAt: null },
      include: { customer: true },
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
  async upsertFromPfm(org: string, account: PfmSocialAccount) {
    const name = account.username || account.platform;
    await this._integration.model.integration.upsert({
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
        picture: account.profile_photo_url,
      },
      update: {
        name,
        profile: account.username,
        picture: account.profile_photo_url,
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

  async updateOnCustomerName(org: string, id: string, name: string) {
    const customer = !name
      ? undefined
      : (await this._customers.model.customer.findFirst({
          where: { orgId: org, name, deletedAt: null },
        })) ||
        (await this._customers.model.customer.create({
          data: { name, orgId: org },
        }));

    return this._integration.model.integration.update({
      select: { id: true },
      where: { id, organizationId: org },
      data: {
        customer: !customer
          ? { disconnect: true }
          : { connect: { id: customer.id } },
      },
    });
  }

  updateIntegrationGroup(org: string, id: string, group: string) {
    return this._integration.model.integration.update({
      select: { id: true },
      where: { id, organizationId: org },
      data: {
        customer: !group ? { disconnect: true } : { connect: { id: group } },
      },
    });
  }

  getCustomer(orgId: string, id: string) {
    return this._customers.model.customer.findFirst({
      where: { id, orgId, deletedAt: null },
      select: { id: true },
    });
  }

  getCustomerByName(orgId: string, name: string) {
    return this._customers.model.customer.findFirst({
      where: { orgId, name, deletedAt: null },
    });
  }

  updateCustomerName(orgId: string, id: string, name: string) {
    return this._customers.model.customer.update({
      where: { id, orgId },
      data: { name },
    });
  }

  customers(orgId: string) {
    return this._customers.model.customer.findMany({
      where: { orgId, deletedAt: null },
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

  // the channels a clipper may see
  async getUserChannelIds(userId: string) {
    const rows = await this._userIntegration.model.userIntegration.findMany({
      where: { userId, integration: { deletedAt: null } },
      select: { integrationId: true },
    });
    return rows.map((row) => row.integrationId);
  }

  // replaces the channels of a clipper, returns the ones that are new
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
}

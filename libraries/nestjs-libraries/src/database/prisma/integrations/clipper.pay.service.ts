import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { IntegrationRepository } from '@vibeschedule/nestjs-libraries/database/prisma/integrations/integration.repository';
import { OrganizationRepository } from '@vibeschedule/nestjs-libraries/database/prisma/organizations/organization.repository';
import {
  billingDay,
  billingMonth,
  clipperBilling,
  FREE_MISSED_POSTS,
  isBillingMonth,
  MISSED_POST_PENALTY_CENTS,
} from '@vibeschedule/helpers/clippers/clipper.billing';

// What each clipper earns per account and month (rules in clipper.billing.ts)
@Injectable()
export class ClipperPayService {
  constructor(
    private _integrationRepository: IntegrationRepository,
    private _organizationRepository: OrganizationRepository
  ) {}

  async month(orgId: string, month?: string) {
    const today = billingDay(new Date());
    const wanted = month || billingMonth(new Date());
    if (!isBillingMonth(wanted)) {
      throw new BadRequestException('Monat im Format JJJJ-MM angeben');
    }

    const [channels, clipperMembers] = await Promise.all([
      this._integrationRepository.getClipperChannels(orgId),
      this._organizationRepository.getClippers(orgId),
    ]);
    const posted = new Map<string, string[]>();
    for (const post of await this._integrationRepository.getPostedTimes(
      orgId,
      channels.map((c) => c.id)
    )) {
      posted.set(post.integrationId, [
        ...(posted.get(post.integrationId) || []),
        billingDay(post.postedAt!),
      ]);
    }

    // every clipper, also those without an account yet
    const clippers = new Map(
      clipperMembers.map(({ user, clipperAccounts }) => [
        user.id,
        {
          user,
          maxAccounts: clipperAccounts,
          connected: 0,
          channels: [] as unknown[],
          totalCents: 0,
        },
      ])
    );
    for (const channel of channels) {
      const user = channel.users[0]?.user;
      if (!user) {
        continue;
      }
      const ended = !!channel.deletedAt || channel.disabled;
      const bill = clipperBilling({
        month: wanted,
        today,
        monthlyFeeCents: channel.clipFeeCents ?? 0,
        postsPerDay: channel.clipPostsPerDay,
        postedDays: posted.get(channel.id) || [],
        ended,
      });
      // a deleted account without anything in this month is history
      if (channel.deletedAt && !bill.activeDays && !bill.posted) {
        continue;
      }

      const entry = clippers.get(user.id);
      if (!entry) {
        continue;
      }
      if (!ended) {
        entry.connected++;
      }
      entry.channels.push({
        id: channel.id,
        name: channel.customName || channel.name,
        picture: channel.picture,
        identifier: channel.providerIdentifier,
        state: channel.deletedAt
          ? 'deleted'
          : channel.disabled
          ? 'disconnected'
          : 'active',
        ...bill,
        // the setting, bill.feeCents is the share of it for this month
        monthlyFeeCents: channel.clipFeeCents,
        postsPerDay: channel.clipPostsPerDay,
      });
      entry.totalCents += bill.amountCents;
    }

    const list = [...clippers.values()];
    return {
      month: wanted,
      today,
      freeMissedPosts: FREE_MISSED_POSTS,
      missedPostPenaltyCents: MISSED_POST_PENALTY_CENTS,
      clippers: list,
      totalCents: list.reduce((sum, c) => sum + c.totalCents, 0),
    };
  }

  async setAccounts(orgId: string, userId: string, accounts: number) {
    if (
      !(await this._organizationRepository.setClipperAccounts(
        orgId,
        userId,
        accounts
      ))
    ) {
      throw new NotFoundException('Clipper nicht gefunden');
    }
    return { accounts };
  }

  async setPay(
    orgId: string,
    id: string,
    pay: { feeCents: number | null; postsPerDay: number }
  ) {
    const found = await this._integrationRepository.setClipPay(orgId, id, {
      clipFeeCents: pay.feeCents,
      clipPostsPerDay: pay.postsPerDay,
    });
    if (!found) {
      throw new NotFoundException('Kanal nicht gefunden');
    }
    return { feeCents: pay.feeCents, postsPerDay: pay.postsPerDay };
  }
}

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { uniq } from 'lodash';
import { IntegrationRepository } from '@vibeschedule/nestjs-libraries/database/prisma/integrations/integration.repository';
import { OrganizationRepository } from '@vibeschedule/nestjs-libraries/database/prisma/organizations/organization.repository';
import { OrganizationService } from '@vibeschedule/nestjs-libraries/database/prisma/organizations/organization.service';
import { PostsService } from '@vibeschedule/nestjs-libraries/database/prisma/posts/posts.service';
import { IntegrationService } from '@vibeschedule/nestjs-libraries/database/prisma/integrations/integration.service';
import { TeamUser } from '@vibeschedule/helpers/channels/channel.filter';
import { SessionUser } from '@vibeschedule/nestjs-libraries/user/user.from.request';
import { DEFAULT_MONTHLY_FEE_CENTS } from '@vibeschedule/helpers/clippers/clipper.billing';
import { ClipperOnboardingService } from '@vibeschedule/nestjs-libraries/database/prisma/clippers/clipper.onboarding.service';

// clippers connect their own accounts, only where we post by hand
const CLIPPER_PLATFORMS = ['tiktok'];

// Who is responsible for which channel (UserIntegration). For admins and team
// members that is only a label. A clipper sees nothing but its channels and
// posts them by hand, so a channel handed to a clipper stops publishing
// through PfM.
@Injectable()
export class ChannelUsersService {
  constructor(
    private _integrationRepository: IntegrationRepository,
    private _organizationRepository: OrganizationRepository,
    private _organizationService: OrganizationService,
    private _postsService: PostsService,
    private _integrationService: IntegrationService,
    private _onboardingService: ClipperOnboardingService
  ) {}

  // Mirrors the PfM accounts and hands a channel a clipper connected through
  // their own link to that clipper, manual-only from the start, and to the
  // onboarding account the link was made for
  async sync(orgId: string) {
    const { owned, ...result } = await this._integrationService.sync(orgId);
    const members = owned.length
      ? await this._organizationRepository.getMembers(
          orgId,
          uniq(owned.map((o) => o.userId))
        )
      : [];
    let assigned = 0;
    for (const { channelId, userId, accountId } of owned) {
      const member = members.find((m) => m.userId === userId);
      if (member?.role !== Role.CLIPPER) {
        continue;
      }
      if (await this._integrationRepository.addUserChannel(userId, channelId)) {
        await this.handToClipper(orgId, channelId);
        await this._onboardingService.channelArrived(
          orgId,
          userId,
          channelId,
          accountId
        );
        assigned++;
      }
    }
    return { ...result, assigned };
  }

  // the accounts the user is responsible for, and for a clipper how many
  // were agreed
  async ownChannels(orgId: string, user: SessionUser) {
    const [channels, member] = await Promise.all([
      this._integrationRepository.getUserChannels(orgId, user.id),
      this._organizationRepository.getMember(orgId, user.id),
    ]);
    return {
      channels: channels.map((c) => ({
        id: c.id,
        name: c.customName || c.name,
        picture: c.picture,
        identifier: c.providerIdentifier,
        disabled: c.disabled,
      })),
      maxAccounts:
        member?.role === Role.CLIPPER ? member.clipperAccounts : null,
    };
  }

  // The connect link for an own account. A clipper's link carries the
  // clipper, so the sync after the consent hands the account to them, and a
  // clipper gets no link once the agreed accounts are connected. A
  // disconnected account does not count, so it can always be reconnected.
  async connectUrl(orgId: string, user: SessionUser, identifier: string) {
    if (!CLIPPER_PLATFORMS.includes(identifier)) {
      throw new BadRequestException('Plattform nicht verfügbar');
    }
    if (user.role !== Role.CLIPPER) {
      return this._integrationService.getConnectUrl(orgId, identifier, {});
    }

    const { channels, maxAccounts } = await this.ownChannels(orgId, user);
    const connected = channels.filter((c) => !c.disabled).length;
    if (maxAccounts !== null && connected >= maxAccounts) {
      throw new BadRequestException(
        `Du hast schon alle ${maxAccounts} Accounts verbunden. Für einen weiteren schreib Max.`
      );
    }
    return this._integrationService.getConnectUrl(
      orgId,
      identifier,
      {},
      user.id
    );
  }

  // a clipper posts by hand and is paid the SOP fee unless one is set
  private async handToClipper(orgId: string, channelId: string) {
    await this._postsService.setChannelManualOnly(orgId, channelId, true);
    await this._integrationRepository.setDefaultClipFee(
      orgId,
      channelId,
      DEFAULT_MONTHLY_FEE_CENTS
    );
  }

  async team(orgId: string): Promise<TeamUser[]> {
    return (await this._organizationRepository.getTeam(orgId)).map(
      ({ id, name, email, role, managerId }) => ({
        id,
        name,
        email,
        role,
        managerId,
      })
    );
  }

  async setUserChannels(orgId: string, userId: string, channelIds: string[]) {
    const member = await this._organizationService.getMemberOrThrow(
      orgId,
      userId
    );
    const { channels, added } =
      await this._integrationRepository.setUserChannels(
        orgId,
        userId,
        uniq(channelIds)
      );
    if (member.role === Role.CLIPPER) {
      for (const id of added) {
        await this.handToClipper(orgId, id);
        await this._onboardingService.channelArrived(orgId, userId, id);
      }
    }
    return { channels };
  }

  async setChannelUsers(orgId: string, integrationId: string, ids: string[]) {
    const integration = await this._integrationRepository.getIntegrationById(
      orgId,
      integrationId
    );
    if (!integration) {
      throw new NotFoundException('Kanal nicht gefunden');
    }

    const userIds = uniq(ids);
    const members = await this._organizationRepository.getMembers(
      orgId,
      userIds
    );
    const unknown = userIds.filter(
      (id) => !members.some((member) => member.userId === id)
    );
    if (unknown.length) {
      throw new BadRequestException(
        `Nutzer nicht gefunden: ${unknown.join(', ')}`
      );
    }

    const { added } = await this._integrationRepository.setChannelUsers(
      integrationId,
      userIds
    );
    const clippersAdded = members.filter(
      (member) => member.role === Role.CLIPPER && added.includes(member.userId)
    );
    const clipperAdded = clippersAdded.length > 0;
    if (clipperAdded) {
      await this.handToClipper(orgId, integrationId);
    }
    for (const clipper of clippersAdded) {
      await this._onboardingService.channelArrived(
        orgId,
        clipper.userId,
        integrationId
      );
    }

    return {
      users: await this._integrationRepository.getChannelUsers(
        orgId,
        integrationId
      ),
      manualOnly: integration.manualOnly || clipperAdded,
    };
  }
}

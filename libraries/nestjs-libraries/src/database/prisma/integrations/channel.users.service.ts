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
import { TeamUser } from '@vibeschedule/helpers/channels/channel.filter';

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
    private _postsService: PostsService
  ) {}

  async team(orgId: string): Promise<TeamUser[]> {
    return (await this._organizationRepository.getTeam(orgId)).map(
      ({ id, name, email, role }) => ({ id, name, email, role })
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
        await this._postsService.setChannelManualOnly(orgId, id, true);
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
    const clipperAdded = members.some(
      (member) => member.role === Role.CLIPPER && added.includes(member.userId)
    );
    if (clipperAdded && !integration.manualOnly) {
      await this._postsService.setChannelManualOnly(orgId, integrationId, true);
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

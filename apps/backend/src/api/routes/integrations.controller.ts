import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Organization } from '@prisma/client';
import { GetOrgFromRequest } from '@vibeschedule/nestjs-libraries/user/org.from.request';
import { IntegrationService } from '@vibeschedule/nestjs-libraries/database/prisma/integrations/integration.service';
import { PostsService } from '@vibeschedule/nestjs-libraries/database/prisma/posts/posts.service';
import { IntegrationTimeDto } from '@vibeschedule/nestjs-libraries/dtos/integrations/integration.time.dto';
import { IntegrationNameDto } from '@vibeschedule/nestjs-libraries/dtos/integrations/integration.name.dto';
import { IntegrationAppDto } from '@vibeschedule/nestjs-libraries/dtos/integrations/app.dto';
import { ManualOnlyDto } from '@vibeschedule/nestjs-libraries/dtos/integrations/manual.only.dto';
import { AdminGuard } from '@vibeschedule/backend/services/auth/admin.guard';
import { ChannelUsersService } from '@vibeschedule/nestjs-libraries/database/prisma/integrations/channel.users.service';
import { ChannelUsersDto } from '@vibeschedule/nestjs-libraries/dtos/settings/add.team.member.dto';

@Controller('/integrations')
export class IntegrationsController {
  constructor(
    private _integrationService: IntegrationService,
    private _postService: PostsService,
    private _channelUsersService: ChannelUsersService
  ) {}

  @Get('/')
  getCatalogue() {
    return this._integrationService.catalogue();
  }

  @Get('/list')
  async getIntegrationList(@GetOrgFromRequest() org: Organization) {
    return {
      integrations: await this._integrationService.getChannelList(org.id),
    };
  }

  // Custom fields (Bluesky handle and app password) come as query params,
  // or base64 JSON in `code` as the connect dialog sends them
  @Get('/social/:identifier')
  getConnectUrl(
    @GetOrgFromRequest() org: Organization,
    @Param('identifier') identifier: string,
    @Query() query: Record<string, string>
  ) {
    const { code, ...fields } = query;
    let coded: Record<string, string> = {};
    try {
      coded = code ? JSON.parse(Buffer.from(code, 'base64').toString()) : {};
    } catch {
      throw new BadRequestException('Ungültige Verbindungsdaten');
    }
    return this._integrationService.getConnectUrl(org.id, identifier, {
      ...fields,
      ...coded,
    });
  }

  @Post('/sync')
  sync(@GetOrgFromRequest() org: Organization) {
    return this._channelUsersService.sync(org.id);
  }

  @Put('/:id/app')
  setApp(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string,
    @Body() body: IntegrationAppDto
  ) {
    return this._integrationService.setApp(org.id, id, body.appId || null);
  }

  // the people responsible for the channel; a clipper among them makes it
  // manual-only
  @Put('/:id/users')
  @UseGuards(AdminGuard)
  setUsers(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string,
    @Body() body: ChannelUsersDto
  ) {
    return this._channelUsersService.setChannelUsers(org.id, id, body.userIds);
  }

  @Put('/:id/custom-name')
  updateCustomName(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string,
    @Body() body: IntegrationNameDto
  ) {
    return this._integrationService.updateCustomName(org.id, id, body.name);
  }

  // nothing of a manual-only channel goes to PfM, people post it themselves
  @Put('/:id/manual-only')
  @UseGuards(AdminGuard)
  setManualOnly(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string,
    @Body() body: ManualOnlyDto
  ) {
    return this._postService.setChannelManualOnly(org.id, id, body.manualOnly);
  }

  @Post('/:id/settings')
  updateProviderSettings(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string,
    @Body('additionalSettings') additionalSettings: string
  ) {
    if (typeof additionalSettings !== 'string') {
      throw new BadRequestException('additionalSettings must be a string');
    }
    return this._integrationService.updateProviderSettings(
      org.id,
      id,
      additionalSettings
    );
  }

  @Post('/:id/time')
  setTime(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string,
    @Body() body: IntegrationTimeDto
  ) {
    return this._integrationService.setTimes(org.id, id, body);
  }

  @Post('/disable')
  disableChannel(
    @GetOrgFromRequest() org: Organization,
    @Body('id') id: string
  ) {
    return this._integrationService.setDisabled(org.id, id, true);
  }

  @Post('/enable')
  enableChannel(
    @GetOrgFromRequest() org: Organization,
    @Body('id') id: string
  ) {
    return this._integrationService.setDisabled(org.id, id, false);
  }

  @Delete('/')
  async deleteChannel(
    @GetOrgFromRequest() org: Organization,
    @Body('id') id: string
  ) {
    await this._integrationService.disconnectChannel(org.id, id);
    for (const {
      group,
    } of await this._integrationService.getPostGroupsForChannel(org.id, id)) {
      await this._postService.deletePost(org.id, group);
    }
    return this._integrationService.deleteChannel(org.id, id);
  }
}

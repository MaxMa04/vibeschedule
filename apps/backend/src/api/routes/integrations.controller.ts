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
} from '@nestjs/common';
import { Organization } from '@prisma/client';
import { GetOrgFromRequest } from '@vibeschedule/nestjs-libraries/user/org.from.request';
import { IntegrationService } from '@vibeschedule/nestjs-libraries/database/prisma/integrations/integration.service';
import { PostsService } from '@vibeschedule/nestjs-libraries/database/prisma/posts/posts.service';
import { IntegrationTimeDto } from '@vibeschedule/nestjs-libraries/dtos/integrations/integration.time.dto';
import { IntegrationNameDto } from '@vibeschedule/nestjs-libraries/dtos/integrations/integration.name.dto';
import { CustomerNameDto } from '@vibeschedule/nestjs-libraries/dtos/integrations/customer.name.dto';

@Controller('/integrations')
export class IntegrationsController {
  constructor(
    private _integrationService: IntegrationService,
    private _postService: PostsService
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
    return this._integrationService.sync(org.id);
  }

  @Get('/customers')
  getCustomers(@GetOrgFromRequest() org: Organization) {
    return this._integrationService.customers(org.id);
  }

  @Put('/customers/:id')
  updateCustomerName(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string,
    @Body() body: CustomerNameDto
  ) {
    return this._integrationService.updateCustomerName(org.id, id, body.name);
  }

  @Put('/:id/group')
  updateIntegrationGroup(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string,
    @Body('group') group: string
  ) {
    return this._integrationService.updateIntegrationGroup(org.id, id, group);
  }

  @Put('/:id/customer-name')
  updateOnCustomerName(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string,
    @Body('name') name: string
  ) {
    return this._integrationService.updateOnCustomerName(org.id, id, name);
  }

  @Put('/:id/custom-name')
  updateCustomName(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string,
    @Body() body: IntegrationNameDto
  ) {
    return this._integrationService.updateCustomName(org.id, id, body.name);
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

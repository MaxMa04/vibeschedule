import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { Organization } from '@prisma/client';
import { GetOrgFromRequest } from '@vibeschedule/nestjs-libraries/user/org.from.request';
import { IntegrationService } from '@vibeschedule/nestjs-libraries/database/prisma/integrations/integration.service';
import { AppNameDto } from '@vibeschedule/nestjs-libraries/dtos/integrations/app.dto';

@Controller('/public/v1/apps')
export class PublicAppsController {
  constructor(private _integrationService: IntegrationService) {}

  @Get('/')
  list(@GetOrgFromRequest() org: Organization) {
    return this._integrationService.apps(org.id);
  }

  @Post('/')
  create(@GetOrgFromRequest() org: Organization, @Body() body: AppNameDto) {
    return this._integrationService.createApp(org.id, body.name.trim());
  }

  @Put('/:id')
  rename(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string,
    @Body() body: AppNameDto
  ) {
    return this._integrationService.updateAppName(org.id, id, body.name.trim());
  }

  @Delete('/:id')
  remove(@GetOrgFromRequest() org: Organization, @Param('id') id: string) {
    return this._integrationService.deleteApp(org.id, id);
  }
}

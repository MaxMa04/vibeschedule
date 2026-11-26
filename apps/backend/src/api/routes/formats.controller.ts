import {
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
import { FormatsService } from '@vibeschedule/nestjs-libraries/database/prisma/formats/formats.service';
import {
  FormatDto,
  FormatsOverviewQueryDto,
  IntegrationFormatDto,
} from '@vibeschedule/nestjs-libraries/dtos/formats/format.dto';

@Controller('/formats')
export class FormatsController {
  constructor(private _formatsService: FormatsService) {}

  @Get('/')
  list(@GetOrgFromRequest() org: Organization) {
    return this._formatsService.list(org.id);
  }

  @Get('/overview')
  overview(
    @GetOrgFromRequest() org: Organization,
    @Query() query: FormatsOverviewQueryDto
  ) {
    return this._formatsService.overview(org.id, query.app, query.days || 30);
  }

  @Post('/')
  create(@GetOrgFromRequest() org: Organization, @Body() body: FormatDto) {
    return this._formatsService.create(org.id, body);
  }

  @Put('/:id')
  update(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string,
    @Body() body: FormatDto
  ) {
    return this._formatsService.update(org.id, id, body);
  }

  @Delete('/:id')
  remove(@GetOrgFromRequest() org: Organization, @Param('id') id: string) {
    return this._formatsService.remove(org.id, id);
  }

  @Put('/:id/integrations/:integrationId')
  assign(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string,
    @Param('integrationId') integrationId: string,
    @Body() body: IntegrationFormatDto
  ) {
    return this._formatsService.assign(org.id, id, integrationId, body);
  }

  @Delete('/:id/integrations/:integrationId')
  unassign(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string,
    @Param('integrationId') integrationId: string
  ) {
    return this._formatsService.unassign(org.id, id, integrationId);
  }
}

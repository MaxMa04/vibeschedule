import { Controller, Get, Query } from '@nestjs/common';
import { Organization } from '@prisma/client';
import { GetOrgFromRequest } from '@vibeschedule/nestjs-libraries/user/org.from.request';
import { FormatsService } from '@vibeschedule/nestjs-libraries/database/prisma/formats/formats.service';
import { FormatsOverviewQueryDto } from '@vibeschedule/nestjs-libraries/dtos/formats/format.dto';

@Controller('/public/v1/formats')
export class PublicFormatsController {
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
}

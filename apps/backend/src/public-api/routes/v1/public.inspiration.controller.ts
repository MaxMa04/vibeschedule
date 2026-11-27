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
import { InspirationService } from '@vibeschedule/nestjs-libraries/database/prisma/inspiration/inspiration.service';
import {
  AddInspirationDto,
  InspirationQueryDto,
  UpdateInspirationDto,
} from '@vibeschedule/nestjs-libraries/dtos/inspiration/inspiration.dto';

@Controller('/public/v1/inspiration')
export class PublicInspirationController {
  constructor(private _inspirationService: InspirationService) {}

  @Get('/')
  list(
    @GetOrgFromRequest() org: Organization,
    @Query() query: InspirationQueryDto
  ) {
    return this._inspirationService.list(org.id, query);
  }

  // the API key belongs to the workspace, so the link has no author
  @Post('/')
  add(@GetOrgFromRequest() org: Organization, @Body() body: AddInspirationDto) {
    return this._inspirationService.add(org.id, null, body);
  }

  @Put('/:id')
  update(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string,
    @Body() body: UpdateInspirationDto
  ) {
    return this._inspirationService.update(org.id, id, body);
  }

  @Delete('/:id')
  remove(@GetOrgFromRequest() org: Organization, @Param('id') id: string) {
    return this._inspirationService.remove(org.id, id);
  }
}

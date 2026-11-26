import { Body, Controller, Get, Param, Put, Query, UseGuards } from '@nestjs/common';
import { Organization } from '@prisma/client';
import { GetOrgFromRequest } from '@vibeschedule/nestjs-libraries/user/org.from.request';
import { AdminGuard } from '@vibeschedule/backend/services/auth/admin.guard';
import { ClipperPayService } from '@vibeschedule/nestjs-libraries/database/prisma/integrations/clipper.pay.service';
import { ClipPayDto } from '@vibeschedule/nestjs-libraries/dtos/integrations/clip.pay.dto';
import { ClipperAccountsDto } from '@vibeschedule/nestjs-libraries/dtos/settings/add.team.member.dto';

// Clipper pay per account and month, for admins
@Controller('/clippers')
@UseGuards(AdminGuard)
export class ClippersController {
  constructor(private _clipperPayService: ClipperPayService) {}

  @Get('/pay')
  pay(@GetOrgFromRequest() org: Organization, @Query('month') month?: string) {
    return this._clipperPayService.month(org.id, month);
  }

  // how many accounts the clipper runs for us
  @Put('/users/:id/accounts')
  setAccounts(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string,
    @Body() body: ClipperAccountsDto
  ) {
    return this._clipperPayService.setAccounts(org.id, id, body.accounts);
  }

  @Put('/channels/:id/pay')
  setPay(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string,
    @Body() body: ClipPayDto
  ) {
    return this._clipperPayService.setPay(org.id, id, body);
  }
}

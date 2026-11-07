import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { Organization } from '@prisma/client';
import { GetOrgFromRequest } from '@vibeschedule/nestjs-libraries/user/org.from.request';
import {
  GetUserFromRequest,
  SessionUser,
} from '@vibeschedule/nestjs-libraries/user/user.from.request';
import { OrganizationService } from '@vibeschedule/nestjs-libraries/database/prisma/organizations/organization.service';
import { AddTeamMemberDto } from '@vibeschedule/nestjs-libraries/dtos/settings/add.team.member.dto';
import { SetPasswordDto } from '@vibeschedule/nestjs-libraries/dtos/settings/set.password.dto';
import { AdminGuard } from '@vibeschedule/backend/services/auth/admin.guard';

@Controller('/settings')
@UseGuards(AdminGuard)
export class SettingsController {
  constructor(private _organizationService: OrganizationService) {}

  @Get('/team')
  getTeam(@GetOrgFromRequest() org: Organization) {
    return this._organizationService.getTeam(org.id);
  }

  @Post('/team/users')
  addTeamMember(
    @GetOrgFromRequest() org: Organization,
    @Body() body: AddTeamMemberDto
  ) {
    return this._organizationService.addTeamMember(org.id, body);
  }

  @Put('/team/users/:id/password')
  setPassword(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string,
    @Body() body: SetPasswordDto
  ) {
    return this._organizationService.setPassword(org.id, id, body.password);
  }

  @Delete('/team/:id')
  deleteTeamMember(
    @GetOrgFromRequest() org: Organization,
    @GetUserFromRequest() user: SessionUser,
    @Param('id') id: string
  ) {
    return this._organizationService.deleteTeamMember(org.id, user.id, id);
  }
}

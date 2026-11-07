import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { Organization } from '@prisma/client';
import {
  GetUserFromRequest,
  SessionUser,
} from '@vibeschedule/nestjs-libraries/user/user.from.request';
import { GetOrgFromRequest } from '@vibeschedule/nestjs-libraries/user/org.from.request';
import { UsersService } from '@vibeschedule/nestjs-libraries/database/prisma/users/users.service';
import { OrganizationService } from '@vibeschedule/nestjs-libraries/database/prisma/organizations/organization.service';
import { TimezoneDto } from '@vibeschedule/nestjs-libraries/dtos/users/timezone.dto';
import { ChangePasswordDto } from '@vibeschedule/nestjs-libraries/dtos/users/change.password.dto';
import { AdminGuard } from '@vibeschedule/backend/services/auth/admin.guard';
import { clearAuthCookie } from '@vibeschedule/backend/services/auth/auth.cookie';

@Controller('/user')
export class UsersController {
  constructor(
    private _usersService: UsersService,
    private _organizationService: OrganizationService
  ) {}

  @Get('/self')
  getSelf(
    @GetUserFromRequest() user: SessionUser,
    @GetOrgFromRequest() organization: Organization
  ) {
    const isAdmin = user.role === 'ADMIN';
    return {
      ...user,
      orgId: organization.id,
      isAdmin,
      publicApi: isAdmin ? organization.apiKey : '',
    };
  }

  @Post('/password')
  @HttpCode(200)
  changePassword(
    @GetUserFromRequest() user: SessionUser,
    @Body() body: ChangePasswordDto
  ) {
    return this._usersService.changePassword(user.id, body);
  }

  @Post('/timezone')
  updateTimezone(
    @GetUserFromRequest() user: SessionUser,
    @Body() body: TimezoneDto
  ) {
    return this._usersService.updateTimezone(user.id, body.timezoneName);
  }

  @Post('/api-key/rotate')
  @UseGuards(AdminGuard)
  rotateApiKey(@GetOrgFromRequest() organization: Organization) {
    return this._organizationService.rotateApiKey(organization.id);
  }

  @Post('/logout')
  logout(@Res({ passthrough: true }) response: Response) {
    clearAuthCookie(response);
  }
}

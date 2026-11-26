import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Organization } from '@prisma/client';
import { GetOrgFromRequest } from '@vibeschedule/nestjs-libraries/user/org.from.request';
import {
  GetUserFromRequest,
  SessionUser,
} from '@vibeschedule/nestjs-libraries/user/user.from.request';
import { AdminGuard } from '@vibeschedule/backend/services/auth/admin.guard';
import { ClipperPayService } from '@vibeschedule/nestjs-libraries/database/prisma/integrations/clipper.pay.service';
import { ClipperApplicationsService } from '@vibeschedule/nestjs-libraries/database/prisma/clippers/clipper.applications.service';
import { ClipperOnboardingService } from '@vibeschedule/nestjs-libraries/database/prisma/clippers/clipper.onboarding.service';
import { ClipPayDto } from '@vibeschedule/nestjs-libraries/dtos/integrations/clip.pay.dto';
import { ClipperAccountsDto } from '@vibeschedule/nestjs-libraries/dtos/settings/add.team.member.dto';
import {
  AcceptApplicationDto,
  ClipperProfileDto,
  ClipperTaskDto,
  ClipperTaskUpdateDto,
} from '@vibeschedule/nestjs-libraries/dtos/clippers/clipper.dto';
import { streamUploadOptions } from '@vibeschedule/nestjs-libraries/upload/multer.stream.engine';

// Clippers for admins: applications, the profiles we hand out with the
// onboarding progress, and the pay per account and month
@Controller('/clippers')
@UseGuards(AdminGuard)
export class ClippersController {
  constructor(
    private _clipperPayService: ClipperPayService,
    private _applicationsService: ClipperApplicationsService,
    private _onboardingService: ClipperOnboardingService
  ) {}

  @Get('/pay')
  pay(@GetOrgFromRequest() org: Organization, @Query('month') month?: string) {
    return this._clipperPayService.month(org.id, month);
  }

  // how many accounts the clipper runs for us
  @Put('/users/:id/accounts')
  async setAccounts(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string,
    @Body() body: ClipperAccountsDto
  ) {
    const result = await this._clipperPayService.setAccounts(
      org.id,
      id,
      body.accounts
    );
    await this._onboardingService.ensureAccounts(org.id, id);
    return result;
  }

  @Put('/channels/:id/pay')
  setPay(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string,
    @Body() body: ClipPayDto
  ) {
    return this._clipperPayService.setPay(org.id, id, body);
  }

  @Get('/applications')
  applications(@GetOrgFromRequest() org: Organization) {
    return this._applicationsService.list(org.id);
  }

  @Post('/applications/:id/accept')
  accept(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string,
    @Body() body: AcceptApplicationDto
  ) {
    return this._applicationsService.accept(org.id, id, body.accounts);
  }

  @Post('/applications/:id/decline')
  decline(@GetOrgFromRequest() org: Organization, @Param('id') id: string) {
    return this._applicationsService.decline(org.id, id);
  }

  @Get('/onboarding')
  onboarding(@GetOrgFromRequest() org: Organization) {
    return this._onboardingService.overview(org.id);
  }

  @Put('/accounts/:id')
  updateProfile(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string,
    @Body() body: ClipperProfileDto
  ) {
    return this._onboardingService.updateProfile(org.id, id, body);
  }

  @Post('/accounts/:id/avatar')
  @UseInterceptors(FileInterceptor('file', streamUploadOptions))
  avatar(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string,
    @UploadedFile('file') file?: Express.Multer.File
  ) {
    return this._onboardingService.setAvatar(org.id, id, file);
  }

  @Post('/accounts/:id/restart')
  restart(@GetOrgFromRequest() org: Organization, @Param('id') id: string) {
    return this._onboardingService.restart(org.id, id);
  }

  // tasks the clipper checks off on the posting page
  @Post('/accounts/:id/tasks')
  addTask(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string,
    @Body() body: ClipperTaskDto
  ) {
    return this._onboardingService.addTask(org.id, id, body);
  }

  @Put('/tasks/:id')
  updateTask(
    @GetOrgFromRequest() org: Organization,
    @GetUserFromRequest() user: SessionUser,
    @Param('id') id: string,
    @Body() body: ClipperTaskUpdateDto
  ) {
    return this._onboardingService.updateTask(org.id, id, body, user.id);
  }

  @Delete('/tasks/:id')
  deleteTask(@GetOrgFromRequest() org: Organization, @Param('id') id: string) {
    return this._onboardingService.deleteTask(org.id, id);
  }
}

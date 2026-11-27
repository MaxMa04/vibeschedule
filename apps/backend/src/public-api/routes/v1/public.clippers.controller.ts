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
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Organization } from '@prisma/client';
import { GetOrgFromRequest } from '@vibeschedule/nestjs-libraries/user/org.from.request';
import { ClipperOnboardingService } from '@vibeschedule/nestjs-libraries/database/prisma/clippers/clipper.onboarding.service';
import {
  ClipperManagerDto,
  ClipperProfileDto,
  ClipperTaskDto,
  ClipperTaskUpdateDto,
} from '@vibeschedule/nestjs-libraries/dtos/clippers/clipper.dto';
import { streamUploadOptions } from '@vibeschedule/nestjs-libraries/upload/multer.stream.engine';

// The clipper onboarding for agents, same as /clippers > Einrichtung: the
// profiles we hand out per account and the tasks the clipper checks off
@Controller('/public/v1/clippers')
export class PublicClippersController {
  constructor(private _onboardingService: ClipperOnboardingService) {}

  // every clipper with their accounts, ?user=<id> for one
  @Get('/onboarding')
  onboarding(
    @GetOrgFromRequest() org: Organization,
    @Query('user') user?: string
  ) {
    return this._onboardingService.overview(org.id, user || undefined);
  }

  @Get('/accounts/:id')
  account(@GetOrgFromRequest() org: Organization, @Param('id') id: string) {
    return this._onboardingService.account(org.id, id);
  }

  // fields left out stay, "" clears one
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

  @Post('/accounts/:id/tasks')
  addTask(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string,
    @Body() body: ClipperTaskDto
  ) {
    return this._onboardingService.addTask(org.id, id, body);
  }

  // a task about the clipper in general, not about one account
  @Post('/users/:id/tasks')
  addGeneralTask(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string,
    @Body() body: ClipperTaskDto
  ) {
    return this._onboardingService.addGeneralTask(org.id, id, body);
  }

  // the team member who looks after the clipper
  @Put('/users/:id/manager')
  setManager(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string,
    @Body() body: ClipperManagerDto
  ) {
    return this._onboardingService.setManager(org.id, id, body);
  }

  @Put('/tasks/:id')
  updateTask(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string,
    @Body() body: ClipperTaskUpdateDto
  ) {
    return this._onboardingService.updateTask(org.id, id, body, null);
  }

  @Delete('/tasks/:id')
  deleteTask(@GetOrgFromRequest() org: Organization, @Param('id') id: string) {
    return this._onboardingService.deleteTask(org.id, id);
  }
}

import {
  BadGatewayException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { Readable } from 'stream';
import { ReadableStream } from 'stream/web';
import { Organization } from '@prisma/client';
import { GetOrgFromRequest } from '@vibeschedule/nestjs-libraries/user/org.from.request';
import {
  GetUserFromRequest,
  SessionUser,
} from '@vibeschedule/nestjs-libraries/user/user.from.request';
import { AllowClipper } from '@vibeschedule/backend/services/auth/clipper.guard';
import { ClipperOnboardingService } from '@vibeschedule/nestjs-libraries/database/prisma/clippers/clipper.onboarding.service';
import {
  FypDto,
  PayoutDto,
  TaskDoneDto,
} from '@vibeschedule/nestjs-libraries/dtos/clippers/clipper.dto';

// A clipper's start: payout details and creating, warming up and connecting
// the accounts we hand out. The service limits everything to the clipper's
// own accounts and checks every step.
@Controller('/onboarding')
@AllowClipper()
export class OnboardingController {
  constructor(private _onboardingService: ClipperOnboardingService) {}

  @Get('/')
  state(
    @GetOrgFromRequest() org: Organization,
    @GetUserFromRequest() user: SessionUser
  ) {
    return this._onboardingService.state(org.id, user);
  }

  @Put('/payout')
  payout(
    @GetOrgFromRequest() org: Organization,
    @GetUserFromRequest() user: SessionUser,
    @Body() body: PayoutDto
  ) {
    return this._onboardingService.setPayout(org.id, user, body);
  }

  @Post('/accounts/:id/created')
  created(
    @GetOrgFromRequest() org: Organization,
    @GetUserFromRequest() user: SessionUser,
    @Param('id') id: string
  ) {
    return this._onboardingService.created(org.id, user, id);
  }

  @Post('/accounts/:id/warmup')
  warmup(
    @GetOrgFromRequest() org: Organization,
    @GetUserFromRequest() user: SessionUser,
    @Param('id') id: string
  ) {
    return this._onboardingService.warmup(org.id, user, id);
  }

  @Post('/accounts/:id/fyp')
  fyp(
    @GetOrgFromRequest() org: Organization,
    @GetUserFromRequest() user: SessionUser,
    @Param('id') id: string,
    @Body() body: FypDto
  ) {
    return this._onboardingService.fyp(org.id, user, id, body.ok);
  }

  @Get('/accounts/:id/connect')
  connect(
    @GetOrgFromRequest() org: Organization,
    @GetUserFromRequest() user: SessionUser,
    @Param('id') id: string
  ) {
    return this._onboardingService.connectUrl(org.id, user, id);
  }

  @Post('/accounts/:id/restart')
  restart(
    @GetOrgFromRequest() org: Organization,
    @GetUserFromRequest() user: SessionUser,
    @Param('id') id: string
  ) {
    return this._onboardingService.restart(org.id, id, user);
  }

  // a task we gave for one of the clipper's accounts, checked off or back
  @Post('/tasks/:id')
  checkTask(
    @GetOrgFromRequest() org: Organization,
    @GetUserFromRequest() user: SessionUser,
    @Param('id') id: string,
    @Body() body: TaskDoneDto
  ) {
    return this._onboardingService.checkTask(org.id, user, id, body.done);
  }

  // the profile picture as a file, so the phone can save it to Photos
  @Get('/accounts/:id/avatar')
  async avatar(
    @GetOrgFromRequest() org: Organization,
    @GetUserFromRequest() user: SessionUser,
    @Param('id') id: string,
    @Res() res: Response
  ) {
    const avatar = await this._onboardingService.avatar(org.id, user, id);
    const upstream = await fetch(avatar.url, {
      signal: AbortSignal.timeout(60_000),
    });
    if (!upstream.ok || !upstream.body) {
      throw new BadGatewayException('Bild konnte nicht geladen werden');
    }
    res.setHeader(
      'Content-Type',
      upstream.headers.get('content-type') || 'image/jpeg'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${avatar.name}"`
    );
    res.setHeader('Cache-Control', 'private, max-age=3600');
    Readable.fromWeb(upstream.body as ReadableStream).pipe(res);
  }
}

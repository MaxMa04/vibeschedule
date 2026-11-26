import {
  BadGatewayException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
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
import { ManualPostsService } from '@vibeschedule/nestjs-libraries/database/prisma/posts/manual.posts.service';
import { MarkPostedDto } from '@vibeschedule/nestjs-libraries/dtos/posts/mark.posted.dto';
import { AllowClipper } from '@vibeschedule/backend/services/auth/clipper.guard';
import { ChannelUsersService } from '@vibeschedule/nestjs-libraries/database/prisma/integrations/channel.users.service';


// Posts people publish by hand in the app. The service limits a clipper to
// the assigned channels on every route.
@Controller('/manual')
@AllowClipper()
export class ManualController {
  constructor(
    private _manualPostsService: ManualPostsService,
    private _channelUsersService: ChannelUsersService
  ) {}

  // the accounts the user is responsible for, also those without posts
  @Get('/channels')
  channels(
    @GetOrgFromRequest() org: Organization,
    @GetUserFromRequest() user: SessionUser
  ) {
    return this._channelUsersService.ownChannels(org.id, user);
  }

  // the connect link for an own account, see ChannelUsersService.connectUrl
  @Get('/connect/:identifier')
  connect(
    @GetOrgFromRequest() org: Organization,
    @GetUserFromRequest() user: SessionUser,
    @Param('identifier') identifier: string
  ) {
    return this._channelUsersService.connectUrl(org.id, user, identifier);
  }

  // after the consent: takes the new account over
  @Post('/sync')
  async sync(@GetOrgFromRequest() org: Organization) {
    const { assigned } = await this._channelUsersService.sync(org.id);
    return { assigned };
  }

  @Get('/posts')
  list(
    @GetOrgFromRequest() org: Organization,
    @GetUserFromRequest() user: SessionUser
  ) {
    return this._manualPostsService.list(org.id, user);
  }

  @Get('/posts/:id')
  get(
    @GetOrgFromRequest() org: Organization,
    @GetUserFromRequest() user: SessionUser,
    @Param('id') id: string
  ) {
    return this._manualPostsService.get(org.id, user, id);
  }

  @Get('/posts/:id/media/:index')
  async media(
    @GetOrgFromRequest() org: Organization,
    @GetUserFromRequest() user: SessionUser,
    @Param('id') id: string,
    @Param('index', ParseIntPipe) index: number,
    @Res() res: Response
  ) {
    const media = await this._manualPostsService.media(org.id, user, id, index);
    const upstream = await fetch(media.path, {
      signal: AbortSignal.timeout(120_000),
    });
    if (!upstream.ok || !upstream.body) {
      throw new BadGatewayException('Datei konnte nicht geladen werden');
    }

    res.setHeader(
      'Content-Type',
      upstream.headers.get('content-type') ||
        (media.type === 'video' ? 'video/mp4' : 'image/jpeg')
    );
    const length = upstream.headers.get('content-length');
    if (length) {
      res.setHeader('Content-Length', length);
    }
    res.setHeader('Content-Disposition', `attachment; filename="${media.name}"`);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    Readable.fromWeb(upstream.body as ReadableStream).pipe(res);
  }

  @Get('/posts/:id/analytics')
  analytics(
    @GetOrgFromRequest() org: Organization,
    @GetUserFromRequest() user: SessionUser,
    @Param('id') id: string
  ) {
    return this._manualPostsService.analytics(org.id, user, id);
  }

  @Post('/posts/:id/posted')
  markPosted(
    @GetOrgFromRequest() org: Organization,
    @GetUserFromRequest() user: SessionUser,
    @Param('id') id: string,
    @Body() body: MarkPostedDto
  ) {
    return this._manualPostsService.markPosted(org.id, user, id, body.url);
  }

  @Delete('/posts/:id/posted')
  unmarkPosted(
    @GetOrgFromRequest() org: Organization,
    @GetUserFromRequest() user: SessionUser,
    @Param('id') id: string
  ) {
    return this._manualPostsService.unmarkPosted(org.id, user, id);
  }
}

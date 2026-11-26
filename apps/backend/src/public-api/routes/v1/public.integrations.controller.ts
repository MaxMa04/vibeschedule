import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
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
import { IntegrationService } from '@vibeschedule/nestjs-libraries/database/prisma/integrations/integration.service';
import { PostsService } from '@vibeschedule/nestjs-libraries/database/prisma/posts/posts.service';
import { MediaService } from '@vibeschedule/nestjs-libraries/database/prisma/media/media.service';
import { GetPostsDto } from '@vibeschedule/nestjs-libraries/dtos/posts/get.posts.dto';
import { CreatePostDto } from '@vibeschedule/nestjs-libraries/dtos/posts/create.post.dto';
import { UploadDto } from '@vibeschedule/nestjs-libraries/dtos/media/upload.dto';
import { GetMediaDto } from '@vibeschedule/nestjs-libraries/dtos/media/get.media.dto';
import { ManualOnlyDto } from '@vibeschedule/nestjs-libraries/dtos/integrations/manual.only.dto';
import { streamUploadOptions } from '@vibeschedule/nestjs-libraries/upload/multer.stream.engine';
import { assertValidPosts } from '@vibeschedule/backend/api/routes/posts.validation.exception';
import { analyticsDays } from '@vibeschedule/backend/api/routes/analytics.controller';
import { IntegrationAppDto } from '@vibeschedule/nestjs-libraries/dtos/integrations/app.dto';
import {
  AddTeamMemberDto,
  ChannelUsersDto,
} from '@vibeschedule/nestjs-libraries/dtos/settings/add.team.member.dto';
import { OrganizationService } from '@vibeschedule/nestjs-libraries/database/prisma/organizations/organization.service';
import { ClipperPayService } from '@vibeschedule/nestjs-libraries/database/prisma/integrations/clipper.pay.service';
import { ChannelUsersService } from '@vibeschedule/nestjs-libraries/database/prisma/integrations/channel.users.service';
import { toTeamUsers } from '@vibeschedule/nestjs-libraries/database/prisma/integrations/integration.repository';
import { channelFilter } from '@vibeschedule/nestjs-libraries/database/prisma/integrations/channel.filter';

@Controller('/public/v1')
export class PublicIntegrationsController {
  constructor(
    private _integrationService: IntegrationService,
    private _postsService: PostsService,
    private _mediaService: MediaService,
    private _channelUsersService: ChannelUsersService,
    private _organizationService: OrganizationService,
    private _clipperPayService: ClipperPayService
  ) {}

  @Get('/users')
  listUsers(@GetOrgFromRequest() org: Organization) {
    return this._channelUsersService.team(org.id);
  }

  // same as Settings > Nutzer: a login for a team member or a clipper
  @Post('/users')
  async createUser(
    @GetOrgFromRequest() org: Organization,
    @Body() body: AddTeamMemberDto
  ) {
    const user = await this._organizationService.addTeamMember(org.id, body);
    return {
      ...user,
      ...(await this._channelUsersService.setUserChannels(
        org.id,
        user.id,
        body.channels || []
      )),
    };
  }

  @Get('/clippers/pay')
  clipperPay(
    @GetOrgFromRequest() org: Organization,
    @Query('month') month?: string
  ) {
    return this._clipperPayService.month(org.id, month);
  }

  @Get('/integrations')
  async listIntegrations(
    @GetOrgFromRequest() org: Organization,
    @Query('app') app?: string,
    @Query('user') user?: string
  ) {
    return (
      await this._integrationService.getIntegrationsList(
        org.id,
        channelFilter({ app, user })
      )
    ).map((integration) => ({
      id: integration.id,
      name: integration.customName || integration.name,
      identifier: integration.providerIdentifier,
      picture: integration.picture,
      disabled: integration.disabled,
      // posts of this channel are published by hand, never through PfM
      manualOnly: integration.manualOnly,
      profile: integration.profile,
      app: integration.app
        ? { id: integration.app.id, name: integration.app.name }
        : null,
      users: toTeamUsers(integration.users),
    }));
  }

  @Put('/integrations/:id/app')
  setApp(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string,
    @Body() body: IntegrationAppDto
  ) {
    return this._integrationService.setApp(org.id, id, body.appId || null);
  }

  // a clipper among the users makes the channel manual-only
  @Put('/integrations/:id/users')
  setUsers(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string,
    @Body() body: ChannelUsersDto
  ) {
    return this._channelUsersService.setChannelUsers(org.id, id, body.userIds);
  }

  // Takes over the accounts connected in PfM, e.g. after somebody finished
  // a connect link in a browser without a login
  @Post('/integrations/sync')
  syncIntegrations(@GetOrgFromRequest() org: Organization) {
    return this._channelUsersService.sync(org.id);
  }

  // The link the owner of an account opens to connect it
  @Get('/integrations/connect-url/:identifier')
  getConnectUrl(
    @GetOrgFromRequest() org: Organization,
    @Param('identifier') identifier: string
  ) {
    return this._integrationService.getConnectUrl(org.id, identifier, {});
  }

  // nothing of a manual-only channel goes to PfM, people post it themselves
  @Put('/integrations/:id/manual-only')
  setManualOnly(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string,
    @Body() body: ManualOnlyDto
  ) {
    return this._postsService.setChannelManualOnly(org.id, id, body.manualOnly);
  }

  @Get('/integration-settings/:id')
  async getIntegrationSettings(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string
  ) {
    return {
      output: await this._integrationService.getSettingsSchema(org.id, id),
    };
  }

  @Post('/upload')
  @UseInterceptors(FileInterceptor('file', streamUploadOptions))
  upload(
    @GetOrgFromRequest() org: Organization,
    @UploadedFile('file') file: Express.Multer.File
  ) {
    if (!file) {
      throw new HttpException({ msg: 'No file provided' }, 400);
    }
    return this._mediaService.saveFile(
      org.id,
      file.filename,
      file.path,
      file.originalname
    );
  }

  @Post('/upload-from-url')
  uploadFromUrl(
    @GetOrgFromRequest() org: Organization,
    @Body() body: UploadDto
  ) {
    return this._mediaService.uploadFromUrl(org.id, body.url);
  }

  @Get('/media')
  getMedia(
    @GetOrgFromRequest() org: Organization,
    @Query() query: GetMediaDto
  ) {
    return this._mediaService.getMedia(org.id, query.page, query.search);
  }

  @Get('/posts')
  async getPosts(
    @GetOrgFromRequest() org: Organization,
    @Query() query: GetPostsDto
  ) {
    return {
      posts: await this._postsService.getPosts(
        org.id,
        query,
        channelFilter(query)
      ),
    };
  }

  @Post('/posts')
  async createPost(
    @GetOrgFromRequest() org: Organization,
    @Body() body: CreatePostDto,
    @Body('creationMethod') creationMethod?: string
  ) {
    assertValidPosts(
      await this._postsService.validatePosts(org.id, body.posts),
      body.type === 'draft'
    );
    return this._postsService.createPost(
      org.id,
      body,
      creationMethod === 'CLI' ? 'CLI' : 'API'
    );
  }

  @Delete('/posts/:id')
  async deletePost(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string
  ) {
    const { group } = await this._postsService.getPost(org.id, id);
    return this._postsService.deletePost(org.id, group);
  }

  @Delete('/posts/group/:group')
  deletePostByGroup(
    @GetOrgFromRequest() org: Organization,
    @Param('group') group: string
  ) {
    return this._postsService.deletePost(org.id, group);
  }

  @Get('/find-slot/:id')
  async findSlot(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string
  ) {
    return { date: await this._postsService.findFreeDateTime(org.id, id) };
  }

  @Get('/analytics/overview')
  getAnalyticsOverview(
    @GetOrgFromRequest() org: Organization,
    @Query('days') days: string,
    @Query('app') app?: string,
    @Query('user') user?: string,
    @Query('fresh') fresh?: string
  ) {
    return this._integrationService.analyticsOverview(
      org.id,
      analyticsDays(days),
      channelFilter({ app, user }),
      fresh === '1'
    );
  }

  @Get('/analytics/account/:integration')
  getAccountAnalytics(
    @GetOrgFromRequest() org: Organization,
    @Param('integration') integration: string,
    @Query('days') days: string,
    @Query('fresh') fresh?: string
  ) {
    return this._integrationService.accountAnalytics(
      org.id,
      integration,
      analyticsDays(days),
      fresh === '1'
    );
  }

  @Get('/analytics/:integration')
  getAnalytics(
    @GetOrgFromRequest() org: Organization,
    @Param('integration') integration: string,
    @Query('date') date: string
  ) {
    return this._integrationService.analytics(
      org.id,
      integration,
      Number(date) > 0 ? Math.min(Number(date), 365) : 7
    );
  }

  @Get('/analytics/post/:postId')
  getPostAnalytics(
    @GetOrgFromRequest() org: Organization,
    @Param('postId') postId: string
  ) {
    return this._postsService.postAnalytics(org.id, postId);
  }
}

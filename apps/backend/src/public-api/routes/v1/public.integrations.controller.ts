import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  Param,
  Post,
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
import { streamUploadOptions } from '@vibeschedule/nestjs-libraries/upload/multer.stream.engine';
import { assertValidPosts } from '@vibeschedule/backend/api/routes/posts.validation.exception';

@Controller('/public/v1')
export class PublicIntegrationsController {
  constructor(
    private _integrationService: IntegrationService,
    private _postsService: PostsService,
    private _mediaService: MediaService
  ) {}

  @Get('/integrations')
  async listIntegrations(
    @GetOrgFromRequest() org: Organization,
    @Query('group') customerId?: string
  ) {
    return (await this._integrationService.getIntegrationsList(org.id))
      .filter(
        (integration) => !customerId || integration.customer?.id === customerId
      )
      .map((integration) => ({
        id: integration.id,
        name: integration.customName || integration.name,
        identifier: integration.providerIdentifier,
        picture: integration.picture,
        disabled: integration.disabled,
        profile: integration.profile,
        customer: integration.customer
          ? { id: integration.customer.id, name: integration.customer.name }
          : undefined,
      }));
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
    return { posts: await this._postsService.getPosts(org.id, query) };
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

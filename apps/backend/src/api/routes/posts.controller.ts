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
import { PostsService } from '@vibeschedule/nestjs-libraries/database/prisma/posts/posts.service';
import { GetPostsDto } from '@vibeschedule/nestjs-libraries/dtos/posts/get.posts.dto';
import { GetPostsListDto } from '@vibeschedule/nestjs-libraries/dtos/posts/get.posts.list.dto';
import {
  CreatePostDto,
  ValidatePostsDto,
} from '@vibeschedule/nestjs-libraries/dtos/posts/create.post.dto';
import { ChangeDateDto } from '@vibeschedule/nestjs-libraries/dtos/posts/change.date.dto';
import { CreateTagDto } from '@vibeschedule/nestjs-libraries/dtos/posts/create.tag.dto';
import { assertValidPosts } from '@vibeschedule/backend/api/routes/posts.validation.exception';

@Controller('/posts')
export class PostsController {
  constructor(private _postsService: PostsService) {}

  @Get('/tags')
  async getTags(@GetOrgFromRequest() org: Organization) {
    return { tags: await this._postsService.getTags(org.id) };
  }

  @Post('/tags')
  createTag(
    @GetOrgFromRequest() org: Organization,
    @Body() body: CreateTagDto
  ) {
    return this._postsService.createTag(org.id, body);
  }

  @Put('/tags/:id')
  editTag(
    @GetOrgFromRequest() org: Organization,
    @Body() body: CreateTagDto,
    @Param('id') id: string
  ) {
    return this._postsService.editTag(id, org.id, body);
  }

  @Delete('/tags/:id')
  deleteTag(@GetOrgFromRequest() org: Organization, @Param('id') id: string) {
    return this._postsService.deleteTag(id, org.id);
  }

  @Get('/')
  getPosts(
    @GetOrgFromRequest() org: Organization,
    @Query() query: GetPostsDto
  ) {
    return this._postsService.getPostsMinified(org.id, query);
  }

  @Get('/find-slot')
  async findSlot(@GetOrgFromRequest() org: Organization) {
    return { date: await this._postsService.findFreeDateTime(org.id) };
  }

  @Get('/find-slot/:id')
  async findSlotIntegration(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string
  ) {
    return { date: await this._postsService.findFreeDateTime(org.id, id) };
  }

  @Get('/list')
  getPostsList(
    @GetOrgFromRequest() org: Organization,
    @Query() query: GetPostsListDto
  ) {
    return this._postsService.getPostsList(org.id, query);
  }

  @Get('/group/:group')
  getPostsByGroup(
    @GetOrgFromRequest() org: Organization,
    @Param('group') group: string
  ) {
    return this._postsService.getPostsByGroup(org.id, group);
  }

  @Get('/:id')
  getPost(@GetOrgFromRequest() org: Organization, @Param('id') id: string) {
    return this._postsService.getPost(org.id, id);
  }

  @Post('/valid')
  validatePosts(
    @GetOrgFromRequest() org: Organization,
    @Body() body: ValidatePostsDto
  ) {
    return this._postsService.validatePosts(org.id, body.posts);
  }

  @Post('/')
  async createPost(
    @GetOrgFromRequest() org: Organization,
    @Body() body: CreatePostDto
  ) {
    assertValidPosts(
      await this._postsService.validatePosts(org.id, body.posts),
      body.type === 'draft'
    );
    return this._postsService.createPost(org.id, body, 'WEB');
  }

  @Delete('/:group')
  deletePost(
    @GetOrgFromRequest() org: Organization,
    @Param('group') group: string
  ) {
    return this._postsService.deletePost(org.id, group);
  }

  @Put('/:id/date')
  changeDate(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string,
    @Body() body: ChangeDateDto
  ) {
    return this._postsService.changeDate(
      org.id,
      id,
      body.date,
      body.action,
      body.republish
    );
  }
}

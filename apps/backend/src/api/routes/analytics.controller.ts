import { Controller, Get, Param, Query } from '@nestjs/common';
import { Organization } from '@prisma/client';
import { GetOrgFromRequest } from '@vibeschedule/nestjs-libraries/user/org.from.request';
import { IntegrationService } from '@vibeschedule/nestjs-libraries/database/prisma/integrations/integration.service';
import { PostsService } from '@vibeschedule/nestjs-libraries/database/prisma/posts/posts.service';

@Controller('/analytics')
export class AnalyticsController {
  constructor(
    private _integrationService: IntegrationService,
    private _postsService: PostsService
  ) {}

  @Get('/:integration')
  getIntegration(
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

  @Get('/post/:postId')
  getPostAnalytics(
    @GetOrgFromRequest() org: Organization,
    @Param('postId') postId: string
  ) {
    return this._postsService.postAnalytics(org.id, postId);
  }
}

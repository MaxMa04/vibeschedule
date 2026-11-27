import { Controller, Get, Param, Query } from '@nestjs/common';
import { Organization } from '@prisma/client';
import { GetOrgFromRequest } from '@vibeschedule/nestjs-libraries/user/org.from.request';
import {
  GetUserFromRequest,
  SessionUser,
} from '@vibeschedule/nestjs-libraries/user/user.from.request';
import { channelFilter } from '@vibeschedule/nestjs-libraries/database/prisma/integrations/channel.filter';
import { IntegrationService } from '@vibeschedule/nestjs-libraries/database/prisma/integrations/integration.service';
import { PostsService } from '@vibeschedule/nestjs-libraries/database/prisma/posts/posts.service';

// 1 to 90 days, 7 when missing: longer ranges page through too much feed
export const analyticsDays = (days?: string) =>
  Number(days) > 0 ? Math.min(Math.floor(Number(days)), 90) : 7;

@Controller('/analytics')
export class AnalyticsController {
  constructor(
    private _integrationService: IntegrationService,
    private _postsService: PostsService
  ) {}

  @Get('/overview')
  getOverview(
    @GetOrgFromRequest() org: Organization,
    @GetUserFromRequest() user: SessionUser,
    @Query('days') days: string,
    @Query('app') app?: string,
    @Query('user') responsible?: string,
    @Query('clippers') clippers?: string,
    @Query('fresh') fresh?: string
  ) {
    return this._integrationService.analyticsOverview(
      org.id,
      analyticsDays(days),
      channelFilter({ app, user: responsible, clippers }, user.id),
      fresh === '1'
    );
  }

  @Get('/account/:integration')
  getAccount(
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

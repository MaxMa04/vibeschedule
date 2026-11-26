import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  isStableAvatar,
  stableAvatarUrl,
} from '@vibeschedule/nestjs-libraries/upload/avatar.mirror';
import { IntegrationRepository } from '@vibeschedule/nestjs-libraries/database/prisma/integrations/integration.repository';
import { IntegrationTimeDto } from '@vibeschedule/nestjs-libraries/dtos/integrations/integration.time.dto';
import {
  PfmClient,
  PfmFeedPost,
} from '@vibeschedule/nestjs-libraries/integrations/pfm.client';
import {
  AnalyticsData,
  getPfmPlatform,
  PfmPlatform,
  pfmPlatforms,
} from '@vibeschedule/nestjs-libraries/integrations/pfm.platforms';
import {
  targetConstructorToSchema,
  validationMetadatasToSchemas,
} from 'class-validator-jsonschema';
import { ValidationTypes } from 'class-validator';
import { ClassConstructor } from 'class-transformer';
// @ts-ignore no types for the cjs entry
import { defaultMetadataStorage } from 'class-transformer/cjs/storage';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { get, uniq } from 'lodash';
import {
  analyticsRange,
  AnalyticsRange,
  dailySeries,
  mapLimit,
  metricDefs,
  metricValues,
  engagementRate,
  periodChange,
  periodTotals,
  postDay,
} from '@vibeschedule/nestjs-libraries/integrations/analytics.compute';
import type {
  AccountAnalytics,
  AnalyticsChannel,
  AnalyticsOverview,
  OverviewChannel,
} from '@vibeschedule/helpers/utils/analytics.types';

dayjs.extend(utc);

// feed pages for one analytics request, TikTok caps a page at 20 posts and
// Facebook at 10
const MAX_FEED_PAGES = 30;
const FEED_TTL = 5 * 60_000;
const FEED_CONCURRENCY = 4;

@Injectable()
export class IntegrationService {
  constructor(
    private _integrationRepository: IntegrationRepository,
    private _pfmClient: PfmClient
  ) {}

  private _feedCache = new Map<
    string,
    { since: number; at: number; posts: Promise<PfmFeedPost[]> }
  >();

  catalogue() {
    return {
      social: pfmPlatforms.map((p) => ({
        name: p.name,
        identifier: p.identifier,
        editor: 'normal',
        isExternal: false,
        isWeb3: false,
        ...(p.customFields ? { customFields: p.customFields } : {}),
      })),
    };
  }

  async getConnectUrl(
    orgId: string,
    identifier: string,
    fields: Record<string, string>
  ) {
    const platform = getPfmPlatform(identifier);
    if (!platform) {
      throw new BadRequestException('Unbekannte Plattform');
    }

    return {
      url: await this._pfmClient.authUrl(
        identifier,
        orgId,
        platform.platformData?.(fields)
      ),
    };
  }

  // Mirrors the connected PfM accounts into the channels of the workspace
  async sync(orgId: string) {
    const accounts = (await this._pfmClient.connectedAccounts()).filter((a) =>
      getPfmPlatform(a.platform)
    );
    const known = new Set(
      (await this._integrationRepository.getInternalIds(orgId))
        .filter((i) => !i.deletedAt)
        .map((i) => i.internalId)
    );

    const stored = new Map(
      (await this._integrationRepository.getIntegrationsList(orgId)).map(
        (i) => [i.internalId, i.picture]
      )
    );
    for (const account of accounts) {
      // an expired photo keeps the last stable copy, otherwise initials show
      const previous = stored.get(account.id);
      const picture =
        (await stableAvatarUrl(account.id, account.profile_photo_url)) ||
        (previous && isStableAvatar(previous) ? previous : null);
      await this._integrationRepository.upsertFromPfm(orgId, account, picture);
    }

    return {
      total: accounts.length,
      added: accounts.filter((a) => !known.has(a.id)).length,
      disabled: await this._integrationRepository.disableMissing(
        orgId,
        accounts.map((a) => a.id)
      ),
    };
  }

  // the channels as the calendar and the editor show them
  async getChannelList(orgId: string) {
    return (await this._integrationRepository.getIntegrationsList(orgId)).map(
      (p) => {
        const platform = getPfmPlatform(p.providerIdentifier);
        return {
          name: p.customName || p.name,
          originalName: p.name,
          id: p.id,
          internalId: p.internalId,
          disabled: p.disabled,
          editor: 'normal',
          picture: p.picture || '/no-picture.jpg',
          identifier: p.providerIdentifier,
          isCustomFields: !!platform?.customFields,
          ...(platform?.customFields
            ? { customFields: platform.customFields }
            : {}),
          display: p.profile,
          time: JSON.parse(p.postingTimes),
          app: p.app ? { id: p.app.id, name: p.app.name } : null,
          additionalSettings: p.additionalSettings || '[]',
        };
      }
    );
  }

  getIntegrationsList(org: string) {
    return this._integrationRepository.getIntegrationsList(org);
  }

  getIntegrationById(org: string, id: string) {
    return this._integrationRepository.getIntegrationById(org, id);
  }

  setTimes(orgId: string, integrationId: string, times: IntegrationTimeDto) {
    return this._integrationRepository.setTimes(orgId, integrationId, times);
  }

  updateProviderSettings(org: string, id: string, additionalSettings: string) {
    return this._integrationRepository.updateProviderSettings(
      org,
      id,
      additionalSettings
    );
  }

  updateCustomName(org: string, id: string, name: string) {
    return this._integrationRepository.updateCustomName(org, id, name);
  }

  async setApp(org: string, id: string, appId: string | null) {
    if (appId && !(await this._integrationRepository.getApp(org, appId))) {
      throw new NotFoundException('App nicht gefunden');
    }
    return this._integrationRepository.setApp(org, id, appId);
  }

  apps(orgId: string) {
    return this._integrationRepository.apps(orgId);
  }

  async createApp(orgId: string, name: string) {
    if (await this._integrationRepository.getAppByName(orgId, name)) {
      throw new BadRequestException('Diese App gibt es schon');
    }
    return this._integrationRepository.createApp(orgId, name);
  }

  async updateAppName(orgId: string, id: string, name: string) {
    const exists = await this._integrationRepository.getAppByName(orgId, name);
    if (exists && exists.id !== id) {
      throw new BadRequestException('Diese App gibt es schon');
    }
    if (!(await this._integrationRepository.getApp(orgId, id))) {
      throw new NotFoundException('App nicht gefunden');
    }
    return this._integrationRepository.updateAppName(orgId, id, name);
  }

  async deleteApp(orgId: string, id: string) {
    if (!(await this._integrationRepository.getApp(orgId, id))) {
      throw new NotFoundException('App nicht gefunden');
    }
    return this._integrationRepository.deleteApp(orgId, id);
  }


  setDisabled(org: string, id: string, disabled: boolean) {
    return this._integrationRepository.setDisabled(org, id, disabled);
  }

  getPostGroupsForChannel(org: string, id: string) {
    return this._integrationRepository.getPostGroupsForChannel(org, id);
  }

  async disconnectChannel(org: string, id: string) {
    const integration = await this.getIntegrationOrThrow(org, id);
    await this._pfmClient.disconnectAccount(integration.internalId);
  }

  deleteChannel(org: string, id: string) {
    return this._integrationRepository.deleteChannel(org, id);
  }

  async findFreeDateTime(orgId: string, integrationId?: string) {
    const rows = await this._integrationRepository.getPostingTimes(
      orgId,
      integrationId
    );
    return uniq(
      rows.flatMap((row) =>
        (JSON.parse(row.postingTimes) as { time: number }[]).map((p) => p.time)
      )
    );
  }

  // The JSON schema of the platform settings, for the CLI
  async getSettingsSchema(org: string, id: string) {
    const integration = await this.getIntegrationOrThrow(org, id);
    const platform = getPfmPlatform(integration.providerIdentifier)!;
    return {
      maxLength: platform.maxLength,
      settings: platform.dto
        ? validationMetadatasToSchemas({
            classTransformerMetadataStorage: defaultMetadataStorage,
            additionalConverters: {
              // inline nested classes (YouTube tags, Instagram collaborators)
              [ValidationTypes.NESTED_VALIDATION]: (meta, options) => {
                const typeMeta =
                  options.classTransformerMetadataStorage?.findTypeMetadata(
                    meta.target as ClassConstructor<unknown>,
                    meta.propertyName
                  );
                return typeMeta
                  ? targetConstructorToSchema(typeMeta.typeFunction(), options)
                  : {};
              },
            },
          })[platform.dto.name]
        : 'No additional settings required',
    };
  }

  // Feed posts of a channel published since the given day, newest first.
  // Cached per channel for a few minutes: a fetch serves every later `since`.
  async feedPosts(internalId: string, since: dayjs.Dayjs, fresh = false) {
    const hit = this._feedCache.get(internalId);
    if (
      !fresh &&
      hit &&
      Date.now() - hit.at < FEED_TTL &&
      hit.since <= since.valueOf()
    ) {
      return (await hit.posts).filter(
        (p) => !dayjs.utc(p.posted_at).isBefore(since)
      );
    }
    const posts = this.fetchFeed(internalId, since);
    this._feedCache.set(internalId, {
      since: since.valueOf(),
      at: Date.now(),
      posts,
    });
    posts.catch(() => {
      if (this._feedCache.get(internalId)?.posts === posts) {
        this._feedCache.delete(internalId);
      }
    });
    return posts;
  }

  private async fetchFeed(internalId: string, since: dayjs.Dayjs) {
    const posts: PfmFeedPost[] = [];
    let cursor: string | undefined;
    for (let page = 0; page < MAX_FEED_PAGES; page++) {
      const { data, meta } = await this._pfmClient.feed(internalId, {
        cursor,
        limit: 50,
      });
      posts.push(
        ...data.filter(
          (p) => p.posted_at && !dayjs.utc(p.posted_at).isBefore(since)
        )
      );
      // the feed is newest first (a pinned post aside), so a page that ends
      // before the range ends the paging
      const last = data.filter((p) => p.posted_at).pop();
      if (!meta.next || (last && dayjs.utc(last.posted_at).isBefore(since))) {
        break;
      }
      cursor = meta.cursor;
    }
    return posts;
  }

  // Daily totals of every metric the platform reports, from the PfM feed of
  // the posts published in the last `days` days
  async analytics(org: string, id: string, days: number) {
    const integration = await this.getIntegrationOrThrow(org, id);
    const platform = getPfmPlatform(integration.providerIdentifier)!;
    const since = dayjs
      .utc()
      .subtract(days - 1, 'day')
      .startOf('day');

    const posts = await this.feedPosts(integration.internalId, since);

    const dates = Array.from({ length: days }, (_, i) =>
      since.add(i, 'day').format('YYYY-MM-DD')
    );
    return this.metricsToAnalytics(platform, posts, dates, (post) =>
      dayjs.utc(post.posted_at).format('YYYY-MM-DD')
    );
  }

  metricsToAnalytics(
    platform: PfmPlatform,
    posts: PfmFeedPost[],
    dates: string[],
    dateOf: (post: PfmFeedPost) => string
  ): AnalyticsData[] {
    return platform.metrics
      .filter(({ path }) =>
        posts.some((p) => typeof get(p.metrics, path) === 'number')
      )
      .map(({ path, label }) => {
        const totals = dates.map((date) =>
          posts
            .filter((p) => dateOf(p) === date)
            .reduce((sum, p) => sum + (Number(get(p.metrics, path)) || 0), 0)
        );
        const half = Math.floor(totals.length / 2);
        const before = totals.slice(0, half).reduce((a, b) => a + b, 0);
        const after = totals.slice(half).reduce((a, b) => a + b, 0);
        return {
          label,
          data: dates.map((date, i) => ({ date, total: String(totals[i]) })),
          percentageChange: before
            ? Math.round(((after - before) / before) * 100)
            : 0,
        };
      });
  }

  // KPIs of a channel for the last `days` days against the days before,
  // with the daily series and every post of the period
  async accountAnalytics(
    org: string,
    id: string,
    days: number,
    fresh = false
  ): Promise<AccountAnalytics> {
    const integration = (
      await this._integrationRepository.getIntegrationsList(org)
    ).find((i) => i.id === id);
    if (!integration) {
      throw new NotFoundException('Kanal nicht gefunden');
    }
    const range = analyticsRange(days);
    const feed = await this.feedPosts(integration.internalId, range.since, fresh);
    const report = this.channelReport(integration, feed, range);

    const links = await this._integrationRepository.postsForFeed(
      org,
      integration.id,
      uniq(report.currentPosts.flatMap((p) => p.social_post_id || [])),
      uniq(report.currentPosts.flatMap((p) => p.platform_post_id || []))
    );
    const linkOf = (p: PfmFeedPost) =>
      links.find(
        (l) =>
          (p.social_post_id && l.pfmPostId === p.social_post_id) ||
          (p.platform_post_id && l.releaseId === p.platform_post_id)
      );

    return {
      channel: report.channel,
      days,
      metrics: report.defs.map(({ path, ...metric }) => metric),
      primary: report.primary,
      current: report.current,
      previous: report.previous,
      change: periodChange(report.current, report.previous),
      series: dailySeries(range.dates, report.currentRows, report.defs),
      posts: report.currentPosts.map((p) => {
        const metrics = metricValues(p, report.defs);
        const link = linkOf(p);
        return {
          id: p.platform_post_id || p.social_post_id || p.posted_at!,
          postedAt: p.posted_at!,
          caption: p.caption || '',
          url: p.platform_url || null,
          thumbnail: p.media?.find((m) => m.thumbnail_url)?.thumbnail_url || null,
          metrics,
          engagementRate: engagementRate(metrics, report.defs, report.primary),
          post: link ? { id: link.id, format: link.format } : null,
        };
      }),
      fetchedAt: new Date().toISOString(),
    };
  }

  // totals and a sparkline per channel, optionally only the channels of an
  // app ('none': channels without an app)
  async analyticsOverview(
    org: string,
    days: number,
    appId?: string,
    fresh = false
  ): Promise<AnalyticsOverview> {
    const range = analyticsRange(days);
    const integrations = (
      await this._integrationRepository.getIntegrationsList(org)
    ).filter(
      (i) => !appId || i.appId === (appId === 'none' ? null : appId)
    );

    const channels = await mapLimit(
      integrations,
      FEED_CONCURRENCY,
      async (integration): Promise<OverviewChannel> => {
        try {
          const feed = await this.feedPosts(
            integration.internalId,
            range.since,
            fresh
          );
          const report = this.channelReport(integration, feed, range);
          const key = report.primary;
          return {
            channel: report.channel,
            metrics: report.defs.map(({ path, ...metric }) => metric),
            primary: key,
            current: report.current,
            previous: report.previous,
            change: periodChange(report.current, report.previous),
            series: dailySeries(range.dates, report.currentRows, report.defs).map(
              (d) => ({
                date: d.date,
                posts: d.posts,
                value: key ? Number(d[key as keyof typeof d]) || 0 : 0,
              })
            ),
            error: null,
          };
        } catch (e) {
          const report = this.channelReport(integration, [], range);
          return {
            channel: report.channel,
            metrics: [],
            primary: null,
            current: report.current,
            previous: report.previous,
            change: {},
            series: range.dates.map((date) => ({ date, posts: 0, value: 0 })),
            error: e instanceof Error ? e.message : 'Feed nicht erreichbar',
          };
        }
      }
    );

    // sum by label, so the same metric adds up across platforms
    const byLabel = (period: 'current' | 'previous') => {
      const sums: Record<string, number> = {};
      for (const c of channels) {
        for (const m of c.metrics) {
          sums[m.label] = (sums[m.label] || 0) + (c[period].metrics[m.key] || 0);
        }
      }
      return sums;
    };
    const primaryLabels = channels.flatMap(
      (c) => c.metrics.find((m) => m.key === c.primary)?.label || []
    );
    const primaryLabel =
      uniq(primaryLabels).sort(
        (a, b) =>
          primaryLabels.filter((l) => l === b).length -
          primaryLabels.filter((l) => l === a).length
      )[0] ?? null;
    const sameLabel = channels.filter(
      (c) => c.metrics.find((m) => m.key === c.primary)?.label === primaryLabel
    );

    return {
      days,
      from: range.from,
      to: range.to,
      summary: {
        primaryLabel,
        current: {
          posts: channels.reduce((n, c) => n + c.current.posts, 0),
          metrics: byLabel('current'),
        },
        previous: {
          posts: channels.reduce((n, c) => n + c.previous.posts, 0),
          metrics: byLabel('previous'),
        },
        series: range.dates.map((date, i) => ({
          date,
          posts: channels.reduce((n, c) => n + c.series[i].posts, 0),
          value: sameLabel.reduce((n, c) => n + c.series[i].value, 0),
        })),
      },
      channels,
      fetchedAt: new Date().toISOString(),
    };
  }

  private channelReport(
    integration: {
      id: string;
      name: string;
      customName: string | null;
      picture: string | null;
      providerIdentifier: string;
      disabled: boolean;
      app: { id: string; name: string } | null;
    },
    feed: PfmFeedPost[],
    range: AnalyticsRange
  ) {
    const platform = getPfmPlatform(integration.providerIdentifier);
    const { defs, primary } = metricDefs(platform?.metrics || [], feed);
    const inRange = (from: string, to: string) =>
      feed
        .filter((p) => p.posted_at)
        .map((p) => ({ post: p, date: postDay(p) }))
        .filter(({ date }) => date >= from && date <= to)
        .sort((a, b) => b.post.posted_at!.localeCompare(a.post.posted_at!));
    const current = inRange(range.from, range.to);
    const previous = inRange(range.prevFrom, range.prevTo);
    const currentRows = current.map(({ post, date }) => ({
      date,
      values: metricValues(post, defs),
    }));

    const channel: AnalyticsChannel = {
      id: integration.id,
      name: integration.customName || integration.name,
      picture: integration.picture || null,
      identifier: integration.providerIdentifier,
      disabled: integration.disabled,
      app: integration.app
        ? { id: integration.app.id, name: integration.app.name }
        : null,
    };

    return {
      channel,
      defs,
      primary,
      currentPosts: current.map(({ post }) => post),
      currentRows,
      current: periodTotals(
        currentRows.map((r) => r.values),
        defs,
        primary,
        range.from,
        range.to
      ),
      previous: periodTotals(
        previous.map(({ post }) => metricValues(post, defs)),
        defs,
        primary,
        range.prevFrom,
        range.prevTo
      ),
    };
  }

  private async getIntegrationOrThrow(org: string, id: string) {
    const integration = await this.getIntegrationById(org, id);
    if (!integration) {
      throw new NotFoundException('Kanal nicht gefunden');
    }
    return integration;
  }
}

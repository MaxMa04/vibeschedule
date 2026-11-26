import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { FormatStatus, State } from '@prisma/client';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { get } from 'lodash';
import { FormatsRepository } from '@vibeschedule/nestjs-libraries/database/prisma/formats/formats.repository';
import { IntegrationService } from '@vibeschedule/nestjs-libraries/database/prisma/integrations/integration.service';
import {
  FormatDto,
  IntegrationFormatDto,
} from '@vibeschedule/nestjs-libraries/dtos/formats/format.dto';
import {
  getPfmPlatform,
  PfmPlatform,
} from '@vibeschedule/nestjs-libraries/integrations/pfm.platforms';
import { PfmFeedPost } from '@vibeschedule/nestjs-libraries/integrations/pfm.client';

dayjs.extend(utc);

/** `app` filter value for channels that belong to no app */
export const NO_APP = 'none';

export interface FormatStats {
  published: number;
  scheduled: number;
  lastPostAt: string | null;
  nextPostAt: string | null;
  /** null when the platform reports no such metric or the feed failed */
  views: number | null;
  likes: number | null;
}

const FEED_CONCURRENCY = 3;
const VIEW_LABELS = ['Aufrufe', 'Impressionen'];
const LIKE_LABELS = ['Likes', 'Reaktionen'];

const metricPath = (platform: PfmPlatform | undefined, labels: string[]) =>
  labels
    .map((label) => platform?.metrics.find((m) => m.label === label)?.path)
    .find(Boolean);

const emptyStats = (): FormatStats => ({
  published: 0,
  scheduled: 0,
  lastPostAt: null,
  nextPostAt: null,
  views: null,
  likes: null,
});

const later = (a: string | null, b: Date) =>
  !a || dayjs(b).isAfter(a) ? b.toISOString() : a;
const earlier = (a: string | null, b: Date) =>
  !a || dayjs(b).isBefore(a) ? b.toISOString() : a;

@Injectable()
export class FormatsService {
  private _logger = new Logger(FormatsService.name);

  constructor(
    private _formatsRepository: FormatsRepository,
    private _integrationService: IntegrationService
  ) {}

  list(orgId: string) {
    return this._formatsRepository.list(orgId);
  }

  async create(orgId: string, body: FormatDto) {
    const name = body.name.trim();
    if (await this._formatsRepository.getByName(orgId, name)) {
      throw new BadRequestException('Dieses Format gibt es schon');
    }
    return this._formatsRepository.create(
      orgId,
      name,
      body.description?.trim() || null
    );
  }

  async update(orgId: string, id: string, body: FormatDto) {
    await this.getOrThrow(orgId, id);
    const name = body.name.trim();
    const exists = await this._formatsRepository.getByName(orgId, name);
    if (exists && exists.id !== id) {
      throw new BadRequestException('Dieses Format gibt es schon');
    }
    return this._formatsRepository.update(id, {
      name,
      description: body.description?.trim() || null,
    });
  }

  async remove(orgId: string, id: string) {
    await this.getOrThrow(orgId, id);
    return this._formatsRepository.softDelete(id);
  }

  async assign(
    orgId: string,
    formatId: string,
    integrationId: string,
    body: IntegrationFormatDto
  ) {
    await this.getOrThrow(orgId, formatId);
    if (
      !(await this._formatsRepository.integrationExists(orgId, integrationId))
    ) {
      throw new NotFoundException('Kanal nicht gefunden');
    }
    const current = await this._formatsRepository.assignment(
      formatId,
      integrationId
    );
    return this._formatsRepository.upsertAssignment(formatId, integrationId, {
      status: body.status ?? current?.status ?? FormatStatus.ACTIVE,
      note:
        body.note !== undefined
          ? body.note?.trim() || null
          : current?.note ?? null,
      position:
        body.position ??
        current?.position ??
        (await this._formatsRepository.nextPosition(integrationId)),
    });
  }

  async unassign(orgId: string, formatId: string, integrationId: string) {
    await this.getOrThrow(orgId, formatId);
    await this._formatsRepository.removeAssignment(formatId, integrationId);
    return { ok: true };
  }

  // Per channel: its formats with the posts of the range and, for published
  // posts, the views and likes from the PfM feed
  async overview(orgId: string, appFilter: string | undefined, days: number) {
    const since = dayjs
      .utc()
      .subtract(days - 1, 'day')
      .startOf('day');
    const channels = (
      await this._formatsRepository.channelsWithFormats(orgId)
    ).filter((channel) => {
      const appId =
        channel.app && !channel.app.deletedAt ? channel.app.id : null;
      if (!appFilter) return true;
      return appFilter === NO_APP ? !appId : appId === appFilter;
    });

    const posts = await this._formatsRepository.postsSince(
      orgId,
      channels.map((c) => c.id),
      since.toDate()
    );

    const feedErrors = new Map<string, string>();
    const feeds: Array<PfmFeedPost[] | null> = channels.map(() => null);
    // a few at a time, PfM rate limits bursts
    let next = 0;
    const worker = async () => {
      while (next < channels.length) {
        const index = next++;
        const channel = channels[index];
        if (channel.disabled) continue;
        feeds[index] = await this._integrationService
          .feedPosts(channel.internalId, since)
          .catch((err: Error) => {
            this._logger.warn(
              `feed of ${channel.internalId} failed: ${err.message}`
            );
            feedErrors.set(channel.id, err.message);
            return null;
          });
      }
    };
    await Promise.all(Array.from({ length: FEED_CONCURRENCY }, worker));

    return {
      days,
      since: since.toISOString(),
      channels: channels.map((channel, index) => {
        const platform = getPfmPlatform(channel.providerIdentifier);
        const viewsPath = metricPath(platform, VIEW_LABELS);
        const likesPath = metricPath(platform, LIKE_LABELS);
        const feed = feeds[index];
        const own = posts.filter((p) => p.integrationId === channel.id);

        const feedByPlatformId = new Map<string, PfmFeedPost>();
        const feedByPfmId = new Map<string, PfmFeedPost>();
        for (const item of feed || []) {
          if (item.platform_post_id) {
            feedByPlatformId.set(item.platform_post_id, item);
          }
          if (item.social_post_id) {
            feedByPfmId.set(item.social_post_id, item);
          }
        }
        const linked = new Set<PfmFeedPost>();
        const metric = (item: PfmFeedPost, path: string | undefined) =>
          path ? Number(get(item.metrics, path)) || 0 : 0;

        const stats = new Map<string, FormatStats>();
        const extraFormats = new Map<
          string,
          { id: string; name: string; description: string | null }
        >();
        for (const post of own) {
          const key = post.formatId || '';
          if (
            post.format &&
            !channel.formats.some((f) => f.format.id === post.format!.id)
          ) {
            extraFormats.set(post.format.id, post.format);
          }
          const entry = stats.get(key) || emptyStats();
          stats.set(key, entry);
          if (post.state === State.QUEUE) {
            entry.scheduled++;
            entry.nextPostAt = earlier(entry.nextPostAt, post.publishDate);
            continue;
          }
          entry.published++;
          entry.lastPostAt = later(entry.lastPostAt, post.publishDate);
          const item =
            (post.releaseId && feedByPlatformId.get(post.releaseId)) ||
            (post.pfmPostId && feedByPfmId.get(post.pfmPostId)) ||
            undefined;
          if (item && post.formatId) {
            linked.add(item);
          }
          if (feed && item) {
            if (viewsPath)
              entry.views = (entry.views || 0) + metric(item, viewsPath);
            if (likesPath)
              entry.likes = (entry.likes || 0) + metric(item, likesPath);
          }
        }
        const statsOf = (formatId: string) => {
          const entry = stats.get(formatId) || emptyStats();
          // a feed that loaded but holds none of the posts still means 0
          return feed
            ? {
                ...entry,
                views: viewsPath ? entry.views ?? 0 : null,
                likes: likesPath ? entry.likes ?? 0 : null,
              }
            : entry;
        };

        const unlinked = (feed || []).filter((item) => !linked.has(item));
        const sum = (items: PfmFeedPost[], path: string | undefined) =>
          path
            ? items.reduce((total, item) => total + metric(item, path), 0)
            : null;

        return {
          id: channel.id,
          name: channel.customName || channel.name,
          picture: channel.picture,
          profile: channel.profile,
          identifier: channel.providerIdentifier,
          platform: platform?.name || channel.providerIdentifier,
          disabled: channel.disabled,
          app:
            channel.app && !channel.app.deletedAt
              ? { id: channel.app.id, name: channel.app.name }
              : null,
          formats: [
            ...channel.formats.map((assignment) => ({
              formatId: assignment.format.id,
              name: assignment.format.name,
              description: assignment.format.description,
              assigned: true,
              status: assignment.status,
              note: assignment.note,
              position: assignment.position,
              stats: statsOf(assignment.format.id),
            })),
            // posted with a format that is not (or no longer) assigned here
            ...[...extraFormats.values()].map((format) => ({
              formatId: format.id,
              name: format.name,
              description: format.description,
              assigned: false,
              status: null,
              note: null,
              position: null,
              stats: statsOf(format.id),
            })),
          ],
          // everything the channel published in the range, from the PfM feed;
          // null when the feed could not be loaded
          feed: feed
            ? {
                posts: feed.length,
                views: sum(feed, viewsPath),
                likes: sum(feed, likesPath),
                withoutFormat: {
                  posts: unlinked.length,
                  views: sum(unlinked, viewsPath),
                  likes: sum(unlinked, likesPath),
                },
              }
            : null,
          feedError: feedErrors.get(channel.id) || null,
        };
      }),
    };
  }

  private async getOrThrow(orgId: string, id: string) {
    const format = await this._formatsRepository.get(orgId, id);
    if (!format) {
      throw new NotFoundException('Format nicht gefunden');
    }
    return format;
  }
}

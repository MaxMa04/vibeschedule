import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Role, State } from '@prisma/client';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { groupBy } from 'lodash';
import {
  PostsRepository,
  PostWithIntegration,
} from '@vibeschedule/nestjs-libraries/database/prisma/posts/posts.repository';
import { IntegrationService } from '@vibeschedule/nestjs-libraries/database/prisma/integrations/integration.service';
import {
  PfmClient,
  PfmFeedPost,
} from '@vibeschedule/nestjs-libraries/integrations/pfm.client';
import {
  AnalyticsData,
  getPfmPlatform,
} from '@vibeschedule/nestjs-libraries/integrations/pfm.platforms';
import { SessionUser } from '@vibeschedule/nestjs-libraries/user/user.from.request';
import { stripHtmlValidation } from '@vibeschedule/helpers/utils/strip.html.validation';
import {
  isTikTokUrl,
  matchFeedPost,
  tiktokPostId,
} from '@vibeschedule/helpers/manual/manual.match';

dayjs.extend(utc);

// how long a post that was marked as posted keeps looking for its platform post
const LINK_DAYS = 14;
// TikTok returns 20 posts per feed page
const LINK_FEED_PAGES = 2;
const LINK_CHANNELS_PER_RUN = 5;
const LINK_RETRY_MS = 60_000;

const plainText = (html: string) => stripHtmlValidation('normal', html, true);

const isVideo = (path: string) =>
  path.split('?')[0].toLowerCase().endsWith('.mp4');

// 01.jpg, 02.jpg, ... so the camera roll keeps the order of the slides
const mediaOf = (post: PostWithIntegration) =>
  (JSON.parse(post.image || '[]') as { path: string }[]).map((media, i) => ({
    index: i,
    path: media.path,
    type: isVideo(media.path) ? ('video' as const) : ('image' as const),
    name: `${String(i + 1).padStart(2, '0')}.${
      media.path.split('?')[0].split('.').pop()?.toLowerCase() || 'jpg'
    }`,
  }));

const withoutQuery = (url: string) => url.split('?')[0];

@Injectable()
export class ManualPostsService {
  private readonly _logger = new Logger(ManualPostsService.name);
  private _linkAttempts = new Map<string, number>();

  constructor(
    private _postRepository: PostsRepository,
    private _integrationService: IntegrationService,
    private _pfmClient: PfmClient
  ) {}

  // a clipper is limited to the assigned channels, the team sees all of them
  private channelIds(user: SessionUser) {
    return user.role === Role.CLIPPER
      ? this._integrationService.getUserChannelIds(user.id)
      : undefined;
  }

  private async getPostOrThrow(orgId: string, user: SessionUser, id: string) {
    const post = await this._postRepository.getManualPost(
      orgId,
      id,
      await this.channelIds(user)
    );
    if (!post) {
      throw new NotFoundException('Beitrag nicht gefunden');
    }
    return post;
  }

  private toView(post: PostWithIntegration) {
    return {
      id: post.id,
      state: post.state,
      publishDate: post.publishDate,
      postedAt: post.postedAt,
      releaseURL: post.releaseURL,
      linked: !!post.releaseId,
      caption: plainText(post.content),
      media: mediaOf(post).map(({ index, type, name }) => ({
        index,
        type,
        name,
      })),
      channel: {
        id: post.integration.id,
        name: post.integration.name,
        picture: post.integration.picture,
        identifier: post.integration.providerIdentifier,
      },
    };
  }

  async list(orgId: string, user: SessionUser) {
    await this.linkPending(orgId);
    const now = dayjs.utc();
    const posts = await this._postRepository.getManualPosts(
      orgId,
      await this.channelIds(user),
      {
        openFrom: now.subtract(30, 'day').toDate(),
        openTo: now.add(14, 'day').toDate(),
        postedSince: now.subtract(LINK_DAYS, 'day').toDate(),
      }
    );
    return { posts: posts.map((post) => this.toView(post)) };
  }

  async get(orgId: string, user: SessionUser, id: string) {
    return this.toView(await this.getPostOrThrow(orgId, user, id));
  }

  // one slide or the video of a post, as the file the phone saves
  async media(orgId: string, user: SessionUser, id: string, index: number) {
    const post = await this.getPostOrThrow(orgId, user, id);
    const media = mediaOf(post)[index];
    // only our bucket, the backend fetches this URL
    if (!media?.path.startsWith(`${process.env.CLOUDFLARE_BUCKET_URL}/`)) {
      throw new NotFoundException('Datei nicht gefunden');
    }
    return media;
  }

  async markPosted(orgId: string, user: SessionUser, id: string, url?: string) {
    const post = await this.getPostOrThrow(orgId, user, id);
    const link = url?.trim()
      ? await this.readLink(post, url.trim())
      : { releaseURL: post.releaseURL, releaseId: post.releaseId };

    await this._postRepository.update(post.id, {
      state: State.PUBLISHED,
      postedAt: post.postedAt || new Date(),
      postedById: post.postedById || user.id,
      error: null,
      ...link,
    });

    if (!link.releaseId) {
      await this.linkPending(orgId, post.integrationId);
    }
    return this.get(orgId, user, id);
  }

  async unmarkPosted(orgId: string, user: SessionUser, id: string) {
    const post = await this.getPostOrThrow(orgId, user, id);
    await this._postRepository.update(post.id, {
      state: State.QUEUE,
      postedAt: null,
      postedById: null,
      releaseURL: null,
      releaseId: null,
    });
    return this.get(orgId, user, id);
  }

  async analytics(orgId: string, user: SessionUser, id: string) {
    return this.analyticsOf(await this.getPostOrThrow(orgId, user, id));
  }

  // the numbers of the platform post a manual post is linked to
  async analyticsOf(post: PostWithIntegration): Promise<AnalyticsData[]> {
    let releaseId = post.releaseId;
    if (!releaseId && post.state === State.PUBLISHED) {
      await this.linkPending(post.organizationId, post.integrationId);
      releaseId = (
        await this._postRepository.getPost(post.organizationId, post.id)
      )?.releaseId;
    }
    if (!releaseId) {
      return [];
    }

    const { data } = await this._pfmClient.feed(post.integration.internalId, {
      platform_post_id: releaseId,
    });
    const today = dayjs.utc().format('YYYY-MM-DD');
    return this._integrationService.metricsToAnalytics(
      getPfmPlatform(post.integration.providerIdentifier)!,
      data.slice(0, 1),
      [today],
      () => today
    );
  }

  // The link somebody pasted after posting. TikTok links carry the post id,
  // which ties the post to its numbers right away.
  private async readLink(post: PostWithIntegration, url: string) {
    const isTikTok = post.integration.providerIdentifier.startsWith('tiktok');
    if (!isTikTok) {
      if (!/^https:\/\/\S+$/.test(url)) {
        throw new BadRequestException('Das ist kein gültiger Link');
      }
      return { releaseURL: url, releaseId: null };
    }

    if (!isTikTokUrl(url)) {
      throw new BadRequestException('Das ist kein TikTok-Link');
    }
    const resolved = await this.resolveTikTokLink(url);
    const releaseId = resolved && tiktokPostId(resolved);
    if (!releaseId) {
      // kept as it is, the feed match finds the post
      return { releaseURL: url, releaseId: null };
    }

    const taken = await this._postRepository.getReleaseIds(post.integrationId, [
      releaseId,
    ]);
    if (taken.some((other) => other.id !== post.id)) {
      throw new BadRequestException(
        'Dieser TikTok-Post gehört schon zu einem anderen Beitrag'
      );
    }
    return { releaseURL: withoutQuery(resolved), releaseId };
  }

  // vm.tiktok.com/<code> and tiktok.com/t/<code> redirect to the post
  private async resolveTikTokLink(url: string) {
    let current = url;
    for (let hop = 0; hop < 5; hop++) {
      if (tiktokPostId(current)) {
        return current;
      }
      try {
        const response = await fetch(current, {
          method: 'GET',
          redirect: 'manual',
          headers: { 'User-Agent': 'Mozilla/5.0 (iPhone) vibeschedule' },
          signal: AbortSignal.timeout(8_000),
        });
        const location = response.headers.get('location');
        await response.body?.cancel();
        const next = location && new URL(location, current).toString();
        if (!next || !isTikTokUrl(next)) {
          return undefined;
        }
        current = next;
      } catch (err) {
        this._logger.warn(`TikTok link could not be resolved: ${err}`);
        return undefined;
      }
    }
    return undefined;
  }

  // Finds the platform post of manual posts that were marked without a usable
  // link: the account feed of PfM lists everything the account published.
  // Runs when the calendar or the posting list loads, there is no scheduler.
  async linkPending(orgId: string, onlyIntegrationId?: string) {
    try {
      const pending = await this._postRepository.getUnlinkedManualPosts(
        orgId,
        dayjs.utc().subtract(LINK_DAYS, 'day').toDate()
      );
      const channels = Object.values(
        groupBy(
          pending.filter(
            (post) =>
              !onlyIntegrationId || post.integrationId === onlyIntegrationId
          ),
          (post) => post.integrationId
        )
      )
        // an explicit request always runs, a page load at most once a minute
        .filter(
          ([post]) =>
            onlyIntegrationId ||
            Date.now() - (this._linkAttempts.get(post.integrationId) || 0) >
              LINK_RETRY_MS
        )
        .slice(0, LINK_CHANNELS_PER_RUN);

      await Promise.all(channels.map((posts) => this.linkChannel(posts)));
    } catch (err) {
      this._logger.warn(`Linking manual posts failed: ${err}`);
    }
  }

  private async linkChannel(posts: PostWithIntegration[]) {
    const { integrationId, integration } = posts[0];
    this._linkAttempts.set(integrationId, Date.now());

    const feed: PfmFeedPost[] = [];
    let cursor: string | undefined;
    for (let page = 0; page < LINK_FEED_PAGES; page++) {
      const { data, meta } = await this._pfmClient.feed(integration.internalId, {
        cursor,
        limit: 50,
      });
      feed.push(...data);
      if (!meta.next) {
        break;
      }
      cursor = meta.cursor;
    }

    const taken = new Set(
      (await this._postRepository.getReleaseIds(integrationId)).map(
        (post) => post.releaseId
      )
    );
    for (const post of posts) {
      const hit = matchFeedPost(
        {
          caption: plainText(post.content),
          postedAt: post.postedAt!,
          createdAt: post.createdAt,
        },
        feed,
        taken
      );
      if (hit) {
        taken.add(hit.platform_post_id);
        await this._postRepository.update(post.id, {
          releaseId: hit.platform_post_id,
          releaseURL: hit.platform_url
            ? withoutQuery(hit.platform_url)
            : post.releaseURL,
        });
      }
    }
  }
}

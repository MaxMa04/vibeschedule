import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  PostsRepository,
  PostWithIntegration,
} from '@vibeschedule/nestjs-libraries/database/prisma/posts/posts.repository';
import { CreatePostDto } from '@vibeschedule/nestjs-libraries/dtos/posts/create.post.dto';
import { CreationMethod, State } from '@prisma/client';
import { GetPostsDto } from '@vibeschedule/nestjs-libraries/dtos/posts/get.posts.dto';
import { GetPostsListDto } from '@vibeschedule/nestjs-libraries/dtos/posts/get.posts.list.dto';
import { groupBy, uniqBy } from 'lodash';
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { IntegrationService } from '@vibeschedule/nestjs-libraries/database/prisma/integrations/integration.service';
import { CreateTagDto } from '@vibeschedule/nestjs-libraries/dtos/posts/create.tag.dto';
import {
  minifyPosts,
  minifyPostsList,
} from '@vibeschedule/helpers/utils/posts.list.minify';
import { validate, ValidationError } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { stripHtmlValidation } from '@vibeschedule/helpers/utils/strip.html.validation';
import { countLength } from '@vibeschedule/helpers/utils/count.length';
import {
  PfmClient,
  PfmCreatePost,
  PfmPostResult,
} from '@vibeschedule/nestjs-libraries/integrations/pfm.client';
import {
  AnalyticsData,
  getPfmPlatform,
  toPlatformConfiguration,
} from '@vibeschedule/nestjs-libraries/integrations/pfm.platforms';

dayjs.extend(utc);

const plainText = (html: string) => stripHtmlValidation('normal', html, true);

const firstValidationError = (errors: ValidationError[]): string => {
  for (const e of errors) {
    if (e.constraints) {
      return Object.values(e.constraints)[0];
    }
    const child = firstValidationError(e.children || []);
    if (child) {
      return child;
    }
  }
  return '';
};

@Injectable()
export class PostsService {
  private readonly _logger = new Logger(PostsService.name);

  constructor(
    private _postRepository: PostsRepository,
    private _integrationService: IntegrationService,
    private _pfmClient: PfmClient
  ) {}

  async getPosts(orgId: string, query: GetPostsDto) {
    await this.reconcile(orgId);
    return this._postRepository.getPosts(orgId, query);
  }

  async getPostsMinified(orgId: string, query: GetPostsDto) {
    return minifyPosts({ posts: await this.getPosts(orgId, query) });
  }

  async getPostsList(orgId: string, query: GetPostsListDto) {
    await this.reconcile(orgId);
    return minifyPostsList(
      await this._postRepository.getPostsList(orgId, query)
    );
  }

  async getPost(orgId: string, id: string) {
    const post = await this._postRepository.getPost(orgId, id);
    if (!post) {
      throw new NotFoundException('Beitrag nicht gefunden');
    }
    return this.groupForEditor([post]);
  }

  async getPostsByGroup(orgId: string, group: string) {
    const posts = await this._postRepository.getPostsByGroup(orgId, group);
    if (!posts.length) {
      throw new NotFoundException('Beitrag nicht gefunden');
    }

    const batch = posts[0].batchId
      ? await this._postRepository.getPostsByBatch(
          orgId,
          posts[0].batchId,
          group
        )
      : [];

    // the other channels the post was created with
    const siblings = uniqBy(
      Object.values(groupBy(batch, (post) => post.group)).filter(
        (batchPosts) => batchPosts[0].integrationId !== posts[0].integrationId
      ),
      (batchPosts) => batchPosts[0].integrationId
    );

    return {
      ...this.groupForEditor(posts),
      siblings: siblings.map((batchPosts) => this.groupForEditor(batchPosts)),
    };
  }

  private groupForEditor(posts: PostWithIntegration[]) {
    return {
      group: posts[0].group,
      posts: posts.map((post) => ({
        ...post,
        image: JSON.parse(post.image || '[]'),
      })),
      integrationPicture: posts[0].integration.picture,
      integration: posts[0].integrationId,
      settings: JSON.parse(posts[0].settings || '{}'),
    };
  }

  // The checks the editor runs before saving, also enforced on create
  async validatePosts(orgId: string, posts: CreatePostDto['posts']) {
    return Promise.all(
      posts.map(async (post) => {
        const integration = await this._integrationService.getIntegrationById(
          orgId,
          post.integration?.id
        );
        if (!integration) {
          throw new BadRequestException(
            `Kanal ${post.integration?.id} nicht gefunden`
          );
        }

        const platform = getPfmPlatform(integration.providerIdentifier)!;
        const media = post.value.flatMap((p) => p.image || []);

        let settingsError = '';
        if (platform.dto) {
          settingsError = firstValidationError(
            await validate(plainToInstance(platform.dto, post.settings || {}))
          );
        }

        const lengths = post.value.map((p) =>
          countLength(
            integration.providerIdentifier,
            plainText(p.content || '')
          )
        );

        return {
          id: integration.id,
          identifier: integration.providerIdentifier,
          name: integration.name,
          valid: !settingsError,
          settingsError,
          errors: integration.disabled
            ? 'Der Kanal ist getrennt, verbinde ihn neu.'
            : platform.mediaError?.(media) || (true as const),
          emptyContent: post.value.some(
            (p, i) => lengths[i] === 0 && !(p.image || []).length
          ),
          tooLong: lengths.some((length) => length > platform.maxLength),
          maximumCharacters: platform.maxLength,
        };
      })
    );
  }

  async createPost(
    orgId: string,
    body: CreatePostDto,
    creationMethod: CreationMethod
  ) {
    const ids = body.posts
      .flatMap((p) => p.value.map((v) => v.id))
      .filter((id): id is string => !!id);
    const batchId =
      (ids.length &&
        (await this._postRepository.getBatchId(orgId, ids))?.batchId) ||
      uuidv4();

    // all rows first, so a PfM failure on one channel cannot leave the
    // others unsaved and a retry cannot schedule a channel twice
    const saved: { post: PostWithIntegration; previousState?: State }[] = [];
    for (const post of body.posts) {
      const integration = await this._integrationService.getIntegrationById(
        orgId,
        post.integration.id
      );
      if (!integration) {
        throw new BadRequestException(
          `Kanal ${post.integration.id} nicht gefunden`
        );
      }

      const existing = post.value[0].id
        ? await this._postRepository.getPost(orgId, post.value[0].id)
        : null;
      if (
        existing?.state === State.PUBLISHED &&
        (body.type === 'schedule' || body.type === 'now') &&
        !body.republish
      ) {
        throw new BadRequestException(
          `${integration.name}: Der Beitrag ist schon veröffentlicht. Zum erneuten Veröffentlichen republish: true mitschicken.`
        );
      }

      // update keeps the state of an existing post
      const state =
        body.type === 'draft'
          ? State.DRAFT
          : body.type === 'update' && existing
          ? undefined
          : State.QUEUE;

      saved.push({
        previousState: existing?.state,
        post: await this._postRepository.createOrUpdatePost(
          orgId,
          state,
          body.type === 'now' ? dayjs().format() : post.date || body.date,
          {
            ...post,
            settings: {
              ...post.settings,
              __type: integration.providerIdentifier,
            },
          },
          body.tags,
          creationMethod,
          batchId
        ),
      });
    }

    const postList: { postId: string; integration: string; error?: string }[] =
      [];
    for (const { post, previousState } of saved) {
      const error = await this.syncToPfm(
        post,
        body.type === 'now',
        previousState
      );
      postList.push({
        postId: post.id,
        integration: post.integrationId,
        ...(error ? { error } : {}),
      });
    }

    return postList;
  }

  // Keeps the PfM copy of a post in line with the local row: drafts and
  // published posts live only here, queued ones are scheduled at PfM.
  // A PfM failure marks the post as failed and comes back as the message.
  private async syncToPfm(
    post: PostWithIntegration,
    now: boolean,
    previousState?: State
  ): Promise<string | undefined> {
    try {
      if (post.state === State.DRAFT) {
        if (post.pfmPostId) {
          await this._pfmClient.deletePost(post.pfmPostId);
          await this._postRepository.update(post.id, { pfmPostId: null });
        }
        return;
      }

      if (post.state !== State.QUEUE) {
        return;
      }

      const current = post.pfmPostId
        ? await this._pfmClient.getPost(post.pfmPostId)
        : null;
      const payload = this.toPfmPost(post, now);
      if (current?.status === 'scheduled') {
        await this._pfmClient.updatePost(current.id, payload);
        return;
      }

      // PfM is already publishing it; only a failed or published post goes
      // out again as a new PfM post
      if (current && previousState === State.QUEUE) {
        return;
      }

      const created = await this._pfmClient.createPost(payload);
      await this._postRepository.update(post.id, { pfmPostId: created.id });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this._logger.warn(`PfM sync of post ${post.id} failed: ${message}`);
      if (post.state === State.QUEUE) {
        await this._postRepository.update(post.id, {
          state: State.ERROR,
          error: message,
        });
      }
      return `${post.integration.name}: ${message}`;
    }
  }

  private toPfmPost(post: PostWithIntegration, now: boolean): PfmCreatePost {
    const platform = getPfmPlatform(post.integration.providerIdentifier)!;
    const media = (JSON.parse(post.image || '[]') as { path: string }[]).map(
      (m) => ({ url: m.path })
    );
    const configuration = toPlatformConfiguration(
      platform,
      JSON.parse(post.settings || '{}')
    );

    return {
      caption: plainText(post.content),
      media,
      social_accounts: [post.integration.internalId],
      scheduled_at: now ? null : post.publishDate.toISOString(),
      ...(configuration && Object.keys(configuration).length
        ? {
            platform_configurations: {
              [platform.identifier]: configuration,
            },
          }
        : {}),
      external_id: post.id,
    };
  }

  async deletePost(orgId: string, group: string) {
    const posts = await this._postRepository.getPostIdsByGroup(orgId, group);
    if (!posts.length) {
      return { error: true };
    }

    // only scheduled posts can still be stopped at PfM
    for (const post of posts) {
      if (post.pfmPostId && post.state === State.QUEUE) {
        await this._pfmClient.deletePost(post.pfmPostId);
      }
    }

    await this._postRepository.softDelete(posts.map((p) => p.id));
    return { id: posts[0].id };
  }

  async changeDate(
    orgId: string,
    id: string,
    date: string,
    action: 'schedule' | 'update',
    republish: boolean
  ) {
    const post = await this._postRepository.getPost(orgId, id);
    if (!post) {
      throw new NotFoundException('Beitrag nicht gefunden');
    }

    if (action === 'schedule' && post.state === State.PUBLISHED && !republish) {
      throw new BadRequestException(
        'Der Beitrag ist schon veröffentlicht. Zum erneuten Veröffentlichen republish: true mitschicken.'
      );
    }

    const updated = await this._postRepository.changeDate(
      orgId,
      id,
      date,
      action === 'schedule' && post.state !== State.DRAFT
        ? State.QUEUE
        : undefined
    );
    const error = await this.syncToPfm(updated, false, post.state);
    if (error) {
      throw new BadRequestException(error);
    }
    return { id: updated.id, publishDate: updated.publishDate };
  }

  // Webhooks are not reachable in local dev, so loading the calendar also
  // asks PfM for the results of posts that should be out by now
  private async reconcile(orgId: string) {
    const due = await this._postRepository.getDueQueuePosts(orgId);
    await Promise.all(
      due.map(async (post) => {
        try {
          const results = await this._pfmClient.postResults(post.pfmPostId!);
          const result = results.find(
            (r) => r.social_account_id === post.integration.internalId
          );
          if (result) {
            await this.applyResult(post.id, result);
          }
        } catch (err) {
          this._logger.warn(`Reconcile of post ${post.id} failed: ${err}`);
        }
      })
    );
  }

  async applyWebhookResult(result: PfmPostResult) {
    const post = await this._postRepository.getPostByPfmId(
      result.post_id,
      result.social_account_id
    );
    if (post) {
      await this.applyResult(post.id, result);
    }
  }

  private applyResult(postId: string, result: PfmPostResult) {
    if (result.success) {
      return this._postRepository.update(postId, {
        state: State.PUBLISHED,
        releaseURL: result.platform_data?.url || null,
        releaseId: result.platform_data?.id || null,
        error: null,
      });
    }

    const error = result.error as { message?: string } | string | null;
    return this._postRepository.update(postId, {
      state: State.ERROR,
      error:
        typeof error === 'string'
          ? error
          : error?.message || JSON.stringify(error),
    });
  }

  async postAnalytics(orgId: string, postId: string): Promise<AnalyticsData[]> {
    const post = await this._postRepository.getPost(orgId, postId);
    if (!post?.pfmPostId || post.state !== State.PUBLISHED) {
      return [];
    }

    const { data } = await this._pfmClient.feed(post.integration.internalId, {
      social_post_id: post.pfmPostId,
    });
    const today = dayjs.utc().format('YYYY-MM-DD');
    return this._integrationService.metricsToAnalytics(
      getPfmPlatform(post.integration.providerIdentifier)!,
      data.slice(0, 1),
      [today],
      () => today
    );
  }

  async findFreeDateTime(orgId: string, integrationId?: string) {
    const times = await this._integrationService.findFreeDateTime(
      orgId,
      integrationId
    );
    return this.findFreeDateTimeRecursive(
      orgId,
      times.length ? times : [120, 400, 700],
      dayjs.utc().startOf('day'),
      0
    );
  }

  private async findFreeDateTimeRecursive(
    orgId: string,
    times: number[],
    date: dayjs.Dayjs,
    daysChecked: number
  ): Promise<string> {
    // a year without a free slot ends the search
    if (daysChecked > 365) {
      return date.add(times[0], 'minutes').format('YYYY-MM-DDTHH:mm:00');
    }

    const free = await this._postRepository.getFreeTimes(orgId, times, date);
    if (!free.length) {
      return this.findFreeDateTimeRecursive(
        orgId,
        times,
        date.add(1, 'day'),
        daysChecked + 1
      );
    }

    return date.add(Math.min(...free), 'minutes').format('YYYY-MM-DDTHH:mm:00');
  }

  getTags(orgId: string) {
    return this._postRepository.getTags(orgId);
  }

  createTag(orgId: string, body: CreateTagDto) {
    return this._postRepository.createTag(orgId, body);
  }

  editTag(id: string, orgId: string, body: CreateTagDto) {
    return this._postRepository.editTag(id, orgId, body);
  }

  deleteTag(id: string, orgId: string) {
    return this._postRepository.deleteTag(id, orgId);
  }
}

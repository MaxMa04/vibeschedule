import { PrismaRepository } from '@vibeschedule/nestjs-libraries/database/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { Post as PostBody } from '@vibeschedule/nestjs-libraries/dtos/posts/create.post.dto';
import { CreationMethod, Prisma, State } from '@prisma/client';
import { GetPostsDto } from '@vibeschedule/nestjs-libraries/dtos/posts/get.posts.dto';
import { GetPostsListDto } from '@vibeschedule/nestjs-libraries/dtos/posts/get.posts.list.dto';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { v4 as uuidv4 } from 'uuid';
import { CreateTagDto } from '@vibeschedule/nestjs-libraries/dtos/posts/create.tag.dto';

dayjs.extend(utc);

const listIntegrationSelect = {
  id: true,
  providerIdentifier: true,
  name: true,
  picture: true,
} as const;

const activeTags = {
  where: { tag: { deletedAt: null as Date | null } },
  select: { tag: true },
} as const;

// the post with its channel, as the editor and the PfM sync need it
const postInclude = {
  integration: {
    select: {
      ...listIntegrationSelect,
      internalId: true,
      profile: true,
      manualOnly: true,
    },
  },
  tags: activeTags,
} as const;

export type PostWithIntegration = Prisma.PostGetPayload<{
  include: typeof postInclude;
}>;

@Injectable()
export class PostsRepository {
  constructor(
    private _post: PrismaRepository<'post'>,
    private _tags: PrismaRepository<'tags'>,
    private _tagsPosts: PrismaRepository<'tagsPosts'>
  ) {}

  getPosts(orgId: string, query: GetPostsDto) {
    return this._post.model.post.findMany({
      where: {
        organizationId: orgId,
        publishDate: {
          gte: dayjs.utc(query.startDate).toDate(),
          lte: dayjs.utc(query.endDate).toDate(),
        },
        deletedAt: null,
        integration: {
          deletedAt: null,
          ...(query.customer ? { customerId: query.customer } : {}),
        },
      },
      select: {
        id: true,
        content: true,
        publishDate: true,
        releaseURL: true,
        releaseId: true,
        state: true,
        error: true,
        group: true,
        creationMethod: true,
        manual: true,
        settings: true,
        tags: activeTags,
        integration: { select: listIntegrationSelect },
      },
    });
  }

  async getPostsList(orgId: string, query: GetPostsListDto) {
    const page = query.page || 0;
    const limit = query.limit || 20;
    const skip = page * limit;
    const stateFilter = query.state || 'all';

    const where: Prisma.PostWhereInput = {
      organizationId: orgId,
      state:
        stateFilter === 'scheduled'
          ? State.QUEUE
          : stateFilter === 'draft'
          ? State.DRAFT
          : stateFilter === 'published'
          ? State.PUBLISHED
          : undefined,
      // published posts are in the past, everything else is upcoming
      ...(stateFilter === 'published'
        ? {}
        : { publishDate: { gte: dayjs.utc().toDate() } }),
      deletedAt: null,
      integration: {
        deletedAt: null,
        ...(query.customer ? { customerId: query.customer } : {}),
        ...(query.integrations?.length
          ? { id: { in: query.integrations } }
          : {}),
      },
    };

    const [posts, total] = await Promise.all([
      this._post.model.post.findMany({
        where,
        skip,
        take: limit,
        orderBy: { publishDate: stateFilter === 'published' ? 'desc' : 'asc' },
        select: {
          id: true,
          content: true,
          publishDate: true,
          releaseURL: true,
          releaseId: true,
          state: true,
          group: true,
          creationMethod: true,
          manual: true,
          tags: activeTags,
          integration: { select: listIntegrationSelect },
        },
      }),
      this._post.model.post.count({ where }),
    ]);

    return {
      posts,
      total,
      page,
      limit,
      hasMore: skip + posts.length < total,
    };
  }

  getPost(orgId: string, id: string) {
    return this._post.model.post.findFirst({
      where: { id, organizationId: orgId, deletedAt: null },
      include: postInclude,
    });
  }

  getPostsByGroup(orgId: string, group: string) {
    return this._post.model.post.findMany({
      where: { group, organizationId: orgId, deletedAt: null },
      include: postInclude,
    });
  }

  // the posts of the other channels saved together with this one
  getPostsByBatch(orgId: string, batchId: string, exceptGroup: string) {
    return this._post.model.post.findMany({
      where: {
        organizationId: orgId,
        batchId,
        group: { not: exceptGroup },
        deletedAt: null,
        integration: { deletedAt: null },
      },
      orderBy: { createdAt: 'asc' },
      include: postInclude,
    });
  }

  getPostIdsByGroup(orgId: string, group: string) {
    return this._post.model.post.findMany({
      where: { organizationId: orgId, group, deletedAt: null },
      select: { id: true, state: true, pfmPostId: true },
    });
  }

  async softDelete(ids: string[]) {
    await this._post.model.post.updateMany({
      where: { id: { in: ids } },
      data: { deletedAt: new Date() },
    });
  }

  async createOrUpdatePost(
    orgId: string,
    state: State | undefined,
    date: string,
    body: PostBody,
    tags: { value: string; label: string }[],
    creationMethod: CreationMethod,
    batchId: string,
    manual: boolean
  ) {
    const [value] = body.value;
    const existing = value.id
      ? await this._post.model.post.findFirst({
          where: { id: value.id, organizationId: orgId, deletedAt: null },
          select: { id: true, group: true, batchId: true },
        })
      : null;

    const data = {
      publishDate: dayjs(date).toDate(),
      integrationId: body.integration.id,
      content: value.content,
      image: JSON.stringify(value.image),
      settings: JSON.stringify(body.settings || {}),
      manual,
      // a saved draft or a queued post starts over
      ...(state
        ? {
            state,
            error: null,
            releaseURL: null,
            releaseId: null,
            postedAt: null,
            postedById: null,
          }
        : {}),
    };

    const post = existing
      ? await this._post.model.post.update({
          where: { id: existing.id },
          data,
          include: postInclude,
        })
      : await this._post.model.post.create({
          data: {
            ...data,
            organizationId: orgId,
            group: uuidv4(),
            batchId,
            creationMethod,
          },
          include: postInclude,
        });

    await this._tagsPosts.model.tagsPosts.deleteMany({
      where: { postId: post.id },
    });
    const tagsList = tags.length
      ? await this._tags.model.tags.findMany({
          where: {
            orgId,
            deletedAt: null,
            name: { in: tags.map((tag) => tag.label).filter((f) => f) },
          },
        })
      : [];
    if (tagsList.length) {
      await this._tagsPosts.model.tagsPosts.createMany({
        data: tagsList.map((tag) => ({ postId: post.id, tagId: tag.id })),
      });
    }

    return post;
  }

  getBatchId(orgId: string, ids: string[]) {
    return this._post.model.post.findFirst({
      where: { organizationId: orgId, id: { in: ids }, batchId: { not: null } },
      select: { batchId: true },
    });
  }

  changeDate(orgId: string, id: string, date: string, state?: State) {
    return this._post.model.post.update({
      where: { organizationId: orgId, id },
      data: {
        publishDate: dayjs(date).toDate(),
        ...(state
          ? {
              state,
              error: null,
              releaseId: null,
              releaseURL: null,
              postedAt: null,
              postedById: null,
            }
          : {}),
      },
      include: postInclude,
    });
  }

  async update(
    id: string,
    data: Pick<
      Prisma.PostUpdateInput,
      | 'state'
      | 'pfmPostId'
      | 'releaseURL'
      | 'releaseId'
      | 'error'
      | 'manual'
      | 'postedAt'
      | 'postedById'
    >
  ) {
    await this._post.model.post.update({
      where: { id },
      data,
      select: { id: true },
    });
  }

  // scheduled posts whose time passed, PfM has a result for them by now
  getDueQueuePosts(orgId: string) {
    return this._post.model.post.findMany({
      where: {
        organizationId: orgId,
        state: State.QUEUE,
        deletedAt: null,
        pfmPostId: { not: null },
        // older ones PfM never answered for are not asked again
        publishDate: {
          lt: dayjs.utc().subtract(2, 'minute').toDate(),
          gt: dayjs.utc().subtract(7, 'day').toDate(),
        },
      },
      orderBy: { publishDate: 'desc' },
      take: 25,
      select: {
        id: true,
        pfmPostId: true,
        integration: { select: { internalId: true } },
      },
    });
  }

  getPostByPfmId(pfmPostId: string, socialAccountId: string) {
    return this._post.model.post.findFirst({
      where: {
        pfmPostId,
        deletedAt: null,
        integration: { internalId: socialAccountId },
      },
      select: { id: true },
    });
  }

  // what people post by hand: open posts around today and the ones posted
  // lately. `integrationIds` limits it to the channels of a clipper.
  getManualPosts(
    orgId: string,
    integrationIds: string[] | undefined,
    range: { openFrom: Date; openTo: Date; postedSince: Date }
  ) {
    return this._post.model.post.findMany({
      where: {
        organizationId: orgId,
        manual: true,
        deletedAt: null,
        integration: {
          deletedAt: null,
          ...(integrationIds ? { id: { in: integrationIds } } : {}),
        },
        OR: [
          {
            state: State.QUEUE,
            publishDate: { gte: range.openFrom, lte: range.openTo },
          },
          { state: State.PUBLISHED, postedAt: { gte: range.postedSince } },
        ],
      },
      orderBy: { publishDate: 'asc' },
      include: postInclude,
    });
  }

  getManualPost(
    orgId: string,
    id: string,
    integrationIds: string[] | undefined
  ) {
    return this._post.model.post.findFirst({
      where: {
        id,
        organizationId: orgId,
        manual: true,
        deletedAt: null,
        state: { in: [State.QUEUE, State.PUBLISHED] },
        integration: {
          deletedAt: null,
          ...(integrationIds ? { id: { in: integrationIds } } : {}),
        },
      },
      include: postInclude,
    });
  }

  // posted by hand, but the post on the platform is not known yet
  getUnlinkedManualPosts(orgId: string, postedSince: Date) {
    return this._post.model.post.findMany({
      where: {
        organizationId: orgId,
        manual: true,
        state: State.PUBLISHED,
        releaseId: null,
        postedAt: { gte: postedSince },
        deletedAt: null,
        integration: { deletedAt: null, disabled: false },
      },
      orderBy: { postedAt: 'asc' },
      take: 50,
      include: postInclude,
    });
  }

  // the platform posts of a channel that already belong to one of our posts
  async getReleaseIds(integrationId: string, ids?: string[]) {
    const posts = await this._post.model.post.findMany({
      where: {
        integrationId,
        deletedAt: null,
        releaseId: ids ? { in: ids } : { not: null },
      },
      select: { id: true, releaseId: true },
    });
    return posts as { id: string; releaseId: string }[];
  }

  // what PfM still has scheduled for a channel
  getScheduledAtPfm(orgId: string, integrationId: string) {
    return this._post.model.post.findMany({
      where: {
        organizationId: orgId,
        integrationId,
        deletedAt: null,
        state: State.QUEUE,
        pfmPostId: { not: null },
      },
      select: { id: true, pfmPostId: true },
    });
  }

  // the open posts of a channel that turns manual
  async makeChannelManual(orgId: string, integrationId: string) {
    const { count } = await this._post.model.post.updateMany({
      where: {
        organizationId: orgId,
        integrationId,
        deletedAt: null,
        manual: false,
        state: { in: [State.QUEUE, State.DRAFT] },
      },
      data: { manual: true, pfmPostId: null },
    });
    return count;
  }

  // the posting times of that day that are still ahead and not taken
  async getFreeTimes(orgId: string, times: number[], date: dayjs.Dayjs) {
    const taken = await this._post.model.post.findMany({
      where: {
        deletedAt: null,
        organizationId: orgId,
        publishDate: {
          in: times.map((time) => date.clone().add(time, 'minutes').toDate()),
        },
      },
      select: { publishDate: true },
    });

    return times.filter(
      (time) =>
        date.clone().add(time, 'minutes').isAfter(dayjs.utc()) &&
        !taken.some(
          (post) =>
            dayjs
              .utc(post.publishDate)
              .diff(date.clone().startOf('day'), 'minutes') === time
        )
    );
  }

  getTags(orgId: string) {
    return this._tags.model.tags.findMany({
      where: { orgId, deletedAt: null },
    });
  }

  createTag(orgId: string, body: CreateTagDto) {
    return this._tags.model.tags.create({
      data: { orgId, name: body.name, color: body.color },
    });
  }

  editTag(id: string, orgId: string, body: CreateTagDto) {
    return this._tags.model.tags.update({
      where: { id, orgId },
      data: { name: body.name, color: body.color },
    });
  }

  async deleteTag(id: string, orgId: string) {
    const tag = await this._tags.model.tags.update({
      where: { id, orgId },
      data: { deletedAt: new Date() },
    });
    await this._tagsPosts.model.tagsPosts.deleteMany({
      where: { tagId: tag.id },
    });
    return tag;
  }
}

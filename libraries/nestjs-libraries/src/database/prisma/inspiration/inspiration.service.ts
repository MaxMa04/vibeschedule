import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  InspirationLinkRef,
  parseInspirationLink,
} from '@vibeschedule/helpers/inspiration/inspiration.link';
import { NO_APP } from '@vibeschedule/helpers/channels/channel.filter';
import { linkPreview } from '@vibeschedule/nestjs-libraries/upload/link.preview';
import {
  InspirationFilter,
  InspirationRepository,
} from '@vibeschedule/nestjs-libraries/database/prisma/inspiration/inspiration.repository';
import {
  AddInspirationDto,
  InspirationQueryDto,
  UpdateInspirationDto,
} from '@vibeschedule/nestjs-libraries/dtos/inspiration/inspiration.dto';

const NONE = 'none';
const REDIRECT_HOPS = 3;
const RESOLVE_TIMEOUT_MS = 4000;

const text = (value: string | null | undefined) => value?.trim() || null;

@Injectable()
export class InspirationService {
  constructor(private _repository: InspirationRepository) {}

  list(orgId: string, query: InspirationQueryDto) {
    const filter: InspirationFilter = { status: query.status };
    if (query.app) filter.appId = query.app === NO_APP ? null : query.app;
    if (query.format) filter.formatId = query.format === NONE ? null : query.format;
    return this._repository.list(orgId, filter);
  }

  /**
   * Saves a link once per video. Saved before, it comes back with
   * `duplicate: true` and gets the app if it had none.
   */
  async add(orgId: string, userId: string | null, body: AddInspirationDto) {
    const parsed = parseInspirationLink(body.url);
    if (!parsed) {
      throw new BadRequestException('Darin steht kein Link');
    }
    const ref = parsed.short ? await this.resolveShortLink(parsed) : parsed;
    const appId = await this.checkApp(orgId, body.appId);

    const existing = await this._repository.getByKey(orgId, ref.key);
    if (existing) return this.duplicate(existing, ref, appId);
    try {
      const created = await this._repository.create(orgId, ref, {
        appId,
        note: text(body.note),
        createdById: userId,
      });
      return { ...(await this.withThumbnail(created, ref)), duplicate: false };
    } catch (err) {
      // saved at the same moment from another device
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        const saved = await this._repository.getByKey(orgId, ref.key);
        if (saved) return this.duplicate(saved, ref, appId);
      }
      throw err;
    }
  }

  // a missing preview (platform blocked, timeout) is not an error; saving the
  // same link again tries once more
  private async withThumbnail<T extends { id: string; thumbnail: string | null }>(
    link: T,
    ref: InspirationLinkRef
  ) {
    if (link.thumbnail) return link;
    const thumbnail = await linkPreview(link.id, ref);
    return thumbnail ? this._repository.update(link.id, { thumbnail }) : link;
  }

  async update(orgId: string, id: string, body: UpdateInspirationDto) {
    const current = await this._repository.get(orgId, id);
    if (!current) {
      throw new NotFoundException('Link nicht gefunden');
    }
    const data: Parameters<InspirationRepository['update']>[1] = {};
    if (body.appId !== undefined) {
      data.appId = await this.checkApp(orgId, body.appId);
    }
    if (body.formatId !== undefined) {
      if (body.formatId && !(await this._repository.formatExists(orgId, body.formatId))) {
        throw new NotFoundException('Format nicht gefunden');
      }
      data.formatId = body.formatId || null;
      // giving it a format is what "done" means for an open link
      if (data.formatId && !body.status && current.status === 'OPEN') {
        data.status = 'DONE';
      }
    }
    if (body.status) data.status = body.status;
    if (body.note !== undefined) data.note = text(body.note);
    return this._repository.update(id, data);
  }

  async remove(orgId: string, id: string) {
    if (!(await this._repository.get(orgId, id))) {
      throw new NotFoundException('Link nicht gefunden');
    }
    return this._repository.remove(id);
  }

  private async duplicate(
    existing: NonNullable<Awaited<ReturnType<InspirationRepository['get']>>>,
    ref: InspirationLinkRef,
    appId: string | null
  ) {
    const { appId: savedApp, ...link } = existing;
    const updated =
      appId && !savedApp
        ? await this._repository.update(existing.id, { appId })
        : link;
    return { ...(await this.withThumbnail(updated, ref)), duplicate: true };
  }

  private async checkApp(orgId: string, appId: string | null | undefined) {
    if (!appId) return null;
    if (!(await this._repository.appExists(orgId, appId))) {
      throw new NotFoundException('App nicht gefunden');
    }
    return appId;
  }

  // vm.tiktok.com/… only redirects to the video; without the video id the
  // same video would be saved twice. Fails quietly: then the short link stays.
  private async resolveShortLink(ref: InspirationLinkRef) {
    let url = ref.url;
    try {
      for (let hop = 0; hop < REDIRECT_HOPS; hop++) {
        const response = await fetch(url, {
          method: 'HEAD',
          redirect: 'manual',
          signal: AbortSignal.timeout(RESOLVE_TIMEOUT_MS),
        });
        const location = response.headers.get('location');
        if (!location) break;
        url = new URL(location, url).href;
        const next = parseInspirationLink(url);
        if (next && !next.short) {
          // TikTok sends unknown codes to its home page
          return next.key.startsWith(`${next.platform}:path:`) ? ref : next;
        }
      }
    } catch {
      /* offline or blocked: keep the short link */
    }
    return ref;
  }
}

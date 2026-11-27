import { Injectable } from '@nestjs/common';
import { InspirationStatus, Prisma } from '@prisma/client';
import { PrismaRepository } from '@vibeschedule/nestjs-libraries/database/prisma/prisma.service';
import { InspirationLinkRef } from '@vibeschedule/helpers/inspiration/inspiration.link';

const linkSelect = {
  id: true,
  url: true,
  platform: true,
  author: true,
  note: true,
  status: true,
  createdAt: true,
  app: { select: { id: true, name: true } },
  format: { select: { id: true, name: true, deletedAt: true } },
  createdBy: { select: { id: true, name: true, email: true } },
} as const;

type LinkRow = Prisma.InspirationLinkGetPayload<{ select: typeof linkSelect }>;

// a deleted format stays on the link (like on posts), but is not shown
const visible = ({ format, ...link }: LinkRow) => ({
  ...link,
  format: format && !format.deletedAt ? { id: format.id, name: format.name } : null,
});

export interface InspirationFilter {
  /** app id, null for links without an app */
  appId?: string | null;
  status?: InspirationStatus;
  /** format id, null for links without a format */
  formatId?: string | null;
}

@Injectable()
export class InspirationRepository {
  constructor(
    private _links: PrismaRepository<'inspirationLink'>,
    private _apps: PrismaRepository<'app'>,
    private _formats: PrismaRepository<'format'>
  ) {}

  async list(orgId: string, filter: InspirationFilter) {
    const rows = await this._links.model.inspirationLink.findMany({
      where: {
        orgId,
        ...(filter.appId !== undefined ? { appId: filter.appId } : {}),
        ...(filter.status ? { status: filter.status } : {}),
        ...(filter.formatId === null
          ? { OR: [{ formatId: null }, { format: { deletedAt: { not: null } } }] }
          : filter.formatId
          ? { formatId: filter.formatId }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      select: linkSelect,
    });
    return rows.map(visible);
  }

  async get(orgId: string, id: string) {
    const row = await this._links.model.inspirationLink.findFirst({
      where: { orgId, id },
      select: { ...linkSelect, appId: true },
    });
    return row ? { ...visible(row), appId: row.appId } : null;
  }

  async getByKey(orgId: string, key: string) {
    const row = await this._links.model.inspirationLink.findUnique({
      where: { orgId_key: { orgId, key } },
      select: { ...linkSelect, appId: true },
    });
    return row ? { ...visible(row), appId: row.appId } : null;
  }

  async create(
    orgId: string,
    ref: InspirationLinkRef,
    data: { appId: string | null; note: string | null; createdById: string | null }
  ) {
    return visible(
      await this._links.model.inspirationLink.create({
        data: {
          orgId,
          url: ref.url,
          key: ref.key,
          platform: ref.platform,
          author: ref.author,
          ...data,
        },
        select: linkSelect,
      })
    );
  }

  async update(
    id: string,
    data: {
      appId?: string | null;
      formatId?: string | null;
      status?: InspirationStatus;
      note?: string | null;
    }
  ) {
    return visible(
      await this._links.model.inspirationLink.update({
        where: { id },
        data,
        select: linkSelect,
      })
    );
  }

  remove(id: string) {
    return this._links.model.inspirationLink.delete({
      where: { id },
      select: { id: true },
    });
  }

  appExists(orgId: string, id: string) {
    return this._apps.model.app.findFirst({
      where: { orgId, id, deletedAt: null },
      select: { id: true },
    });
  }

  formatExists(orgId: string, id: string) {
    return this._formats.model.format.findFirst({
      where: { orgId, id, deletedAt: null },
      select: { id: true },
    });
  }
}

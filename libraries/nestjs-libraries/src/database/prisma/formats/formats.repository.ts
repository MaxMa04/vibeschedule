import { Injectable } from '@nestjs/common';
import { FormatStatus, State } from '@prisma/client';
import { PrismaRepository } from '@vibeschedule/nestjs-libraries/database/prisma/prisma.service';
import {
  ChannelFilter,
  channelWhere,
} from '@vibeschedule/nestjs-libraries/database/prisma/integrations/channel.filter';

const assignmentSelect = {
  integrationId: true,
  status: true,
  note: true,
  position: true,
} as const;

@Injectable()
export class FormatsRepository {
  constructor(
    private _formats: PrismaRepository<'format'>,
    private _integrationFormats: PrismaRepository<'integrationFormat'>,
    private _integrations: PrismaRepository<'integration'>,
    private _posts: PrismaRepository<'post'>
  ) {}

  list(orgId: string) {
    return this._formats.model.format.findMany({
      where: { orgId, deletedAt: null },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        description: true,
        integrations: {
          where: { integration: { deletedAt: null } },
          orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
          select: assignmentSelect,
        },
      },
    });
  }

  get(orgId: string, id: string) {
    return this._formats.model.format.findFirst({
      where: { orgId, id, deletedAt: null },
      select: { id: true },
    });
  }

  getByName(orgId: string, name: string) {
    return this._formats.model.format.findFirst({
      where: {
        orgId,
        deletedAt: null,
        name: { equals: name, mode: 'insensitive' },
      },
      select: { id: true },
    });
  }

  create(orgId: string, name: string, description: string | null) {
    return this._formats.model.format.create({
      data: { orgId, name, description },
      select: { id: true, name: true, description: true },
    });
  }

  update(id: string, data: { name: string; description: string | null }) {
    return this._formats.model.format.update({
      where: { id },
      data,
      select: { id: true, name: true, description: true },
    });
  }

  // posts keep their formatId, so the format is only hidden
  async softDelete(id: string) {
    await this._integrationFormats.model.integrationFormat.deleteMany({
      where: { formatId: id },
    });
    return this._formats.model.format.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: { id: true },
    });
  }

  integrationExists(orgId: string, integrationId: string) {
    return this._integrations.model.integration.findFirst({
      where: { id: integrationId, organizationId: orgId, deletedAt: null },
      select: { id: true },
    });
  }

  async nextPosition(integrationId: string) {
    const last =
      await this._integrationFormats.model.integrationFormat.findFirst({
        where: { integrationId },
        orderBy: { position: 'desc' },
        select: { position: true },
      });
    return last ? last.position + 1 : 0;
  }

  assignment(formatId: string, integrationId: string) {
    return this._integrationFormats.model.integrationFormat.findUnique({
      where: { integrationId_formatId: { integrationId, formatId } },
      select: assignmentSelect,
    });
  }

  upsertAssignment(
    formatId: string,
    integrationId: string,
    data: { status: FormatStatus; note: string | null; position: number }
  ) {
    return this._integrationFormats.model.integrationFormat.upsert({
      where: { integrationId_formatId: { integrationId, formatId } },
      create: { formatId, integrationId, ...data },
      update: data,
      select: assignmentSelect,
    });
  }

  removeAssignment(formatId: string, integrationId: string) {
    return this._integrationFormats.model.integrationFormat.deleteMany({
      where: { formatId, integrationId },
    });
  }

  channelsWithFormats(orgId: string, filter: ChannelFilter) {
    return this._integrations.model.integration.findMany({
      where: {
        organizationId: orgId,
        deletedAt: null,
        ...channelWhere(filter),
      },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        internalId: true,
        name: true,
        customName: true,
        picture: true,
        profile: true,
        providerIdentifier: true,
        disabled: true,
        app: { select: { id: true, name: true, deletedAt: true } },
        formats: {
          where: { format: { deletedAt: null } },
          orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
          select: {
            ...assignmentSelect,
            format: { select: { id: true, name: true, description: true } },
          },
        },
      },
    });
  }

  postsSince(orgId: string, integrationIds: string[], since: Date) {
    return this._posts.model.post.findMany({
      where: {
        organizationId: orgId,
        integrationId: { in: integrationIds },
        deletedAt: null,
        publishDate: { gte: since },
        state: { in: [State.PUBLISHED, State.QUEUE] },
      },
      select: {
        integrationId: true,
        formatId: true,
        state: true,
        publishDate: true,
        releaseId: true,
        pfmPostId: true,
        format: { select: { id: true, name: true, description: true } },
      },
    });
  }
}

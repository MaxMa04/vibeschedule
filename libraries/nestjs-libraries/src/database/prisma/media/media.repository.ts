import { PrismaRepository } from '@vibeschedule/nestjs-libraries/database/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

const PAGE_SIZE = 18;

@Injectable()
export class MediaRepository {
  constructor(private _media: PrismaRepository<'media'>) {}

  saveFile(org: string, name: string, path: string, originalName?: string) {
    return this._media.model.media.create({
      data: {
        organizationId: org,
        name,
        path,
        originalName: originalName || null,
      },
      select: { id: true, name: true, originalName: true, path: true },
    });
  }

  // the file stays in R2, scheduled posts may still point at it
  deleteMedia(org: string, id: string) {
    return this._media.model.media.update({
      where: { id, organizationId: org },
      data: { deletedAt: new Date() },
      select: { id: true },
    });
  }

  async getMedia(org: string, page: number, search?: string) {
    const where: Prisma.MediaWhereInput = {
      organizationId: org,
      deletedAt: null,
      ...(search?.trim()
        ? {
            originalName: {
              contains: search.trim(),
              mode: 'insensitive' as const,
            },
          }
        : {}),
    };

    const [total, results] = await Promise.all([
      this._media.model.media.count({ where }),
      this._media.model.media.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          originalName: true,
          path: true,
          createdAt: true,
        },
        skip: ((page || 1) - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
    ]);

    return { pages: Math.ceil(total / PAGE_SIZE), results };
  }
}

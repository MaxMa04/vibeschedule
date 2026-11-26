import { BadRequestException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { ME, NO_APP } from '@vibeschedule/helpers/channels/channel.filter';

/** The `app` and `user` query params as the routes take them */
export interface ChannelFilterQuery {
  app?: string;
  user?: string;
}

/** `appId: null` means channels without an app */
export interface ChannelFilter {
  appId?: string | null;
  userId?: string;
}

// `user=me` needs a session, the public API has none
export function channelFilter(
  query: ChannelFilterQuery,
  currentUserId?: string
): ChannelFilter {
  const app = query.app?.trim();
  const user = query.user?.trim();
  if (user === ME && !currentUserId) {
    throw new BadRequestException('user=me gibt es nur mit Anmeldung');
  }
  return {
    ...(app ? { appId: app === NO_APP ? null : app } : {}),
    ...(user ? { userId: user === ME ? currentUserId : user } : {}),
  };
}

export function channelWhere(
  filter: ChannelFilter = {}
): Prisma.IntegrationWhereInput {
  return {
    ...(filter.appId !== undefined ? { appId: filter.appId } : {}),
    ...(filter.userId ? { users: { some: { userId: filter.userId } } } : {}),
  };
}

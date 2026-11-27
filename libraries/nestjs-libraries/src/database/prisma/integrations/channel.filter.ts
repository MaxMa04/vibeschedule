import { BadRequestException } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import {
  ME,
  NO_APP,
  NO_CLIPPERS,
} from '@vibeschedule/helpers/channels/channel.filter';

/** The `app`, `user` and `clippers` query params as the routes take them */
export interface ChannelFilterQuery {
  app?: string;
  user?: string;
  clippers?: string;
}

/**
 * `appId: null` means channels without an app. `clippers: false` leaves out
 * the channels of clippers; otherwise `userId` also covers the channels of
 * the clippers that user looks after.
 */
export interface ChannelFilter {
  appId?: string | null;
  userId?: string;
  clippers?: false;
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
    ...(query.clippers?.trim() === NO_CLIPPERS ? { clippers: false } : {}),
  };
}

const clipper = (where: Prisma.UserOrganizationWhereInput = {}) => ({
  user: { organizations: { some: { role: Role.CLIPPER, ...where } } },
});

export function channelWhere(
  filter: ChannelFilter = {}
): Prisma.IntegrationWhereInput {
  const { appId, userId, clippers } = filter;
  const users: Prisma.IntegrationWhereInput[] = [];
  if (userId) {
    users.push({
      users: {
        some:
          clippers === false
            ? { userId }
            : { OR: [{ userId }, clipper({ managerId: userId })] },
      },
    });
  }
  if (clippers === false) {
    users.push({ users: { none: clipper() } });
  }
  return {
    ...(appId !== undefined ? { appId } : {}),
    ...(users.length === 1 ? users[0] : {}),
    ...(users.length > 1 ? { AND: users } : {}),
  };
}

/**
 * The channels on the team's list of posts to post by hand: a clipper posts
 * their channels themselves, so those only show for someone responsible too.
 */
export function manualListWhere(userId: string): Prisma.IntegrationWhereInput {
  return {
    OR: [{ users: { some: { userId } } }, { users: { none: clipper() } }],
  };
}

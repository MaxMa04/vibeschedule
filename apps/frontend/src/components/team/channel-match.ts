import {
  ME,
  NO_APP,
  NO_CLIPPERS,
} from '@vibeschedule/helpers/channels/channel.filter';

export interface ChannelFilterValue {
  app?: string | null;
  user?: string | null;
  clippers?: string | null;
}

interface FilterableChannel {
  app?: { id: string } | null;
  users?: { id: string; role?: string; managerId?: string | null }[];
}

/**
 * The same `app`/`user`/`clippers` filter the API applies (`channelWhere`),
 * for lists the page already has
 */
export const channelMatches = (
  channel: FilterableChannel,
  { app, user, clippers }: ChannelFilterValue,
  meId?: string
) => {
  if (app && (app === NO_APP ? !!channel.app : channel.app?.id !== app)) {
    return false;
  }
  const users = channel.users ?? [];
  const withClippers = clippers !== NO_CLIPPERS;
  if (!withClippers && users.some((u) => u.role === 'CLIPPER')) {
    return false;
  }
  if (user) {
    const id = user === ME ? meId : user;
    return (
      !!id &&
      users.some(
        (u) =>
          u.id === id ||
          (withClippers && u.role === 'CLIPPER' && u.managerId === id)
      )
    );
  }
  return true;
};

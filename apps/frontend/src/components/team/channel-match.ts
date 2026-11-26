import { ME, NO_APP } from '@vibeschedule/helpers/channels/channel.filter';

export interface ChannelFilterValue {
  app?: string | null;
  user?: string | null;
}

interface FilterableChannel {
  app?: { id: string } | null;
  users?: { id: string }[];
}

/** The same `app`/`user` filter the API applies, for lists the page already has */
export const channelMatches = (
  channel: FilterableChannel,
  { app, user }: ChannelFilterValue,
  meId?: string
) => {
  if (app && (app === NO_APP ? !!channel.app : channel.app?.id !== app)) {
    return false;
  }
  if (user) {
    const id = user === ME ? meId : user;
    return !!id && !!channel.users?.some((u) => u.id === id);
  }
  return true;
};

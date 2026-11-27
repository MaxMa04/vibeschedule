'use client';

import { useCallback } from 'react';
import useSWR from 'swr';
import { useFetch } from '@vibeschedule/helpers/utils/custom.fetch';
import type { Integrations } from '@vibeschedule/frontend/components/launches/calendar.context';
import type { TeamUser } from '@vibeschedule/helpers/channels/channel.filter';

// Data several pages share. SWR caches by key, so each key must always hold
// the same shape: read these endpoints only through the hooks below
// (scripts/check-frontend.mjs enforces it).
export const CHANNELS_KEY = '/integrations/list';
export const APPS_KEY = '/apps';
export const TEAM_KEY = '/user/team';

export interface AppListItem {
  id: string;
  name: string;
  /** what clippers read about the app */
  brief?: string | null;
  _count?: { integrations: number };
}

const options = {
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
  keepPreviousData: true,
};

const useLoader = <T>(pick: (json: unknown) => T) => {
  const fetch = useFetch();
  return useCallback(
    async (path: string) => {
      const response = await fetch(path);
      if (!response.ok) {
        throw new Error(response.statusText || String(response.status));
      }
      return pick(await response.json());
    },
    [fetch]
  );
};

/** The channels of the workspace, as an array */
export const useChannelList = <T = Integrations>() => {
  const load = useLoader(
    (json) => ((json as { integrations?: T[] })?.integrations ?? []) as T[]
  );
  return useSWR<T[]>(CHANNELS_KEY, load, options);
};

/** The apps of the workspace, as an array */
export const useAppList = <T = AppListItem>() => {
  const load = useLoader((json) => (Array.isArray(json) ? json : []) as T[]);
  return useSWR<T[]>(APPS_KEY, load, options);
};

/** The team members, for the "Zuständig" filter and picker (not for clippers) */
export const useTeamList = (enabled = true) => {
  const load = useLoader((json) => (Array.isArray(json) ? json : []) as TeamUser[]);
  return useSWR<TeamUser[]>(enabled ? TEAM_KEY : null, load, options);
};

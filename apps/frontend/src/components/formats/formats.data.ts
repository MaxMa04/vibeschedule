'use client';

import { useCallback } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { useJson } from '@vibeschedule/frontend/lib/use-json';
import {
  APPS_KEY,
  CHANNELS_KEY,
  useAppList,
  useChannelList,
} from '@vibeschedule/frontend/lib/shared-data';

export type FormatStatus = 'ACTIVE' | 'TESTING' | 'PAUSED';

export const FORMAT_STATUSES: FormatStatus[] = ['ACTIVE', 'TESTING', 'PAUSED'];

export const PERIODS = [7, 30, 90];

export interface App {
  id: string;
  name: string;
  _count?: { integrations: number };
}

export interface Format {
  id: string;
  name: string;
  description: string | null;
  integrations: {
    integrationId: string;
    status: FormatStatus;
    note: string | null;
    position: number;
  }[];
}

export interface FormatStats {
  published: number;
  scheduled: number;
  lastPostAt: string | null;
  nextPostAt: string | null;
  views: number | null;
  likes: number | null;
}

export interface OverviewFormat {
  formatId: string;
  name: string;
  description: string | null;
  /** false: posted with this format, but it is not assigned to the account */
  assigned: boolean;
  status: FormatStatus | null;
  note: string | null;
  position: number | null;
  stats: FormatStats;
}

export interface MetricTotals {
  posts: number;
  views: number | null;
  likes: number | null;
}

export interface OverviewChannel {
  id: string;
  name: string;
  picture: string | null;
  profile: string | null;
  identifier: string;
  platform: string;
  disabled: boolean;
  app: { id: string; name: string } | null;
  formats: OverviewFormat[];
  feed: (MetricTotals & { withoutFormat: MetricTotals }) | null;
  feedError: string | null;
}

export interface Overview {
  days: number;
  since: string;
  channels: OverviewChannel[];
}

export interface Channel {
  id: string;
  name: string;
  picture: string;
  identifier: string;
  disabled: boolean;
  app: { id: string; name: string } | null;
}

const swrOptions = {
  revalidateOnFocus: false,
  keepPreviousData: true,
};

export const useOverview = (
  app: string | null,
  user: string | null,
  days: number,
  enabled = true
) => {
  const json = useJson();
  const query = new URLSearchParams({ days: String(days) });
  if (app) query.set('app', app);
  if (user) query.set('user', user);
  return useSWR<Overview>(
    enabled ? `/formats/overview?${query}` : null,
    json,
    swrOptions
  );
};

export const useFormats = () => {
  const json = useJson();
  return useSWR<Format[]>('/formats', json, swrOptions);
};

export const useApps = () => useAppList<App>();

export const useChannels = () => useChannelList<Channel>();

const touched = (key: unknown) =>
  typeof key === 'string' &&
  (key.startsWith('/formats') ||
    key === APPS_KEY ||
    key === CHANNELS_KEY);

/** Writes to the API and reloads everything the Formate page shows */
export const useFormatsApi = () => {
  const json = useJson();
  const { mutate } = useSWRConfig();
  const send = useCallback(
    async (method: string, path: string, body?: unknown) => {
      const result = await json(path, {
        method,
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      });
      // the overview reloads in the background, the old numbers stay meanwhile
      mutate(touched);
      return result;
    },
    [json, mutate]
  );

  return {
    createFormat: (body: { name: string; description: string | null }) =>
      send('POST', '/formats', body) as Promise<{ id: string }>,
    updateFormat: (
      id: string,
      body: { name: string; description: string | null }
    ) => send('PUT', `/formats/${id}`, body),
    deleteFormat: (id: string) => send('DELETE', `/formats/${id}`),
    assign: (
      formatId: string,
      integrationId: string,
      body: { status: FormatStatus; note: string | null }
    ) =>
      send('PUT', `/formats/${formatId}/integrations/${integrationId}`, body),
    unassign: (formatId: string, integrationId: string) =>
      send('DELETE', `/formats/${formatId}/integrations/${integrationId}`),
    createApp: (name: string) =>
      send('POST', APPS_KEY, { name }) as Promise<{ id: string }>,
    renameApp: (id: string, name: string) =>
      send('PUT', `/apps/${id}`, { name }),
    deleteApp: (id: string) => send('DELETE', `/apps/${id}`),
    setChannelApp: (integrationId: string, appId: string | null) =>
      send('PUT', `/integrations/${integrationId}/app`, { appId }),
  };
};

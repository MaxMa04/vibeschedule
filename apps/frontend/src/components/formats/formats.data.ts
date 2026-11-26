'use client';

import { useCallback } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { useFetch } from '@vibeschedule/helpers/utils/custom.fetch';

export type FormatStatus = 'ACTIVE' | 'TESTING' | 'PAUSED';

export const FORMAT_STATUSES: FormatStatus[] = ['ACTIVE', 'TESTING', 'PAUSED'];

/** `app` filter value for accounts without an app */
export const NO_APP = 'none';

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

const errorMessage = async (response: Response) => {
  const { message } = await response.json().catch(() => ({}));
  return (Array.isArray(message) ? message[0] : message) as string | undefined;
};

const useJson = () => {
  const fetch = useFetch();
  return useCallback(
    async (path: string, init?: RequestInit) => {
      const response = await fetch(path, init);
      if (!response.ok) {
        throw new Error((await errorMessage(response)) || response.statusText);
      }
      const text = await response.text();
      return text ? JSON.parse(text) : null;
    },
    [fetch]
  );
};

const swrOptions = {
  revalidateOnFocus: false,
  keepPreviousData: true,
};

export const useOverview = (app: string | null, days: number) => {
  const json = useJson();
  const query = new URLSearchParams({ days: String(days) });
  if (app) query.set('app', app);
  return useSWR<Overview>(`/formats/overview?${query}`, json, swrOptions);
};

export const useFormats = () => {
  const json = useJson();
  return useSWR<Format[]>('/formats', json, swrOptions);
};

export const useApps = () => {
  const json = useJson();
  return useSWR<App[]>('/apps', json, swrOptions);
};

export const useChannels = () => {
  const json = useJson();
  return useSWR<Channel[]>(
    '/integrations/list',
    async (path: string) => (await json(path)).integrations,
    swrOptions
  );
};

const touched = (key: unknown) =>
  typeof key === 'string' &&
  (key.startsWith('/formats') ||
    key === '/apps' ||
    key === '/integrations/list');

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
      send('POST', '/apps', { name }) as Promise<{ id: string }>,
    renameApp: (id: string, name: string) =>
      send('PUT', `/apps/${id}`, { name }),
    deleteApp: (id: string) => send('DELETE', `/apps/${id}`),
    setChannelApp: (integrationId: string, appId: string | null) =>
      send('PUT', `/integrations/${integrationId}/app`, { appId }),
  };
};

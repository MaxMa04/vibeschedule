'use client';

import { useCallback } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { useJson } from '@vibeschedule/frontend/lib/use-json';

export type InspirationStatus = 'OPEN' | 'DONE' | 'SKIPPED';

export const INSPIRATION_STATUSES: InspirationStatus[] = [
  'OPEN',
  'DONE',
  'SKIPPED',
];

export const statusLabelKey: Record<InspirationStatus, string> = {
  OPEN: 'inspiration_status_open',
  DONE: 'inspiration_status_done',
  SKIPPED: 'inspiration_status_skipped',
};

export interface InspirationLink {
  id: string;
  url: string;
  platform: 'tiktok' | 'instagram' | 'youtube' | 'other';
  author: string | null;
  /** preview image on R2, null when the platform gave none */
  thumbnail: string | null;
  note: string | null;
  status: InspirationStatus;
  createdAt: string;
  app: { id: string; name: string } | null;
  format: { id: string; name: string } | null;
  createdBy: { id: string; name: string | null; email: string } | null;
}

const KEY = '/inspiration';

/** all links of the app filter (`none`: without app), every status */
export const useInspiration = (app: string | null, enabled: boolean) => {
  const json = useJson();
  const query = app ? `?${new URLSearchParams({ app })}` : '';
  return useSWR<InspirationLink[]>(enabled ? `${KEY}${query}` : null, json, {
    revalidateOnFocus: true,
    keepPreviousData: true,
  });
};

export const useInspirationApi = () => {
  const json = useJson();
  const { mutate } = useSWRConfig();
  const send = useCallback(
    async (method: string, path: string, body?: unknown) => {
      const result = await json(path, {
        method,
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      });
      mutate((key) => typeof key === 'string' && key.startsWith(KEY));
      return result;
    },
    [json, mutate]
  );
  return {
    add: (body: { url: string; appId: string | null }) =>
      send('POST', KEY, body) as Promise<InspirationLink & { duplicate: boolean }>,
    update: (
      id: string,
      body: Partial<{
        appId: string | null;
        formatId: string | null;
        status: InspirationStatus;
        note: string | null;
      }>
    ) => send('PUT', `${KEY}/${id}`, body),
    remove: (id: string) => send('DELETE', `${KEY}/${id}`),
  };
};

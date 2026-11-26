'use client';

import useSWR from 'swr';
import { useFetch } from '@vibeschedule/helpers/utils/custom.fetch';
import type {
  AccountAnalytics,
  AnalyticsOverview,
} from '@vibeschedule/helpers/utils/analytics.types';

export const PERIODS = [7, 14, 30, 90] as const;

export interface AppItem {
  id: string;
  name: string;
}

export interface ChannelItem {
  id: string;
  name: string;
  picture: string | null;
  identifier: string;
  disabled: boolean;
  app: AppItem | null;
}

const swrOptions = {
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
  keepPreviousData: true,
  shouldRetryOnError: false,
};

function useJson<T>(url: string | null) {
  const fetch = useFetch();
  const load = async (path: string) => {
    const res = await fetch(path);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.message || `HTTP ${res.status}`);
    }
    return res.json();
  };
  const swr = useSWR<T>(url, load, swrOptions);
  // reloads past the 5 min feed cache of the backend
  const refresh = () =>
    url
      ? swr.mutate(load(`${url}${url.includes('?') ? '&' : '?'}fresh=1`), {
          revalidate: false,
        })
      : Promise.resolve(undefined);
  return { ...swr, refresh };
}

export function useOverview(days: number, app: string | null) {
  const query = new URLSearchParams({ days: String(days) });
  if (app) query.set('app', app);
  return useJson<AnalyticsOverview>(`/analytics/overview?${query}`);
}

export function useAccount(id: string | null, days: number) {
  return useJson<AccountAnalytics>(
    id ? `/analytics/account/${encodeURIComponent(id)}?days=${days}` : null
  );
}

export function useApps() {
  return useJson<AppItem[]>('/apps');
}

export function useChannels() {
  const result = useJson<{ integrations: ChannelItem[] }>('/integrations/list');
  return { ...result, data: result.data?.integrations };
}

export type OverviewState = ReturnType<typeof useOverview>;
export type AccountState = ReturnType<typeof useAccount>;

const REACH_LABELS = ['Aufrufe', 'Impressionen', 'Reichweite'];

// interactions (likes, comments, …) per view, from metric sums by label
export function engagementByLabel(
  metrics: Record<string, number>,
  primaryLabel: string | null
) {
  if (!primaryLabel || !REACH_LABELS.includes(primaryLabel)) return null;
  const reach = metrics[primaryLabel];
  if (!reach) return null;
  const engaged = Object.entries(metrics)
    .filter(([label]) => !REACH_LABELS.includes(label))
    .reduce((sum, [, value]) => sum + value, 0);
  return engaged / reach;
}

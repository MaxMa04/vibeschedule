import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import type { PfmFeedPost } from './pfm.client';
import type {
  AnalyticsMetric,
  AnalyticsPeriod,
} from '@vibeschedule/helpers/utils/analytics.types';

dayjs.extend(utc);
dayjs.extend(timezone);

export const ANALYTICS_TZ = 'Europe/Berlin';
const REACH_LABELS = ['Aufrufe', 'Impressionen', 'Reichweite'];

export interface MetricDef extends AnalyticsMetric {
  path: string;
}

export interface AnalyticsRange {
  dates: string[];
  from: string;
  to: string;
  prevFrom: string;
  prevTo: string;
  // feed start: midnight of prevFrom in Berlin
  since: dayjs.Dayjs;
}

// calendar days in Berlin: the current period ends today, the previous one
// has the same length and ends the day before
export function analyticsRange(days: number, now = dayjs()): AnalyticsRange {
  const today = dayjs.utc(now.tz(ANALYTICS_TZ).format('YYYY-MM-DD'));
  const from = today.subtract(days - 1, 'day');
  const prevFrom = from.subtract(days, 'day');
  const fmt = (d: dayjs.Dayjs) => d.format('YYYY-MM-DD');
  return {
    dates: Array.from({ length: days }, (_, i) => fmt(from.add(i, 'day'))),
    from: fmt(from),
    to: fmt(today),
    prevFrom: fmt(prevFrom),
    prevTo: fmt(from.subtract(1, 'day')),
    since: dayjs.tz(fmt(prevFrom), ANALYTICS_TZ),
  };
}

export const postDay = (post: PfmFeedPost) =>
  dayjs(post.posted_at).tz(ANALYTICS_TZ).format('YYYY-MM-DD');

const valueAt = (source: unknown, path: string) => {
  const value = path
    .split('.')
    .reduce<unknown>(
      (obj, part) =>
        obj && typeof obj === 'object'
          ? (obj as Record<string, unknown>)[part]
          : undefined,
      source
    );
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
};

// the platform metrics the feed reports (all of them when no post has any),
// views first among the reach metrics
export function metricDefs(
  platformMetrics: Array<{ path: string; label: string }>,
  posts: PfmFeedPost[]
): { defs: MetricDef[]; primary: string | null } {
  const present = platformMetrics.filter(({ path }) =>
    posts.some((p) => valueAt(p.metrics, path) !== null)
  );
  const defs = (present.length ? present : platformMetrics).map(
    ({ path, label }) => ({
      key: path.replace(/\./g, '_'),
      path,
      label,
      reach: REACH_LABELS.includes(label),
    })
  );
  const primary =
    REACH_LABELS.map((l) => defs.find((d) => d.label === l)).find(Boolean) ??
    defs[0];
  return { defs, primary: primary?.key ?? null };
}

export function metricValues(post: PfmFeedPost, defs: MetricDef[]) {
  return Object.fromEntries(
    defs.map((d) => [d.key, valueAt(post.metrics, d.path) ?? 0])
  );
}

export function engagementRate(
  values: Record<string, number>,
  defs: MetricDef[],
  primary: string | null
) {
  const reach = defs.find((d) => d.key === primary);
  if (!reach?.reach || !values[reach.key]) {
    return null;
  }
  const engaged = defs
    .filter((d) => !d.reach)
    .reduce((sum, d) => sum + (values[d.key] || 0), 0);
  return engaged / values[reach.key];
}

export function periodTotals(
  rows: Array<Record<string, number>>,
  defs: MetricDef[],
  primary: string | null,
  from: string,
  to: string
): AnalyticsPeriod {
  const metrics = Object.fromEntries(
    defs.map((d) => [d.key, rows.reduce((sum, r) => sum + (r[d.key] || 0), 0)])
  );
  return {
    from,
    to,
    posts: rows.length,
    metrics,
    avgPerPost:
      primary && rows.length ? Math.round(metrics[primary] / rows.length) : null,
    engagementRate: engagementRate(metrics, defs, primary),
  };
}

const percent = (current: number | null, previous: number | null) =>
  current === null || !previous
    ? null
    : Math.round(((current - previous) / previous) * 1000) / 10;

export function periodChange(
  current: AnalyticsPeriod,
  previous: AnalyticsPeriod
): Record<string, number | null> {
  return {
    posts: percent(current.posts, previous.posts),
    avgPerPost: percent(current.avgPerPost, previous.avgPerPost),
    engagementRate: percent(current.engagementRate, previous.engagementRate),
    ...Object.fromEntries(
      Object.keys(current.metrics).map((key) => [
        key,
        percent(current.metrics[key], previous.metrics[key] ?? 0),
      ])
    ),
  };
}

// one row per day: number of posts and the summed metrics of those posts
export function dailySeries(
  dates: string[],
  rows: Array<{ date: string; values: Record<string, number> }>,
  defs: MetricDef[]
) {
  return dates.map((date) => {
    const day = rows.filter((r) => r.date === date);
    return {
      date,
      posts: day.length,
      ...Object.fromEntries(
        defs.map((d) => [
          d.key,
          day.reduce((sum, r) => sum + (r.values[d.key] || 0), 0),
        ])
      ),
    };
  });
}

// runs fn over items with at most `limit` calls in flight, keeps the order
export async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker)
  );
  return results;
}

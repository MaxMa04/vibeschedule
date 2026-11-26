// Contracts of GET /analytics/overview and GET /analytics/account/:id.
// Metric values are lifetime counts of the posts published in a period, so a
// day's value belongs to the posts published that day, not to views on that day.

export interface AnalyticsMetric {
  // flat key, the PfM metric path with dots replaced by underscores
  key: string;
  label: string;
  // views, impressions or reach (not counted as engagement)
  reach: boolean;
}

export interface AnalyticsChannel {
  id: string;
  name: string;
  picture: string | null;
  identifier: string;
  disabled: boolean;
  app: { id: string; name: string } | null;
}

export interface AnalyticsPeriod {
  from: string;
  to: string;
  posts: number;
  metrics: Record<string, number>;
  // primary metric per post
  avgPerPost: number | null;
  // engagement metrics / primary metric, 0..1
  engagementRate: number | null;
}

export interface AnalyticsDay {
  date: string;
  posts: number;
  [metricKey: string]: number | string;
}

export interface AnalyticsPost {
  id: string;
  postedAt: string;
  caption: string;
  url: string | null;
  thumbnail: string | null;
  metrics: Record<string, number>;
  engagementRate: number | null;
  // the vibeschedule post this feed post was published from
  post: { id: string; format: { id: string; name: string } | null } | null;
  // its format: the one of that post or the one given afterwards to a post
  // published by hand
  format: { id: string; name: string } | null;
}

export interface AccountAnalytics {
  channel: AnalyticsChannel;
  days: number;
  metrics: AnalyticsMetric[];
  primary: string | null;
  current: AnalyticsPeriod;
  previous: AnalyticsPeriod;
  // percent change of current vs previous, null when previous is 0
  change: Record<string, number | null>;
  series: AnalyticsDay[];
  posts: AnalyticsPost[];
  fetchedAt: string;
}

export interface OverviewChannel {
  channel: AnalyticsChannel;
  metrics: AnalyticsMetric[];
  primary: string | null;
  current: AnalyticsPeriod;
  previous: AnalyticsPeriod;
  change: Record<string, number | null>;
  // daily posts and primary metric
  series: Array<{ date: string; posts: number; value: number }>;
  error: string | null;
}

export interface AnalyticsOverview {
  days: number;
  from: string;
  to: string;
  // totals across channels, metrics summed by label
  summary: {
    primaryLabel: string | null;
    current: { posts: number; metrics: Record<string, number> };
    previous: { posts: number; metrics: Record<string, number> };
    series: Array<{ date: string; posts: number; value: number }>;
  };
  channels: OverviewChannel[];
  fetchedAt: string;
}

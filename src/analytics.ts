import { AccountRow, AnalyticsSnapshotRow, Db, insertAnalyticsSnapshot, listAccounts, listAnalyticsSnapshots, listScheduledPosts, ScheduledPostRow } from "./db.js";
import { CliError } from "./errors.js";
import { PostForMeClient, unwrapData } from "./postforme.js";
import { redactSensitiveFields } from "./redact.js";

export interface AnalyticsSyncOptions {
  accounts?: string[];
  platform?: string;
}

export interface AnalyticsPostOptions {
  account?: string;
  days?: number;
}

export async function syncAnalytics(
  db: Db,
  client: PostForMeClient,
  options: AnalyticsSyncOptions = {},
): Promise<{ synced: number; accounts: Array<{ alias: string; social_account_id: string; items: number }>; snapshots: AnalyticsSnapshotRow[] }> {
  const accounts = resolveAccounts(db, options);
  const localPosts = listScheduledPosts(db);
  const snapshots: AnalyticsSnapshotRow[] = [];
  const accountSummaries: Array<{ alias: string; social_account_id: string; items: number }> = [];

  for (const account of accounts) {
    const rawFeed = await client.getSocialAccountFeed(account.post_for_me_account_id, { expand: "metrics" });
    const safeFeed = redactSensitiveFields(rawFeed);
    const items = unwrapData(safeFeed);
    accountSummaries.push({ alias: account.alias, social_account_id: account.post_for_me_account_id, items: items.length });

    for (const item of items) {
      const normalized = normalizeFeedItem(item);
      const match = matchLocalPost(localPosts, account.alias, item, normalized);
      snapshots.push(
        insertAnalyticsSnapshot(db, {
          scheduled_post_id: match?.id ?? null,
          external_id: match?.external_id ?? null,
          post_for_me_post_id: match?.post_for_me_post_id ?? null,
          social_account_id: account.post_for_me_account_id,
          account_alias: account.alias,
          platform: account.platform,
          feed_item_id: normalized.id,
          feed_item_url: normalized.url,
          caption: normalized.caption,
          published_at: normalized.publishedAt,
          views: normalized.metrics.views,
          likes: normalized.metrics.likes,
          comments: normalized.metrics.comments,
          shares: normalized.metrics.shares,
          saves: normalized.metrics.saves,
          metrics_json: normalized.metricsRaw === undefined ? null : JSON.stringify(normalized.metricsRaw),
          raw_json: JSON.stringify(item),
        }),
      );
    }
  }

  return { synced: snapshots.length, accounts: accountSummaries, snapshots };
}

export function listPostAnalytics(
  db: Db,
  options: AnalyticsPostOptions = {},
): Array<{
  snapshot: AnalyticsSnapshotRow;
  post: ScheduledPostRow | null;
}> {
  const postsById = new Map(listScheduledPosts(db).map((post) => [post.id, post]));
  const latestByKey = new Map<string, AnalyticsSnapshotRow>();

  for (const snapshot of listAnalyticsSnapshots(db, options)) {
    const key = snapshot.scheduled_post_id
      ? `post:${snapshot.scheduled_post_id}`
      : `feed:${snapshot.social_account_id}:${snapshot.feed_item_id ?? snapshot.id}`;
    if (!latestByKey.has(key)) {
      latestByKey.set(key, snapshot);
    }
  }

  return [...latestByKey.values()].map((snapshot) => ({
    snapshot,
    post: snapshot.scheduled_post_id ? postsById.get(snapshot.scheduled_post_id) ?? null : null,
  }));
}

function resolveAccounts(db: Db, options: AnalyticsSyncOptions): AccountRow[] {
  const platform = options.platform ?? "tiktok";
  const allAccounts = listAccounts(db, platform);
  if (!options.accounts || options.accounts.length === 0) return allAccounts;
  const requested = new Set(options.accounts);
  const matched = allAccounts.filter((account) => requested.has(account.alias));
  const missing = [...requested].filter((alias) => !matched.some((account) => account.alias === alias));
  if (missing.length > 0) {
    throw new CliError(`Unknown account alias: ${missing.join(", ")}. Run accounts sync first.`, "UNKNOWN_ACCOUNT", 1);
  }
  return matched;
}

interface NormalizedFeedItem {
  id: string | null;
  url: string | null;
  caption: string | null;
  publishedAt: string | null;
  metrics: {
    views: number | null;
    likes: number | null;
    comments: number | null;
    shares: number | null;
    saves: number | null;
  };
  metricsRaw: unknown;
}

function normalizeFeedItem(item: unknown): NormalizedFeedItem {
  const object = isRecord(item) ? item : {};
  const metricsRaw = firstValue(object, ["metrics", "analytics", "insights", "statistics"]);
  return {
    id: firstString(object, ["id", "post_id", "platform_id", "provider_post_id", "external_id"]),
    url: firstString(object, ["url", "permalink", "post_url", "share_url"]),
    caption: firstString(object, ["caption", "text", "description", "title"]),
    publishedAt: firstString(object, ["published_at", "created_at", "timestamp", "posted_at"]),
    metrics: {
      views: extractMetric(metricsRaw, ["views", "view_count", "video_views", "plays", "impressions"]),
      likes: extractMetric(metricsRaw, ["likes", "like_count"]),
      comments: extractMetric(metricsRaw, ["comments", "comment_count"]),
      shares: extractMetric(metricsRaw, ["shares", "share_count"]),
      saves: extractMetric(metricsRaw, ["saves", "save_count", "bookmarks"]),
    },
    metricsRaw,
  };
}

function matchLocalPost(
  localPosts: ScheduledPostRow[],
  accountAlias: string,
  rawItem: unknown,
  item: NormalizedFeedItem,
): ScheduledPostRow | null {
  const rawText = JSON.stringify(rawItem).toLowerCase();
  const caption = normalizeText(item.caption ?? "");
  let best: { post: ScheduledPostRow; score: number } | null = null;

  for (const post of localPosts) {
    if (!post.account_aliases_json.includes(accountAlias)) continue;
    let score = 0;
    if (post.external_id && rawText.includes(post.external_id.toLowerCase())) score += 10;
    if (post.post_for_me_post_id && rawText.includes(post.post_for_me_post_id.toLowerCase())) score += 10;
    if (post.caption && caption && normalizeText(post.caption) === caption) score += 5;
    if (post.caption && caption && (normalizeText(post.caption).includes(caption) || caption.includes(normalizeText(post.caption)))) score += 3;
    if (post.title && item.caption && normalizeText(item.caption).includes(normalizeText(post.title))) score += 1;
    if (!best || score > best.score) best = { post, score };
  }

  return best && best.score >= 3 ? best.post : null;
}

function firstString(object: Record<string, unknown>, keys: string[]): string | null {
  const value = firstValue(object, keys);
  return typeof value === "string" && value.length > 0 ? value : null;
}

function firstValue(object: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    if (object[key] !== undefined && object[key] !== null) return object[key];
  }
  return undefined;
}

function extractMetric(metrics: unknown, names: string[]): number | null {
  if (!metrics) return null;
  if (isRecord(metrics)) {
    for (const name of names) {
      const value = numericValue(metrics[name]);
      if (value !== null) return value;
    }
  }
  if (Array.isArray(metrics)) {
    for (const metric of metrics) {
      if (!isRecord(metric)) continue;
      const name = String(metric.name ?? metric.label ?? metric.metric ?? metric.key ?? "").toLowerCase();
      if (!names.includes(name)) continue;
      const value = numericValue(metric.value ?? metric.total ?? metric.count ?? metric.data);
      if (value !== null) return value;
    }
  }
  return null;
}

function numericValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) return Math.trunc(Number(value));
  if (Array.isArray(value) && value.length > 0) return numericValue(value[value.length - 1]);
  if (isRecord(value)) return numericValue(value.total ?? value.value ?? value.count);
  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

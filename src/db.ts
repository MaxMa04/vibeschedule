import Database from "better-sqlite3";
import { dirname } from "node:path";
import { mkdirSync } from "node:fs";

export type Db = Database.Database;

export interface AccountRow {
  id: number;
  alias: string;
  platform: string;
  post_for_me_account_id: string;
  username: string | null;
  status: string | null;
  metadata_json: string | null;
  created_at: string;
  updated_at: string;
}

export interface MediaAssetRow {
  id: number;
  local_path: string | null;
  r2_key: string;
  public_url: string;
  sha256: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
}

export interface ScheduledPostRow {
  id: number;
  external_id: string;
  post_for_me_post_id: string | null;
  caption: string;
  title: string | null;
  scheduled_at: string | null;
  timezone: string;
  status: string;
  media_asset_id: number | null;
  account_aliases_json: string;
  post_for_me_response_json: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

export function openDb(path: string): Db {
  const parent = dirname(path);
  if (parent && parent !== ".") {
    mkdirSync(parent, { recursive: true });
  }
  const db = new Database(path);
  db.pragma("journal_mode = WAL");
  migrate(db);
  return db;
}

export function migrate(db: Db): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      alias TEXT NOT NULL UNIQUE,
      platform TEXT NOT NULL DEFAULT 'tiktok',
      post_for_me_account_id TEXT NOT NULL UNIQUE,
      username TEXT,
      status TEXT,
      metadata_json TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS media_assets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      local_path TEXT,
      r2_key TEXT NOT NULL UNIQUE,
      public_url TEXT NOT NULL,
      sha256 TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_media_assets_sha256 ON media_assets(sha256);

    CREATE TABLE IF NOT EXISTS scheduled_posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      external_id TEXT NOT NULL UNIQUE,
      post_for_me_post_id TEXT,
      caption TEXT NOT NULL,
      title TEXT,
      scheduled_at TEXT,
      timezone TEXT NOT NULL DEFAULT 'Europe/Berlin',
      status TEXT NOT NULL DEFAULT 'created',
      media_asset_id INTEGER,
      account_aliases_json TEXT NOT NULL,
      post_for_me_response_json TEXT,
      last_error TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(media_asset_id) REFERENCES media_assets(id)
    );

    CREATE INDEX IF NOT EXISTS idx_scheduled_posts_status ON scheduled_posts(status);
    CREATE INDEX IF NOT EXISTS idx_scheduled_posts_external_id ON scheduled_posts(external_id);
  `);
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function upsertAccount(db: Db, input: Omit<AccountRow, "id" | "created_at" | "updated_at">): AccountRow {
  const now = nowIso();
  db.prepare(
    `
      INSERT INTO accounts (alias, platform, post_for_me_account_id, username, status, metadata_json, created_at, updated_at)
      VALUES (@alias, @platform, @post_for_me_account_id, @username, @status, @metadata_json, @created_at, @updated_at)
      ON CONFLICT(post_for_me_account_id) DO UPDATE SET
        alias = excluded.alias,
        platform = excluded.platform,
        username = excluded.username,
        status = excluded.status,
        metadata_json = excluded.metadata_json,
        updated_at = excluded.updated_at
    `,
  ).run({ ...input, created_at: now, updated_at: now });

  return db
    .prepare("SELECT * FROM accounts WHERE post_for_me_account_id = ?")
    .get(input.post_for_me_account_id) as AccountRow;
}

export function findAccountByAlias(db: Db, alias: string): AccountRow | undefined {
  return db.prepare("SELECT * FROM accounts WHERE alias = ?").get(alias) as AccountRow | undefined;
}

export function listAccounts(db: Db, platform?: string): AccountRow[] {
  if (platform) {
    return db.prepare("SELECT * FROM accounts WHERE platform = ? ORDER BY alias").all(platform) as AccountRow[];
  }
  return db.prepare("SELECT * FROM accounts ORDER BY platform, alias").all() as AccountRow[];
}

export function renameAccount(db: Db, oldAlias: string, newAlias: string): AccountRow {
  const now = nowIso();
  const result = db
    .prepare("UPDATE accounts SET alias = ?, updated_at = ? WHERE alias = ?")
    .run(newAlias, now, oldAlias);
  if (result.changes === 0) {
    throw new Error(`Account alias not found: ${oldAlias}`);
  }
  return findAccountByAlias(db, newAlias)!;
}

export function findMediaBySha(db: Db, sha256: string): MediaAssetRow | undefined {
  return db.prepare("SELECT * FROM media_assets WHERE sha256 = ? ORDER BY id DESC LIMIT 1").get(sha256) as
    | MediaAssetRow
    | undefined;
}

export function insertMediaAsset(
  db: Db,
  input: Omit<MediaAssetRow, "id" | "created_at">,
): MediaAssetRow {
  const created_at = nowIso();
  const result = db
    .prepare(
      `
        INSERT INTO media_assets (local_path, r2_key, public_url, sha256, mime_type, size_bytes, created_at)
        VALUES (@local_path, @r2_key, @public_url, @sha256, @mime_type, @size_bytes, @created_at)
      `,
    )
    .run({ ...input, created_at });
  return db.prepare("SELECT * FROM media_assets WHERE id = ?").get(result.lastInsertRowid) as MediaAssetRow;
}

export function insertScheduledPost(
  db: Db,
  input: Omit<ScheduledPostRow, "id" | "created_at" | "updated_at">,
): ScheduledPostRow {
  const now = nowIso();
  const result = db
    .prepare(
      `
        INSERT INTO scheduled_posts (
          external_id, post_for_me_post_id, caption, title, scheduled_at, timezone, status,
          media_asset_id, account_aliases_json, post_for_me_response_json, last_error, created_at, updated_at
        )
        VALUES (
          @external_id, @post_for_me_post_id, @caption, @title, @scheduled_at, @timezone, @status,
          @media_asset_id, @account_aliases_json, @post_for_me_response_json, @last_error, @created_at, @updated_at
        )
      `,
    )
    .run({ ...input, created_at: now, updated_at: now });
  return getScheduledPost(db, Number(result.lastInsertRowid))!;
}

export function getScheduledPost(db: Db, idOrExternalId: number | string): ScheduledPostRow | undefined {
  if (typeof idOrExternalId === "number" || /^\d+$/.test(idOrExternalId)) {
    const row = db.prepare("SELECT * FROM scheduled_posts WHERE id = ?").get(Number(idOrExternalId)) as
      | ScheduledPostRow
      | undefined;
    if (row) return row;
  }
  return db.prepare("SELECT * FROM scheduled_posts WHERE external_id = ?").get(String(idOrExternalId)) as
    | ScheduledPostRow
    | undefined;
}

export function listScheduledPosts(db: Db, status?: string): ScheduledPostRow[] {
  if (status) {
    return db
      .prepare("SELECT * FROM scheduled_posts WHERE status = ? ORDER BY created_at DESC")
      .all(status) as ScheduledPostRow[];
  }
  return db.prepare("SELECT * FROM scheduled_posts ORDER BY created_at DESC").all() as ScheduledPostRow[];
}

export function updateScheduledPostProviderState(
  db: Db,
  id: number,
  input: { status?: string; response?: unknown; lastError?: string | null },
): ScheduledPostRow {
  const existing = getScheduledPost(db, id);
  if (!existing) throw new Error(`Scheduled post not found: ${id}`);
  db.prepare(
    `
      UPDATE scheduled_posts
      SET status = @status,
          post_for_me_response_json = @response,
          last_error = @lastError,
          updated_at = @updatedAt
      WHERE id = @id
    `,
  ).run({
    id,
    status: input.status ?? existing.status,
    response: input.response ? JSON.stringify(input.response) : existing.post_for_me_response_json,
    lastError: input.lastError ?? existing.last_error,
    updatedAt: nowIso(),
  });
  return getScheduledPost(db, id)!;
}

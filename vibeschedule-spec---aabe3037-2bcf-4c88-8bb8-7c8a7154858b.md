# Spec: vibeschedule

**Owner:** Max / Echo
**Coding Agent:** Codex CLI
**Date:** 2026-05-01
**Status:** Ready for implementation
**Scope:** Internal CLI tool, not a SaaS/product

## 1. Goal

Build **vibeschedule**: a minimal internal CLI tool that Echo/OpenClaw agents can use to upload and schedule TikTok videos across one or multiple connected accounts.

Primary use case:

> Echo has a local TikTok video + caption + target account(s) + publish time. vibeschedule uploads the video to Cloudflare R2, stores local bookkeeping in SQLite, and creates a scheduled TikTok post through Post4Me/Post for Me using `scheduled_at`.

This is not a product. No backend. No web UI. No custom scheduling worker. Keep it boring, local, scriptable, reliable, and agent-friendly.

## 2. Key Architecture Decision

Post4Me/Post for Me handles the actual scheduling.

That means vibeschedule does **not** need a backend or background worker for the MVP.

The only requirements are:

1. The video must be stored somewhere Post4Me can fetch it from.
2. The URL must be public/stable long enough for Post4Me/TikTok to process and publish it.
3. vibeschedule must call Post4Me `POST /social-posts` with `scheduled_at`.
4. vibeschedule should store local state in SQLite for traceability/status.

MVP architecture:

```text
Echo / OpenClaw Agent
        |
        v
vibeschedule CLI
        |
        +---> SQLite local DB
        |
        +---> Cloudflare R2 public media storage
        |
        +---> Post4Me API with scheduled_at
                    |
                    v
              TikTok publishing at scheduled time
```

This is kind of perfect: vibeschedule owns assets + metadata, Post4Me owns social platform auth/scheduling/publishing.

## 3. External Services

### Cloudflare R2

Used for video storage.

Requirements:

- Public/custom-domain URL must be accessible by Post4Me servers.
- Preserve video file extension.
- Set correct content type, usually `video/mp4`.
- Do not delete media automatically in MVP.

### Post4Me / Post for Me

Website: <https://www.postforme.dev/>
API docs: <https://api.postforme.dev/docs>

Known API details:

- Base URL: `https://api.postforme.dev/v1`
- Auth: `Authorization: Bearer <POST_FOR_ME_API_KEY>`
- List social accounts: `GET /social-accounts`
- Create/schedule posts: `POST /social-posts`
- Get post: `GET /social-posts/{id}`
- Get post results: `GET /social-post-results?post_id={id}`
- Scheduling uses `scheduled_at` ISO datetime. If absent/null, it posts immediately.
- TikTok config lives under `platform_configurations.tiktok`.

## 4. Non-Goals

Do **not** build in MVP:

- Backend server
- Background jobs
- Redis/BullMQ
- Temporal
- Web UI
- SaaS/multi-user auth
- Payment/billing
- Analytics dashboard
- AI video generation
- Video editing/rendering pipeline
- Direct TikTok API integration
- Native TikTok OAuth
- Complex calendar

## 5. Recommended Tech Stack

Use TypeScript/Node.

Suggested stack:

- Node.js + TypeScript
- CLI framework: `commander` or `cac`
- Config/env: `dotenv`
- Validation: `zod`
- Local DB: SQLite via `better-sqlite3`
- Cloudflare R2: S3-compatible SDK (`@aws-sdk/client-s3`)
- HTTP: native `fetch` or `undici`
- Date parsing/timezones: `luxon` or `date-fns-tz`
- Tests: Vitest

Package/project name: **vibeschedule**.

CLI command name: `vibeschedule`.

## 6. Environment Variables

Required:

```bash
POST_FOR_ME_API_KEY=
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_R2_ACCESS_KEY_ID=
CLOUDFLARE_R2_SECRET_ACCESS_KEY=
CLOUDFLARE_R2_BUCKET=
CLOUDFLARE_R2_PUBLIC_BASE_URL=
```

Optional:

```bash
VIBESCHEDULE_DB_PATH=.vibeschedule.sqlite
VIBESCHEDULE_DEFAULT_TIMEZONE=Europe/Berlin
VIBESCHEDULE_MEDIA_PREFIX=tiktok
```

Notes:

- `CLOUDFLARE_R2_PUBLIC_BASE_URL` should be a public base URL, preferably a custom domain, e.g. `https://media.example.com`.
- The final media URL is `<CLOUDFLARE_R2_PUBLIC_BASE_URL>/<r2_key>`.
- Do not commit `.env`.
- Validate env on startup and print clear missing-env errors.

## 7. SQLite Data Model

Use SQLite for local bookkeeping only. It is not responsible for publishing.

### `accounts`

Maps friendly aliases to Post4Me social account IDs.

```sql
CREATE TABLE accounts (
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
```

### `media_assets`

Tracks uploaded media.

```sql
CREATE TABLE media_assets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  local_path TEXT,
  r2_key TEXT NOT NULL UNIQUE,
  public_url TEXT NOT NULL,
  sha256 TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  created_at TEXT NOT NULL
);
```

### `scheduled_posts`

Tracks posts created via Post4Me.

```sql
CREATE TABLE scheduled_posts (
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
```

Suggested status values:

- `draft`
- `scheduled`
- `processing`
- `processed`
- `published`
- `failed`
- `cancelled`

Post4Me may return statuses like `draft`, `scheduled`, `processing`, `processed`; preserve provider status where possible.

## 8. CLI Commands

Every command should support `--json` for agent-friendly output.

### 8.1 Doctor

```bash
vibeschedule doctor
```

Checks:

- required env vars
- SQLite DB readable/writable
- R2 bucket reachable
- Post4Me API reachable

### 8.2 Accounts

Sync connected TikTok accounts from Post4Me:

```bash
vibeschedule accounts sync --platform tiktok
```

Behavior:

- Calls `GET /social-accounts?platform=tiktok&status=connected`
- Upserts accounts into SQLite
- Alias generation:
  - use username if present and safe
  - otherwise `tiktok_<shortid>`
- Print alias, platform, username, Post4Me account ID, status

Other commands:

```bash
vibeschedule accounts list
vibeschedule accounts rename <old-alias> <new-alias>
```

### 8.3 Media Upload

```bash
vibeschedule media upload ./video.mp4
```

Behavior:

- Validate file exists
- Validate MIME type, at least `video/mp4`; optionally allow `video/quicktime`
- Compute SHA256
- Upload to R2
- Store metadata in SQLite
- Return public URL

R2 key format:

```text
{prefix}/{yyyy}/{mm}/{uuid}-{sha256-short}.{ext}
```

Options:

```bash
--prefix tiktok
--force       # re-upload even if same sha exists
--json
```

If same SHA already exists and `--force` is not passed, reuse existing media asset.

### 8.4 Schedule TikTok Post

Primary command:

```bash
vibeschedule schedule \
  --account bulkup-main \
  --file ./video.mp4 \
  --caption-file ./caption.txt \
  --at "2026-05-02 10:00" \
  --timezone Europe/Berlin \
  --title "Optional TikTok title"
```

Multiple accounts:

```bash
vibeschedule schedule \
  --account bulkup-main \
  --account vibecode-main \
  --file ./video.mp4 \
  --caption "My caption" \
  --at "2026-05-02T10:00:00+02:00"
```

Behavior:

1. Resolve account aliases to Post4Me account IDs.
2. Upload media to R2 unless `--media-url` is provided.
3. Convert `--at` + timezone into ISO datetime.
4. Create stable `external_id`, e.g. `vibeschedule_<timestamp>_<sha-short>`.
5. Call Post4Me `POST /social-posts` with `scheduled_at`.
6. Store response in SQLite.
7. Print concise success.

Required flags:

- `--account` repeatable
- `--file` or `--media-url`
- `--caption` or `--caption-file`
- `--at` unless `--now` or `--draft`

Options:

```bash
--title <text>
--timezone <tz>            default Europe/Berlin
--privacy public|private   default public
--draft                    create draft if supported
--now                      post immediately by omitting scheduled_at
--dry-run                  validate and print payload, do not upload/post
--json
```

Safety:

- Do not allow immediate posting unless `--now` is explicit.
- Validate scheduled time is in the future unless `--allow-past` is passed.

### 8.5 Batch Scheduling

```bash
vibeschedule batch ./schedule.yaml
```

Example:

```yaml
defaults:
  timezone: Europe/Berlin
  accounts: [bulkup-main]
  privacy: public
posts:
  - file: ./videos/video-001.mp4
    caption_file: ./captions/video-001.txt
    at: "2026-05-02 10:00"
    title: "Protein hack"
  - file: ./videos/video-002.mp4
    caption: "Second caption"
    at: "2026-05-02 18:00"
```

Behavior:

- Validate all posts first.
- With `--dry-run`, do not upload/post anything.
- On real run, process sequentially to avoid rate limits and make failures easy to inspect.
- If one post fails, stop by default and show which item failed.
- Optional `--continue-on-error` can proceed.

### 8.6 Status / Refresh / Cancel

```bash
vibeschedule posts list --status scheduled
vibeschedule posts status <local-id-or-external-id>
vibeschedule posts refresh <local-id-or-external-id>
vibeschedule posts cancel <local-id-or-external-id> --yes
```

Behavior:

- `list` reads SQLite.
- `status` shows local + provider state if known.
- `refresh` calls:
  - `GET /social-posts/{id}`
  - `GET /social-post-results?post_id={id}`
  - updates local SQLite status/response.
- `cancel` calls Post4Me `DELETE /social-posts/{id}` and marks local status `cancelled`.

Cancel is destructive/external and must require `--yes`.

## 9. Post4Me API Payload

Create scheduled TikTok post:

```http
POST https://api.postforme.dev/v1/social-posts
Authorization: Bearer <POST_FOR_ME_API_KEY>
Content-Type: application/json
```

Payload:

```json
{
  "caption": "Caption here",
  "scheduled_at": "2026-05-02T08:00:00.000Z",
  "social_accounts": ["spc_..."],
  "media": [{ "url": "https://public-r2-url/video.mp4" }],
  "external_id": "vibeschedule_20260501_abc123",
  "platform_configurations": {
    "tiktok": {
      "title": "Optional title",
      "privacy_status": "public",
      "allow_comment": true,
      "allow_duet": true,
      "allow_stitch": true,
      "disclose_your_brand": false,
      "disclose_branded_content": false,
      "is_ai_generated": false,
      "is_draft": false
    }
  }
}
```

List connected TikTok accounts:

```http
GET https://api.postforme.dev/v1/social-accounts?platform=tiktok&status=connected
Authorization: Bearer <POST_FOR_ME_API_KEY>
```

Refresh post:

```http
GET https://api.postforme.dev/v1/social-posts/{id}
Authorization: Bearer <POST_FOR_ME_API_KEY>
```

Fetch post results:

```http
GET https://api.postforme.dev/v1/social-post-results?post_id={id}
Authorization: Bearer <POST_FOR_ME_API_KEY>
```

## 10. Cloudflare R2 Requirements

Implement a `StorageClient`.

Methods:

```ts
uploadFile(path: string, options?: { key?: string; contentType?: string }): Promise<{ key: string; publicUrl: string }>;
headObject(key: string): Promise<boolean>;
```

R2 endpoint:

```text
https://<CLOUDFLARE_ACCOUNT_ID>.r2.cloudflarestorage.com
```

Public URL:

```text
<CLOUDFLARE_R2_PUBLIC_BASE_URL>/<r2_key>
```

Requirements:

- Preserve file extension.
- Set `Content-Type`.
- Sanitize filenames.
- Do not delete media automatically in MVP.

## 11. Post4Me Client Requirements

Implement a typed client.

Methods:

```ts
listSocialAccounts(params?: { platform?: string; status?: string }): Promise<...>;
createSocialPost(input: CreateSocialPostInput): Promise<...>;
getSocialPost(id: string): Promise<...>;
deleteSocialPost(id: string): Promise<...>;
listPostResults(params: { post_id?: string }): Promise<...>;
```

Requirements:

- Base URL constant: `https://api.postforme.dev/v1`
- Bearer token auth
- JSON request/response
- Clear errors showing status code + response body
- Retry transient 5xx/network errors once or twice
- Do not retry validation errors

## 12. Agent-Friendly Output

Every command supports `--json`.

Success:

```json
{
  "ok": true,
  "post": {
    "local_id": 12,
    "external_id": "vibeschedule_20260501_abc123",
    "post_for_me_post_id": "pst_...",
    "status": "scheduled",
    "scheduled_at": "2026-05-02T08:00:00.000Z",
    "accounts": ["bulkup-main"],
    "media_url": "https://media.example.com/tiktok/2026/05/abc-video.mp4"
  }
}
```

Error:

```json
{
  "ok": false,
  "error": {
    "code": "POST_FOR_ME_ERROR",
    "message": "Provider returned 400: ..."
  }
}
```

Exit codes:

- `0` success
- `1` validation/user error
- `2` external API error
- `3` config/env error

## 13. Safety & Reliability

- No backend/worker in MVP.
- No immediate posting unless `--now` is explicit.
- `schedule` requires either `--at`, `--now`, or `--draft`.
- Validate scheduled time is in the future unless `--allow-past` is passed.
- Store all scheduled posts in SQLite.
- Store provider response JSON for debugging.
- Do not log API keys or secrets.
- For cancel/delete, require `--yes`.
- Batch processing sequential in MVP.
- Use stable `external_id` for traceability/idempotency.

## 14. Implementation Plan for Codex

### Phase 1 — Project skeleton

- Create package/project named **vibeschedule**.
- Add TypeScript build/test setup.
- Add CLI entrypoint.
- Add env/config validation.
- Add SQLite init/migrations.

### Phase 2 — Integrations

- Implement Post4Me API client.
- Implement Cloudflare R2 client.
- Implement `doctor`.

### Phase 3 — Account + media commands

- `accounts sync`
- `accounts list`
- `accounts rename`
- `media upload`

### Phase 4 — Scheduling

- `schedule` single post
- support multiple accounts
- support caption text/file
- support `--dry-run` and `--json`
- save local SQLite records

### Phase 5 — Batch + status

- `batch <file>` YAML/JSON
- `posts list`
- `posts status`
- `posts refresh`
- `posts cancel`

### Phase 6 — Tests + docs

- Unit tests for config validation, datetime parsing, key generation, payload building.
- Mock tests for Post4Me API client.
- Mock tests for R2 client if easy.
- Add README with setup and examples.

## 15. Acceptance Criteria

MVP is done when:

1. `vibeschedule doctor` verifies env/API/DB/R2.
2. `vibeschedule accounts sync --platform tiktok` imports connected TikTok accounts from Post4Me.
3. `vibeschedule media upload ./video.mp4` uploads to Cloudflare R2 and returns a public URL.
4. `vibeschedule schedule --account <alias> --file ./video.mp4 --caption-file ./caption.txt --at "tomorrow 10:00"` uploads media if needed, creates a Post4Me scheduled post, and stores local SQLite state.
5. `vibeschedule schedule ... --dry-run --json` prints the exact Post4Me payload without uploading/posting.
6. `vibeschedule batch ./schedule.yaml --dry-run` validates a batch.
7. `vibeschedule posts list` shows local scheduled posts.
8. `vibeschedule posts refresh <id>` updates local state from Post4Me.
9. Tests pass and README explains setup.

## 16. Future Extensions

Only add these if the simple CLI model starts hurting:

- small backend API for remote agents
- background status refresh
- web calendar
- multi-platform support: Instagram Reels, YouTube Shorts
- account-specific captions via Post4Me `account_configurations`
- post-publish analytics sync
- automatic content queue from Echo output folders
- Post4Me webhooks

---
name: vibeschedule
description: Install, configure, operate, validate, and extend the vibeschedule repository CLI for scheduling TikTok videos and native TikTok photo slideshow drafts through Post for Me with Cloudflare R2 media hosting. Use when an agent works in this repository and needs setup instructions, local usage commands, account sync, media upload, post scheduling, creative metadata, slideshow validation, analytics sync, batch scheduling, post inspection/cancelation, or operational guardrails.
---

# vibeschedule

## Purpose

Use this skill from the repository root. `vibeschedule` is a Node/TypeScript CLI that uploads local media to Cloudflare R2, stores local bookkeeping in SQLite, and creates TikTok posts through Post for Me.

Current proven scope:
- TikTok video posts from a local video file or already-public media URL.
- Native TikTok photo slideshow drafts from local image files or already-public image URLs.
- Single post scheduling, immediate posting with explicit `--now`, batch dry-runs, account alias sync, status refresh, cancel/delete, creative metadata capture, slideshow validation, and raw Post for Me feed analytics snapshots.

Do not assume this is a generic social scheduler. Post for Me supports more platforms, but this repository is currently implemented and tested around TikTok workflows.

## Repository Setup

Install dependencies and verify TypeScript:

```bash
npm install
npm run build
npm test
```

Create local configuration:

```bash
cp .env.example .env
```

Required `.env` values:

```bash
POST_FOR_ME_API_KEY=
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_R2_ACCESS_KEY_ID=
CLOUDFLARE_R2_SECRET_ACCESS_KEY=
CLOUDFLARE_R2_BUCKET=
CLOUDFLARE_R2_PUBLIC_BASE_URL=
```

Optional values:

```bash
POST_FOR_ME_BASE_URL=https://api.postforme.dev/v1
VIBESCHEDULE_DB_PATH=.vibeschedule.sqlite
VIBESCHEDULE_DEFAULT_TIMEZONE=Europe/Berlin
VIBESCHEDULE_MEDIA_PREFIX=tiktok
```

Never commit `.env`, SQLite files, uploaded temp media, `dist/`, or `node_modules/`. They are intentionally ignored by `.gitignore`.

## External Services

Post for Me:
- Use the dashboard project API key as `POST_FOR_ME_API_KEY`.
- Connected TikTok accounts must exist in the Post for Me project before scheduling.
- Run account sync after connecting or renaming accounts.

Cloudflare R2:
- Use an R2 bucket with object read/write API credentials.
- `CLOUDFLARE_R2_PUBLIC_BASE_URL` must be the public bucket base URL with no trailing slash.
- Production setup should use an R2 custom domain, for example `https://schedule.vibelabs.to`.
- Object keys are intentionally non-guessable: `{prefix}/{yyyy}/{mm}/{uuid}-{sha256-short}.{ext}`.

## Validation

Run this before real scheduling:

```bash
npm run dev -- doctor
```

Expected checks:
- env present
- SQLite reachable
- Post for Me API reachable
- R2 credentials accepted

Use JSON output when an agent needs machine-readable results:

```bash
npm run dev -- --json doctor
```

## Accounts

Sync connected TikTok accounts from Post for Me into the local SQLite alias table:

```bash
npm run dev -- accounts sync --platform tiktok
```

List aliases:

```bash
npm run dev -- accounts list
```

Rename an alias locally:

```bash
npm run dev -- accounts rename <old-alias> <new-alias>
```

Use aliases from `accounts list` with `--account`.

## Media

Upload a local video to R2:

```bash
npm run dev -- media upload ./video.mp4
```

Force re-upload even if the same SHA already exists:

```bash
npm run dev -- media upload ./video.mp4 --force
```

Set a custom R2 prefix:

```bash
npm run dev -- media upload ./video.mp4 --prefix tiktok
```

Supported local video types are MP4 and QuickTime. Image uploads happen through `schedule --image`.

## Schedule One TikTok Video

Dry-run first:

```bash
npm run dev -- --json schedule \
  --account <alias> \
  --file ./video.mp4 \
  --caption-file ./caption.txt \
  --at "tomorrow 10:00" \
  --timezone Europe/Berlin \
  --dry-run
```

Create a scheduled post:

```bash
npm run dev -- schedule \
  --account <alias> \
  --file ./video.mp4 \
  --caption "Caption here" \
  --at "2026-05-02 10:00" \
  --timezone Europe/Berlin
```

Use an existing public media URL instead of uploading:

```bash
npm run dev -- schedule \
  --account <alias> \
  --media-url "https://example.com/video.mp4" \
  --caption "Caption here" \
  --at "2026-05-02 10:00"
```

Immediate posting is blocked unless `--now` is explicit.

## Create Native TikTok Photo Slideshow Drafts

Use repeated `--image` flags for local images:

```bash
npm run dev -- schedule \
  --account <alias> \
  --image ./slide-01.png \
  --image ./slide-02.png \
  --image ./slide-03.png \
  --caption "Caption here" \
  --title "Slideshow title" \
  --draft \
  --auto-add-music
```

Use repeated `--image-url` flags when the images are already public:

```bash
npm run dev -- schedule \
  --account <alias> \
  --image-url "https://example.com/slide-01.png" \
  --image-url "https://example.com/slide-02.png" \
  --caption "Caption here" \
  --draft
```

Do not mix `--file`/`--media-url` video inputs with `--image`/`--image-url` photo inputs in the same post.

For six-image marketing slideshow drafts, ask the agent or script to generate images first, then let `vibeschedule` validate/upload/schedule them and store creative metadata:

```bash
npm run dev -- schedule \
  --account <alias> \
  --image ./slide-01.png \
  --image ./slide-02.png \
  --image ./slide-03.png \
  --image ./slide-04.png \
  --image ./slide-05.png \
  --image ./slide-06.png \
  --caption-file ./caption.txt \
  --title "Slideshow title" \
  --draft \
  --auto-add-music \
  --slideshow-preset marketing-6 \
  --hook "I showed my landlord what AI thinks our kitchen should look like" \
  --cta "Search Snugly on the App Store" \
  --hook-category person-conflict-ai \
  --creative-dir ./posts/2026-05-02-0730 \
  --source agent \
  --tag home \
  --metadata app=Snugly
```

`--slideshow-preset marketing-6` requires exactly six images and validates local images as portrait 2:3 when dimensions can be read. The metadata fields are stored locally with the scheduled post so later analytics can be connected to hooks and CTAs.

## Analytics

Post for Me exposes analytics through social account feeds, not a separate analytics endpoint. The connected account must have feed/metrics permission; otherwise the provider may return no feed data.

Fetch feed metrics and store raw snapshots locally:

```bash
npm run dev -- analytics sync --account <alias>
```

Sync all local TikTok accounts:

```bash
npm run dev -- analytics sync
```

List latest stored snapshots:

```bash
npm run dev -- analytics posts --account <alias> --days 7
npm run dev -- --json analytics posts --days 30
```

Analytics sync stores raw feed items, extracted metrics (`views`, `likes`, `comments`, `shares`, `saves` when present), and best-effort local post matches using provider IDs, external IDs, captions, and account aliases. Treat output as raw infrastructure data; campaign interpretation remains the agent/skill layer.

## Batch Scheduling

Validate a YAML or JSON schedule without creating provider posts:

```bash
npm run dev -- batch ./schedule.yaml --dry-run
```

Continue through errors when validating or scheduling multiple items:

```bash
npm run dev -- batch ./schedule.yaml --continue-on-error
```

Prefer `--dry-run` before a real batch. Check payloads for accounts, media URLs, captions, `scheduled_at`, and draft settings.

## Inspect and Manage Posts

List local posts:

```bash
npm run dev -- posts list
```

Filter by local status:

```bash
npm run dev -- posts list --status processed
```

Show local and provider status:

```bash
npm run dev -- posts status <local-id-or-external-id>
```

Refresh local status from Post for Me:

```bash
npm run dev -- posts refresh <local-id-or-external-id>
```

Cancel/delete a Post for Me post:

```bash
npm run dev -- posts cancel <local-id-or-external-id> --yes
```

## Operational Guardrails

- Run `npm run dev -- doctor` after changing `.env`, Post for Me, or R2.
- Run `npm test` and `npm run build` before publishing code changes.
- Do not print or commit API keys. The code redacts known token/secret fields in provider responses.
- Remember that R2 public custom domains make objects publicly readable if someone has the exact URL. Non-guessable object keys reduce discoverability; they do not add authentication.
- Local SQLite is stateful. It contains account aliases, media URLs, and post records and should stay local unless explicitly sanitized.
- The repository is public-safe only if `.env`, SQLite files, generated media, and build artifacts remain ignored.

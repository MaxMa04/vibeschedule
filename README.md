# vibeschedule

Internal CLI for uploading local TikTok videos or photo slideshows to Cloudflare R2 and scheduling them through Post for Me.

## Setup

Install and build:

```bash
npm install
npm run build
```

Create `.env` from `.env.example`.

Required values:

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

## Get API Keys

### Post for Me

1. Open `https://app.postforme.dev/`.
2. Select your team and project.
3. Open `API Keys`.
4. Click `Create API Key`.
5. Copy the key immediately. The dashboard says it cannot be shown again.
6. Put it in `.env` as `POST_FOR_ME_API_KEY`.

The API docs are at `https://api.postforme.dev/docs`. The CLI uses `https://api.postforme.dev/v1`.

### Cloudflare R2

1. Open `https://dash.cloudflare.com/`.
2. Go to `Storage & databases` -> `R2 Object Storage`.
3. If R2 is not active, add the R2 subscription. Cloudflare shows the free monthly allowance and usage-based pricing before confirmation.
4. Create a bucket, for example `vibeschedule`.
5. Open the bucket `Settings`.
6. Under public access, connect a custom domain or enable the public `r2.dev` URL for development.
7. Set `.env`:
   - `CLOUDFLARE_R2_BUCKET` to the bucket name.
   - `CLOUDFLARE_R2_PUBLIC_BASE_URL` to the public bucket URL without a trailing slash.
8. Go back to R2 overview.
9. Under account details/API tokens, choose `Manage`.
10. Create an R2 API token with `Object Read & Write`, scoped to the bucket.
11. Copy `Access Key ID` and `Secret Access Key` immediately.
12. Set:
   - `CLOUDFLARE_ACCOUNT_ID`
   - `CLOUDFLARE_R2_ACCESS_KEY_ID`
   - `CLOUDFLARE_R2_SECRET_ACCESS_KEY`

Cloudflare's R2 docs confirm that the S3 endpoint is `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`, and that the secret access key is only shown once.

Uploaded object URLs use non-guessable keys in the form `{prefix}/{yyyy}/{mm}/{uuid}-{sha256-short}.{ext}` and do not include the original filename.

## Commands

Check setup:

```bash
npm run dev -- doctor
npm run dev -- --json doctor
```

Sync TikTok accounts from Post for Me:

```bash
npm run dev -- accounts sync --platform tiktok
npm run dev -- accounts list
```

Upload media:

```bash
npm run dev -- media upload ./video.mp4
```

Dry-run a scheduled post:

```bash
npm run dev -- --json schedule \
  --account bulkup-main \
  --file ./video.mp4 \
  --caption-file ./caption.txt \
  --at "tomorrow 10:00" \
  --timezone Europe/Berlin \
  --dry-run
```

Schedule a post:

```bash
npm run dev -- schedule \
  --account bulkup-main \
  --file ./video.mp4 \
  --caption "Caption here" \
  --at "2026-05-02 10:00" \
  --timezone Europe/Berlin
```

Create a native TikTok photo slideshow draft:

```bash
npm run dev -- schedule \
  --account bulkup-main \
  --image ./slide-01.jpg \
  --image ./slide-02.jpg \
  --image ./slide-03.jpg \
  --caption "Caption here" \
  --title "Slideshow title" \
  --draft \
  --auto-add-music
```

Create a six-image marketing slideshow draft with creative metadata:

```bash
npm run dev -- schedule \
  --account bulkup-main \
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

Sync and inspect post analytics:

```bash
npm run dev -- analytics sync --account bulkup-main
npm run dev -- analytics posts --account bulkup-main --days 7
npm run dev -- --json analytics posts --days 30
```

Batch dry-run:

```bash
npm run dev -- batch ./schedule.yaml --dry-run
```

Inspect posts:

```bash
npm run dev -- posts list
npm run dev -- posts refresh <local-id-or-external-id>
npm run dev -- posts cancel <local-id-or-external-id> --yes
```

## Notes

- Immediate posting is blocked unless `--now` is passed.
- `--at` values must be in the future unless `--allow-past` is passed.
- TikTok video posts use `--file` or `--media-url`; native photo posts use repeatable `--image` or `--image-url`. Do not mix video and images in the same post.
- `--slideshow-preset marketing-6` requires exactly six images and validates local images as portrait 2:3 when dimensions can be read.
- Analytics are fetched from Post for Me social account feeds with `expand=metrics`. The connected account must have feed/metrics permission; otherwise the provider may return no feed data.
- Analytics sync stores raw feed snapshots and best-effort matches them to local posts using provider IDs, external IDs, captions, and account aliases.
- Media is not deleted automatically.
- `.env` and SQLite files are ignored by git.

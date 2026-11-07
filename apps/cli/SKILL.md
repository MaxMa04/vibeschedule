---
name: vibeschedule
description: Use when scheduling or inspecting social posts via the vibeschedule CLI.
---

# vibeschedule CLI

`vibeschedule` talks to the vibeschedule public API (`/public/v1`). Every command prints JSON on stdout. Errors go to stderr with exit code 1, API errors as `API-Fehler <status>: <body>`.

## Setup

- Build from the monorepo root: `corepack pnpm@10.6.1 --filter ./apps/cli build`, then run `node apps/cli/dist/index.js` (or `vibeschedule` after `npm link` in `apps/cli`).
- `VIBESCHEDULE_API_KEY` is required (workspace key, Einstellungen > API-Schlüssel). Never print it.
- `VIBESCHEDULE_API_URL` defaults to `https://vibeschedule.vibelabs.to/api`.
- Run `vibeschedule auth:check` first. It returns `{ ok, apiUrl, integrations }`.

## Workflow

1. `vibeschedule integrations:list` to get channel ids. `identifier` is the platform: `x`, `linkedin`, `instagram`, `facebook`, `threads`, `tiktok`, `tiktok_business`, `youtube`, `pinterest`, `bluesky`. Skip channels with `disabled: true`.
2. Media must live in the media library. `vibeschedule upload <file-or-https-url>` returns `path`; pass that URL to `-m`. Do not pass third-party URLs to `-m`.
3. Optional: `vibeschedule posts:find-slot <channel-id>` returns `{ date }`, the next free posting slot.
4. Create the post:
   - Same text everywhere: `vibeschedule posts:create -c "<text>" -m "<url1>,<url2>" -i "<id1>,<id2>" -s <ISO-8601> [-t schedule|draft|now] [--settings '<json>']`
   - Different text or settings per channel: write a JSON file and run `vibeschedule posts:create -j post.json`.
5. Check with `vibeschedule posts:list` (default window: 30 days back to 30 days ahead, `--start`/`--end` to change).

## Rules

- One text per channel. There are no threads, comments or follow-up posts.
- `--date` is required unless `-t now`. Use UTC (`...Z`).
- `-t draft` keeps the post in vibeschedule only. `schedule` and `now` send it to the platform.
- `--settings` applies the same object to every channel in `-i`. For channels on different platforms, use `-j` with one `settings` object per channel.
- Settings use Post for Me field names in snake_case, for example TikTok `privacy_status`, `allow_comment`, `allow_duet`, `allow_stitch`; YouTube `title`, `privacy_status`, `tags`; Instagram `placement`. Full list in `apps/cli/PLATFORM_SETTINGS.md`. Do not set `__type`, the backend adds it.
- `posts:delete <post-id>` removes the whole group (all channels of that post). `posts:delete-group <group>` takes the `group` field from `posts:list`.
- Do not create `schedule`/`now` posts unless the user asked for publishing. Use `draft` for tests.

## JSON request

```json
{
  "type": "schedule",
  "date": "2026-12-01T17:00:00Z",
  "tags": [],
  "posts": [
    {
      "integration": { "id": "<tiktok-channel-id>" },
      "value": [
        {
          "content": "Caption #tag",
          "image": [{ "id": "media-1", "path": "https://vibeschedule-media.vibelabs.to/..." }]
        }
      ],
      "settings": { "privacy_status": "public", "allow_comment": true }
    }
  ]
}
```

`value` has exactly one element. `image` holds images and videos. More templates: `apps/cli/examples/`.

## Analytics

- `vibeschedule analytics:channel <channel-id> -d 7|30|90` returns `[{ label, data: [{ total, date }], percentageChange }]`.
- `vibeschedule analytics:post <post-id>` returns the same shape for one published post.

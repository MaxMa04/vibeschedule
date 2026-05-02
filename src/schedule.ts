import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { DateTime } from "luxon";
import { CliError } from "./errors.js";
import { Db, findAccountByAlias, insertScheduledPost, ScheduledPostRow } from "./db.js";
import { sha256File, uploadImageMedia, uploadMedia, validateImageFile, validateVideoFile } from "./media.js";
import { CreateSocialPostInput, PostForMeClient } from "./postforme.js";
import { redactSensitiveFields } from "./redact.js";
import { StorageClient } from "./storage.js";
import { assertFuture, parseScheduledAt } from "./datetime.js";

export interface ScheduleOptions {
  accounts: string[];
  file?: string;
  mediaUrl?: string;
  imageFiles?: string[];
  imageUrls?: string[];
  caption?: string;
  captionFile?: string;
  at?: string;
  timezone: string;
  title?: string;
  privacy: "public" | "private";
  draft?: boolean;
  now?: boolean;
  dryRun?: boolean;
  allowPast?: boolean;
  autoAddMusic?: boolean;
}

export async function schedulePost(
  db: Db,
  storage: StorageClient | undefined,
  client: PostForMeClient,
  options: ScheduleOptions,
): Promise<{ row?: ScheduledPostRow; payload: CreateSocialPostInput; mediaUrl?: string; mediaUrls?: string[]; response?: unknown }> {
  const imageFiles = options.imageFiles ?? [];
  const imageUrls = options.imageUrls ?? [];
  const hasVideoMedia = Boolean(options.file || options.mediaUrl);
  const hasImageMedia = imageFiles.length > 0 || imageUrls.length > 0;

  if (options.accounts.length === 0) {
    throw new CliError("At least one --account is required", "MISSING_ACCOUNT", 1);
  }
  if (!hasVideoMedia && !hasImageMedia) {
    throw new CliError("Use --file/--media-url for video or --image/--image-url for TikTok photo posts", "MISSING_MEDIA", 1);
  }
  if (hasVideoMedia && hasImageMedia) {
    throw new CliError("TikTok posts cannot mix video and image media. Use either --file/--media-url or --image/--image-url.", "INVALID_MEDIA", 1);
  }
  if (options.file && options.mediaUrl) {
    throw new CliError("Use either --file or --media-url, not both.", "INVALID_MEDIA", 1);
  }
  if (!options.caption && !options.captionFile) {
    throw new CliError("Either --caption or --caption-file is required", "MISSING_CAPTION", 1);
  }
  if (!options.at && !options.now && !options.draft) {
    throw new CliError("Use --at, --now, or --draft. Immediate posting requires explicit --now.", "MISSING_SCHEDULE", 1);
  }

  const accountRows = options.accounts.map((alias) => {
    const row = findAccountByAlias(db, alias);
    if (!row) throw new CliError(`Unknown account alias: ${alias}. Run accounts sync first.`, "UNKNOWN_ACCOUNT", 1);
    return row;
  });

  const caption = options.caption ?? readFileSync(options.captionFile!, "utf8").trim();
  const isPhotoPost = hasImageMedia;
  let scheduledAt: string | undefined;
  if (options.at && !options.now && !options.draft) {
    scheduledAt = parseScheduledAt(options.at, options.timezone);
    assertFuture(scheduledAt, options.allowPast);
  }

  const mediaUrls: string[] = [];
  let mediaAssetId: number | null = null;
  let shaShort = DateTime.utc().toFormat("yyyyMMddHHmmss");

  if (hasVideoMedia) {
    if (options.mediaUrl) {
      mediaUrls.push(options.mediaUrl);
    } else if (options.file) {
      if (options.dryRun) {
        validateVideoFile(options.file);
        const sha = await sha256File(options.file);
        shaShort = sha.slice(0, 12);
        mediaUrls.push(`dry-run://${shaShort}`);
      } else {
        if (!storage) throw new CliError("Storage client is required when uploading files", "CONFIG_ERROR", 3);
        const media = await uploadMedia(db, storage, options.file);
        mediaUrls.push(media.public_url);
        mediaAssetId = media.id;
        shaShort = media.sha256.slice(0, 12);
      }
    }
  } else {
    mediaUrls.push(...imageUrls);
    const imageShas: string[] = [];
    for (const imageFile of imageFiles) {
      validateImageFile(imageFile);
      if (options.dryRun) {
        const sha = await sha256File(imageFile);
        imageShas.push(sha);
        mediaUrls.push(`dry-run://${sha.slice(0, 12)}`);
      } else {
        if (!storage) throw new CliError("Storage client is required when uploading files", "CONFIG_ERROR", 3);
        const media = await uploadImageMedia(db, storage, imageFile);
        imageShas.push(media.sha256);
        mediaUrls.push(media.public_url);
        mediaAssetId ??= media.id;
      }
    }
    if (imageShas.length > 0 || imageUrls.length > 0) {
      shaShort = shortHash([...imageUrls, ...imageShas].join(":"));
    }
  }

  const externalId = `vibeschedule_${DateTime.utc().toFormat("yyyyMMddHHmmss")}_${shaShort}`;
  const payload: CreateSocialPostInput = {
    caption,
    social_accounts: accountRows.map((account) => account.post_for_me_account_id),
    media: mediaUrls.length > 0 ? mediaUrls.map((url) => ({ url })) : undefined,
    external_id: externalId,
    platform_configurations: {
      tiktok: {
        title: options.title,
        privacy_status: options.privacy,
        allow_comment: true,
        allow_duet: true,
        allow_stitch: true,
        disclose_your_brand: false,
        disclose_branded_content: false,
        is_ai_generated: false,
        is_draft: Boolean(options.draft),
        auto_add_music: isPhotoPost ? Boolean(options.autoAddMusic) : undefined,
      },
    },
  };
  if (scheduledAt) payload.scheduled_at = scheduledAt;

  if (options.dryRun) {
    return { payload, mediaUrl: mediaUrls[0], mediaUrls };
  }

  const response = await client.createSocialPost(payload);
  const safeResponse = redactSensitiveFields(response);
  const responseObject = response && typeof response === "object" ? (response as Record<string, unknown>) : {};
  const providerId = typeof responseObject.id === "string" ? responseObject.id : null;
  const status = typeof responseObject.status === "string" ? responseObject.status : options.draft ? "draft" : "scheduled";

  const row = insertScheduledPost(db, {
    external_id: externalId,
    post_for_me_post_id: providerId,
    caption,
    title: options.title ?? null,
    scheduled_at: scheduledAt ?? null,
    timezone: options.timezone,
    status,
    media_asset_id: mediaAssetId,
    account_aliases_json: JSON.stringify(options.accounts),
    post_for_me_response_json: JSON.stringify(safeResponse),
    last_error: null,
  });

  return { row, payload, mediaUrl: mediaUrls[0], mediaUrls, response: safeResponse };
}

function shortHash(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 12);
}

import { readFileSync } from "node:fs";
import { extname } from "node:path";
import yaml from "js-yaml";
import { z } from "zod";
import { Db } from "./db.js";
import { CliError } from "./errors.js";
import { PostForMeClient } from "./postforme.js";
import { ScheduleOptions, schedulePost } from "./schedule.js";
import { StorageClient } from "./storage.js";

const batchPostSchema = z.object({
  file: z.string().optional(),
  media_url: z.string().url().optional(),
  images: z.array(z.string()).optional(),
  image_urls: z.array(z.string().url()).optional(),
  caption: z.string().optional(),
  caption_file: z.string().optional(),
  at: z.string().optional(),
  title: z.string().optional(),
  accounts: z.array(z.string()).optional(),
  timezone: z.string().optional(),
  privacy: z.enum(["public", "private"]).optional(),
  draft: z.boolean().optional(),
  now: z.boolean().optional(),
  auto_add_music: z.boolean().optional(),
});

const batchSchema = z.object({
  defaults: z
    .object({
      accounts: z.array(z.string()).optional(),
      timezone: z.string().optional(),
      privacy: z.enum(["public", "private"]).optional(),
    })
    .optional(),
  posts: z.array(batchPostSchema).min(1),
});

export async function runBatch(
  db: Db,
  storage: StorageClient | undefined,
  client: PostForMeClient,
  file: string,
  options: { dryRun?: boolean; continueOnError?: boolean; defaultTimezone: string },
) {
  const parsed = loadBatchFile(file);
  const results = [];

  for (const [index, post] of parsed.posts.entries()) {
    const scheduleOptions: ScheduleOptions = {
      accounts: post.accounts ?? parsed.defaults?.accounts ?? [],
      file: post.file,
      mediaUrl: post.media_url,
      imageFiles: post.images,
      imageUrls: post.image_urls,
      caption: post.caption,
      captionFile: post.caption_file,
      at: post.at,
      timezone: post.timezone ?? parsed.defaults?.timezone ?? options.defaultTimezone,
      title: post.title,
      privacy: post.privacy ?? parsed.defaults?.privacy ?? "public",
      draft: post.draft,
      now: post.now,
      dryRun: options.dryRun,
      autoAddMusic: post.auto_add_music,
    };

    try {
      const result = await schedulePost(db, storage, client, scheduleOptions);
      results.push({ index, ok: true, result });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      results.push({ index, ok: false, error: message });
      if (!options.continueOnError) {
        throw new CliError(`Batch item ${index + 1} failed: ${message}`, "BATCH_ITEM_FAILED", 1, results);
      }
    }
  }

  return results;
}

function loadBatchFile(file: string) {
  const content = readFileSync(file, "utf8");
  const raw = extname(file).toLowerCase() === ".json" ? JSON.parse(content) : yaml.load(content);
  const result = batchSchema.safeParse(raw);
  if (!result.success) {
    throw new CliError("Invalid batch file", "INVALID_BATCH", 1, result.error.flatten());
  }
  return result.data;
}

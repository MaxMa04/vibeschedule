#!/usr/bin/env node
import { Command, Option } from "commander";
import { loadConfig, loadPartialConfig } from "./config.js";
import { openDb } from "./db.js";
import { printError, printResult } from "./output.js";
import { PostForMeClient } from "./postforme.js";
import { StorageClient } from "./storage.js";
import { runDoctor } from "./doctor.js";
import { listStoredAccounts, renameStoredAccount, syncAccounts } from "./accounts.js";
import { uploadMedia } from "./media.js";
import { schedulePost } from "./schedule.js";
import { runBatch } from "./batch.js";
import { cancelPost, getPostStatus, listLocalPosts, refreshPost } from "./posts.js";

const program = new Command();

program.name("vibeschedule").description("Schedule TikTok posts via R2 and Post for Me").version("0.1.0");
program.option("--json", "Print JSON output");

function globalJson(command: Command): boolean {
  return Boolean(command.optsWithGlobals<{ json?: boolean }>().json);
}

function withRequiredClients() {
  const config = loadConfig();
  const db = openDb(config.VIBESCHEDULE_DB_PATH);
  const postForMe = new PostForMeClient({
    apiKey: config.POST_FOR_ME_API_KEY,
    baseUrl: config.POST_FOR_ME_BASE_URL,
  });
  const storage = new StorageClient(config);
  return { config, db, postForMe, storage };
}

function withPostForMeOnly() {
  const config = loadConfig();
  const db = openDb(config.VIBESCHEDULE_DB_PATH);
  const postForMe = new PostForMeClient({
    apiKey: config.POST_FOR_ME_API_KEY,
    baseUrl: config.POST_FOR_ME_BASE_URL,
  });
  return { config, db, postForMe };
}

program
  .command("doctor")
  .description("Check env, SQLite, R2 and Post4Me")
  .action(async function () {
    const json = globalJson(this);
    try {
      const config = loadPartialConfig();
      const db = openDb(config.VIBESCHEDULE_DB_PATH ?? ".vibeschedule.sqlite");
      const checks = await runDoctor(config, db);
      const ok = checks.every((check) => check.ok);
      printResult(json ? { ok, checks } : checks.map((c) => `${c.ok ? "ok" : "fail"} ${c.name}: ${c.message}`), json);
      process.exit(ok ? 0 : 1);
    } catch (error) {
      printError(error, json);
    }
  });

const accounts = program.command("accounts").description("Manage Post4Me account aliases");

accounts
  .command("sync")
  .description("Sync connected accounts from Post4Me")
  .option("--platform <platform>", "Platform", "tiktok")
  .option("--status <status>", "Provider status", "connected")
  .action(async function (options) {
    const json = globalJson(this);
    try {
      const { db, postForMe } = withPostForMeOnly();
      const rows = await syncAccounts(db, postForMe, { platform: options.platform, status: options.status });
      printResult(json ? { ok: true, accounts: rows } : rows.map((a) => `${a.alias}\t${a.platform}\t${a.username ?? ""}\t${a.post_for_me_account_id}\t${a.status ?? ""}`), json);
    } catch (error) {
      printError(error, json);
    }
  });

accounts
  .command("list")
  .description("List stored account aliases")
  .option("--platform <platform>", "Platform filter")
  .action(function (options) {
    const json = globalJson(this);
    try {
      const config = loadPartialConfig();
      const db = openDb(config.VIBESCHEDULE_DB_PATH ?? ".vibeschedule.sqlite");
      const rows = listStoredAccounts(db, options.platform);
      printResult(json ? { ok: true, accounts: rows } : rows.map((a) => `${a.alias}\t${a.platform}\t${a.username ?? ""}\t${a.status ?? ""}`), json);
    } catch (error) {
      printError(error, json);
    }
  });

accounts
  .command("rename")
  .argument("<old-alias>")
  .argument("<new-alias>")
  .description("Rename an account alias")
  .action(function (oldAlias, newAlias) {
    const json = globalJson(this);
    try {
      const config = loadPartialConfig();
      const db = openDb(config.VIBESCHEDULE_DB_PATH ?? ".vibeschedule.sqlite");
      const row = renameStoredAccount(db, oldAlias, newAlias);
      printResult(json ? { ok: true, account: row } : `Renamed ${oldAlias} -> ${row.alias}`, json);
    } catch (error) {
      printError(error, json);
    }
  });

const media = program.command("media").description("Manage uploaded media");

media
  .command("upload")
  .argument("<file>")
  .option("--prefix <prefix>", "R2 key prefix")
  .option("--force", "Re-upload even if SHA already exists")
  .description("Upload video to R2")
  .action(async function (file, options) {
    const json = globalJson(this);
    try {
      const { db, storage } = withRequiredClients();
      const row = await uploadMedia(db, storage, file, { prefix: options.prefix, force: options.force });
      printResult(json ? { ok: true, media: row } : `${row.reused ? "Reused" : "Uploaded"} ${row.public_url}`, json);
    } catch (error) {
      printError(error, json);
    }
  });

program
  .command("schedule")
  .description("Schedule one TikTok post")
  .option("--account <alias>", "Account alias; repeatable", collect, [])
  .option("--file <file>", "Local video file")
  .option("--media-url <url>", "Already public media URL")
  .option("--image <file>", "Local image file for native TikTok photo post; repeatable", collect, [])
  .option("--image-url <url>", "Already public image URL for native TikTok photo post; repeatable", collect, [])
  .option("--caption <text>", "Caption text")
  .option("--caption-file <file>", "Caption file")
  .option("--at <datetime>", "Scheduled local/ISO datetime")
  .option("--timezone <tz>", "Timezone")
  .option("--title <text>", "TikTok title")
  .addOption(new Option("--privacy <value>", "TikTok privacy").choices(["public", "private"]).default("public"))
  .option("--draft", "Create as draft")
  .option("--now", "Post immediately")
  .option("--auto-add-music", "Ask TikTok to auto-add music for photo posts")
  .option("--dry-run", "Print payload without uploading/posting")
  .option("--allow-past", "Allow past scheduled_at values")
  .action(async function (options) {
    const json = globalJson(this);
    try {
      const config = loadConfig();
      const db = openDb(config.VIBESCHEDULE_DB_PATH);
      const postForMe = new PostForMeClient({ apiKey: config.POST_FOR_ME_API_KEY, baseUrl: config.POST_FOR_ME_BASE_URL });
      const storage = new StorageClient(config);
      const result = await schedulePost(db, storage, postForMe, {
        accounts: options.account,
        file: options.file,
        mediaUrl: options.mediaUrl,
        imageFiles: options.image,
        imageUrls: options.imageUrl,
        caption: options.caption,
        captionFile: options.captionFile,
        at: options.at,
        timezone: options.timezone ?? config.VIBESCHEDULE_DEFAULT_TIMEZONE,
        title: options.title,
        privacy: options.privacy,
        draft: options.draft,
        now: options.now,
        dryRun: options.dryRun,
        allowPast: options.allowPast,
        autoAddMusic: options.autoAddMusic,
      });
      printResult(
        json
          ? { ok: true, post: result.row, payload: result.payload, media_url: result.mediaUrl, media_urls: result.mediaUrls }
          : options.dryRun
            ? JSON.stringify(result.payload, null, 2)
            : `Scheduled ${result.row?.external_id} (${result.row?.status})`,
        json,
      );
    } catch (error) {
      printError(error, json);
    }
  });

program
  .command("batch")
  .argument("<file>")
  .option("--dry-run", "Validate and print payloads without uploading/posting")
  .option("--continue-on-error", "Continue after failed items")
  .description("Schedule a YAML/JSON batch")
  .action(async function (file, options) {
    const json = globalJson(this);
    try {
      const config = loadConfig();
      const db = openDb(config.VIBESCHEDULE_DB_PATH);
      const postForMe = new PostForMeClient({ apiKey: config.POST_FOR_ME_API_KEY, baseUrl: config.POST_FOR_ME_BASE_URL });
      const storage = new StorageClient(config);
      const results = await runBatch(db, storage, postForMe, file, {
        dryRun: options.dryRun,
        continueOnError: options.continueOnError,
        defaultTimezone: config.VIBESCHEDULE_DEFAULT_TIMEZONE,
      });
      printResult(json ? { ok: true, results } : results.map((r) => `${r.ok ? "ok" : "fail"} item ${r.index + 1}`), json);
    } catch (error) {
      printError(error, json);
    }
  });

const posts = program.command("posts").description("Inspect and manage local/provider posts");

posts
  .command("list")
  .option("--status <status>", "Local status")
  .description("List local scheduled posts")
  .action(function (options) {
    const json = globalJson(this);
    try {
      const config = loadPartialConfig();
      const db = openDb(config.VIBESCHEDULE_DB_PATH ?? ".vibeschedule.sqlite");
      const rows = listLocalPosts(db, options.status);
      printResult(json ? { ok: true, posts: rows } : rows.map((p) => `${p.id}\t${p.status}\t${p.external_id}\t${p.scheduled_at ?? ""}`), json);
    } catch (error) {
      printError(error, json);
    }
  });

posts
  .command("status")
  .argument("<id-or-external-id>")
  .description("Show local and provider status")
  .action(async function (id) {
    const json = globalJson(this);
    try {
      const { db, postForMe } = withPostForMeOnly();
      const result = await getPostStatus(db, postForMe, id);
      printResult(json ? { ok: true, ...result } : result, json);
    } catch (error) {
      printError(error, json);
    }
  });

posts
  .command("refresh")
  .argument("<id-or-external-id>")
  .description("Refresh local status from Post4Me")
  .action(async function (id) {
    const json = globalJson(this);
    try {
      const { db, postForMe } = withPostForMeOnly();
      const result = await refreshPost(db, postForMe, id);
      printResult(json ? { ok: true, ...result } : `Refreshed ${result.local.external_id}: ${result.local.status}`, json);
    } catch (error) {
      printError(error, json);
    }
  });

posts
  .command("cancel")
  .argument("<id-or-external-id>")
  .option("--yes", "Confirm provider delete")
  .description("Cancel/delete a Post4Me post")
  .action(async function (id, options) {
    const json = globalJson(this);
    try {
      const { db, postForMe } = withPostForMeOnly();
      const result = await cancelPost(db, postForMe, id, options.yes);
      printResult(json ? { ok: true, ...result } : `Cancelled ${result.local.external_id}`, json);
    } catch (error) {
      printError(error, json);
    }
  });

function collect(value: string, previous: string[]): string[] {
  previous.push(value);
  return previous;
}

program.parseAsync().catch((error) => printError(error, Boolean(program.optsWithGlobals<{ json?: boolean }>().json)));

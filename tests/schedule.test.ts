import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { openDb, upsertAccount } from "../src/db.js";
import { PostForMeClient } from "../src/postforme.js";
import { schedulePost } from "../src/schedule.js";

describe("schedulePost", () => {
  it("builds a native TikTok photo post payload from multiple images", async () => {
    const db = openDb(":memory:");
    upsertAccount(db, {
      alias: "main",
      platform: "tiktok",
      post_for_me_account_id: "spc_123",
      username: "main",
      status: "connected",
      metadata_json: null,
    });
    const dir = mkdtempSync(join(tmpdir(), "vibeschedule-slides-"));
    const first = join(dir, "slide-01.png");
    const second = join(dir, "slide-02.png");
    writeFileSync(first, "first");
    writeFileSync(second, "second");

    const result = await schedulePost(db, undefined, {} as PostForMeClient, {
      accounts: ["main"],
      imageFiles: [first, second],
      caption: "test caption",
      timezone: "Europe/Berlin",
      privacy: "private",
      draft: true,
      dryRun: true,
      autoAddMusic: true,
    });

    expect(result.payload.media).toHaveLength(2);
    expect(result.payload.media?.map((item) => item.url)).toEqual(expect.arrayContaining([expect.stringMatching(/^dry-run:\/\//)]));
    expect(result.payload.platform_configurations).toEqual({
      tiktok: expect.objectContaining({
        is_draft: true,
        auto_add_music: true,
      }),
    });
  });

  it("rejects mixed video and image media", async () => {
    const db = openDb(":memory:");

    await expect(
      schedulePost(db, undefined, {} as PostForMeClient, {
        accounts: ["main"],
        file: "video.mp4",
        imageUrls: ["https://example.com/slide.png"],
        caption: "test caption",
        timezone: "Europe/Berlin",
        privacy: "public",
        draft: true,
        dryRun: true,
      }),
    ).rejects.toThrow(/cannot mix video and image/);
  });

  it("stores creative metadata when creating a provider post", async () => {
    const db = openDb(":memory:");
    upsertAccount(db, {
      alias: "main",
      platform: "tiktok",
      post_for_me_account_id: "spc_123",
      username: "main",
      status: "connected",
      metadata_json: null,
    });

    const client = {
      createSocialPost: async () => ({ id: "sp_123", status: "processed" }),
    } as PostForMeClient;

    const result = await schedulePost(db, undefined, client, {
      accounts: ["main"],
      imageUrls: ["https://example.com/slide-01.png", "https://example.com/slide-02.png"],
      caption: "test caption",
      timezone: "Europe/Berlin",
      privacy: "public",
      draft: true,
      hook: "I showed my landlord this",
      cta: "Search TestApp on the App Store",
      hookCategory: "person-conflict-ai",
      creativeDir: ".",
      source: "agent",
      tag: ["home", "test"],
      metadata: ["app=TestApp"],
    });

    expect(result.row).toEqual(
      expect.objectContaining({
        hook: "I showed my landlord this",
        cta: "Search TestApp on the App Store",
        hook_category: "person-conflict-ai",
        source: "agent",
        tags_json: JSON.stringify(["home", "test"]),
        metadata_json: JSON.stringify({ app: "TestApp" }),
      }),
    );
  });

  it("validates the marketing-6 slideshow preset", async () => {
    const db = openDb(":memory:");
    upsertAccount(db, {
      alias: "main",
      platform: "tiktok",
      post_for_me_account_id: "spc_123",
      username: "main",
      status: "connected",
      metadata_json: null,
    });
    const dir = mkdtempSync(join(tmpdir(), "vibeschedule-marketing-"));
    const slides = Array.from({ length: 6 }, (_, index) => {
      const file = join(dir, `slide-${index + 1}.png`);
      writeFileSync(file, pngHeader(1024, 1536));
      return file;
    });

    const result = await schedulePost(db, undefined, {} as PostForMeClient, {
      accounts: ["main"],
      imageFiles: slides,
      caption: "test caption",
      timezone: "Europe/Berlin",
      privacy: "public",
      draft: true,
      dryRun: true,
      slideshowPreset: "marketing-6",
    });

    expect(result.payload.media).toHaveLength(6);
  });

  it("rejects landscape images for the marketing-6 slideshow preset", async () => {
    const db = openDb(":memory:");
    upsertAccount(db, {
      alias: "main",
      platform: "tiktok",
      post_for_me_account_id: "spc_123",
      username: "main",
      status: "connected",
      metadata_json: null,
    });
    const dir = mkdtempSync(join(tmpdir(), "vibeschedule-marketing-"));
    const slides = Array.from({ length: 6 }, (_, index) => {
      const file = join(dir, `slide-${index + 1}.png`);
      writeFileSync(file, pngHeader(index === 0 ? 1536 : 1024, index === 0 ? 1024 : 1536));
      return file;
    });

    await expect(
      schedulePost(db, undefined, {} as PostForMeClient, {
        accounts: ["main"],
        imageFiles: slides,
        caption: "test caption",
        timezone: "Europe/Berlin",
        privacy: "public",
        draft: true,
        dryRun: true,
        slideshowPreset: "marketing-6",
      }),
    ).rejects.toThrow(/must be portrait/);
  });
});

function pngHeader(width: number, height: number): Buffer {
  const buffer = Buffer.alloc(24);
  buffer[0] = 0x89;
  buffer.write("PNG", 1, "ascii");
  buffer.writeUInt32BE(width, 16);
  buffer.writeUInt32BE(height, 20);
  return buffer;
}

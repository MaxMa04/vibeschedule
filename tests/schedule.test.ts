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
});

import { describe, expect, it } from "vitest";
import { listPostAnalytics, syncAnalytics } from "../src/analytics.js";
import { openDb, upsertAccount, insertScheduledPost } from "../src/db.js";
import { PostForMeClient } from "../src/postforme.js";

describe("analytics", () => {
  it("syncs feed metrics and matches them to local post metadata", async () => {
    const db = openDb(":memory:");
    upsertAccount(db, {
      alias: "main",
      platform: "tiktok",
      post_for_me_account_id: "spc_123",
      username: "main",
      status: "connected",
      metadata_json: null,
    });
    const post = insertScheduledPost(db, {
      external_id: "vibeschedule_123",
      post_for_me_post_id: "sp_123",
      caption: "I showed my landlord what AI thinks our kitchen should look like",
      title: "Kitchen reveal",
      hook: "I showed my landlord what AI thinks our kitchen should look like",
      cta: "Search TestApp on the App Store",
      hook_category: "person-conflict-ai",
      creative_dir: "/tmp/creative",
      source: "agent",
      tags_json: JSON.stringify(["home"]),
      metadata_json: JSON.stringify({ app: "TestApp" }),
      scheduled_at: null,
      timezone: "Europe/Berlin",
      status: "processed",
      media_asset_id: null,
      account_aliases_json: JSON.stringify(["main"]),
      post_for_me_response_json: null,
      last_error: null,
    });

    const client = {
      getSocialAccountFeed: async () => ({
        data: [
          {
            id: "tt_123",
            caption: "I showed my landlord what AI thinks our kitchen should look like",
            url: "https://www.tiktok.com/@main/video/123",
            published_at: "2026-05-02T10:00:00.000Z",
            metrics: {
              views: 42000,
              likes: 1200,
              comments: 44,
              shares: 90,
              saves: 12,
            },
          },
        ],
      }),
    } as PostForMeClient;

    const result = await syncAnalytics(db, client, { accounts: ["main"] });
    const rows = listPostAnalytics(db);

    expect(result.synced).toBe(1);
    expect(rows).toHaveLength(1);
    expect(rows[0].post?.id).toBe(post.id);
    expect(rows[0].snapshot).toEqual(
      expect.objectContaining({
        scheduled_post_id: post.id,
        views: 42000,
        likes: 1200,
        comments: 44,
        shares: 90,
        saves: 12,
      }),
    );
  });
});

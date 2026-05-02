import { describe, expect, it } from "vitest";
import { makeR2Key, sanitizeFilename } from "../src/storage.js";

describe("sanitizeFilename", () => {
  it("keeps filenames URL-safe", () => {
    expect(sanitizeFilename("My Cool TikTok!.mp4")).toBe("my-cool-tiktok-.mp4");
  });
});

describe("makeR2Key", () => {
  it("preserves extension and includes prefix, uuid, and sha without the original filename", () => {
    const key = makeR2Key(
      "/tmp/My Video.mp4",
      "tik tok",
      "abcdef1234567890fedcba",
      "550e8400-e29b-41d4-a716-446655440000",
    );
    expect(key).toMatch(
      /^tik-tok\/\d{4}\/\d{2}\/550e8400-e29b-41d4-a716-446655440000-abcdef1234567890\.mp4$/,
    );
    expect(key).not.toContain("my-video");
  });
});

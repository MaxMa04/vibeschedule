import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { validateImageFile, validateVideoFile } from "../src/media.js";

describe("media validation", () => {
  it("accepts supported images", () => {
    const dir = mkdtempSync(join(tmpdir(), "vibeschedule-media-"));
    const file = join(dir, "slide.png");
    writeFileSync(file, "not a real png, but enough for extension based MIME detection");

    expect(validateImageFile(file).mimeType).toBe("image/png");
  });

  it("rejects images when a video is required", () => {
    const dir = mkdtempSync(join(tmpdir(), "vibeschedule-media-"));
    const file = join(dir, "slide.png");
    writeFileSync(file, "not a real png");

    expect(() => validateVideoFile(file)).toThrow(/Expected video\/mp4 or video\/quicktime/);
  });
});

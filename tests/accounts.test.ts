import { describe, expect, it } from "vitest";
import { makeAccountAlias } from "../src/accounts.js";

describe("makeAccountAlias", () => {
  it("uses a sanitized username", () => {
    expect(makeAccountAlias("@BulkUp Main", "tiktok", "spc_123456")).toBe("bulkup-main");
  });

  it("falls back to platform and short id", () => {
    expect(makeAccountAlias("", "tiktok", "spc_abcdef123456")).toBe("tiktok_ef123456");
  });
});

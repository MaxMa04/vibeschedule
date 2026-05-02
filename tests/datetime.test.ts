import { describe, expect, it } from "vitest";
import { DateTime } from "luxon";
import { assertFuture, parseScheduledAt } from "../src/datetime.js";

describe("parseScheduledAt", () => {
  it("parses local date time in timezone and converts to UTC", () => {
    expect(parseScheduledAt("2026-05-02 10:00", "Europe/Berlin")).toBe("2026-05-02T08:00:00.000Z");
  });

  it("parses tomorrow shorthand", () => {
    const now = DateTime.fromISO("2026-05-01T12:00:00", { zone: "Europe/Berlin" });
    expect(parseScheduledAt("tomorrow 10:00", "Europe/Berlin", now)).toBe("2026-05-02T08:00:00.000Z");
  });
});

describe("assertFuture", () => {
  it("rejects past values unless allowed", () => {
    const now = DateTime.fromISO("2026-05-01T10:00:00Z");
    expect(() => assertFuture("2026-05-01T09:59:00.000Z", false, now)).toThrow(/future/);
    expect(() => assertFuture("2026-05-01T09:59:00.000Z", true, now)).not.toThrow();
  });
});

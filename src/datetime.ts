import { DateTime } from "luxon";
import { CliError } from "./errors.js";

export function parseScheduledAt(input: string, timezone: string, now: DateTime = DateTime.now()): string {
  const trimmed = input.trim();
  const zoneNow = now.setZone(timezone);
  const lower = trimmed.toLowerCase();

  const relativeMatch = /^(today|tomorrow)\s+(\d{1,2})(?::(\d{2}))?$/.exec(lower);
  if (relativeMatch) {
    const [, word, hourRaw, minuteRaw] = relativeMatch;
    const base = word === "tomorrow" ? zoneNow.plus({ days: 1 }) : zoneNow;
    const dt = base.set({
      hour: Number(hourRaw),
      minute: Number(minuteRaw ?? 0),
      second: 0,
      millisecond: 0,
    });
    return assertValid(dt, input).toUTC().toISO({ suppressMilliseconds: false })!;
  }

  const iso = DateTime.fromISO(trimmed, { zone: timezone });
  if (iso.isValid) return iso.toUTC().toISO({ suppressMilliseconds: false })!;

  const formats = [
    "yyyy-MM-dd HH:mm",
    "yyyy-MM-dd H:mm",
    "yyyy-MM-dd HH:mm:ss",
    "yyyy-MM-dd'T'HH:mm",
    "yyyy-MM-dd'T'HH:mm:ss",
  ];
  for (const format of formats) {
    const parsed = DateTime.fromFormat(trimmed, format, { zone: timezone });
    if (parsed.isValid) return parsed.toUTC().toISO({ suppressMilliseconds: false })!;
  }

  throw new CliError(`Could not parse scheduled time: ${input}`, "INVALID_DATETIME", 1);
}

export function assertFuture(iso: string, allowPast = false, now: DateTime = DateTime.now()): void {
  if (allowPast) return;
  const dt = DateTime.fromISO(iso);
  if (dt <= now) {
    throw new CliError(`Scheduled time must be in the future: ${iso}`, "SCHEDULED_TIME_IN_PAST", 1);
  }
}

function assertValid(dt: DateTime, original: string): DateTime {
  if (!dt.isValid) {
    throw new CliError(`Could not parse scheduled time: ${original}`, "INVALID_DATETIME", 1, dt.invalidExplanation);
  }
  return dt;
}

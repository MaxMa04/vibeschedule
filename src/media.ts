import { createHash } from "node:crypto";
import { createReadStream, statSync } from "node:fs";
import { resolve } from "node:path";
import { lookup } from "mime-types";
import { CliError } from "./errors.js";
import { Db, findMediaBySha, insertMediaAsset, MediaAssetRow } from "./db.js";
import { detectMimeType, StorageClient } from "./storage.js";

export type MediaKind = "video" | "image";

const SUPPORTED_VIDEO_MIME_TYPES = ["video/mp4", "video/quicktime"];
const SUPPORTED_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function sha256File(path: string): Promise<string> {
  const hash = createHash("sha256");
  await new Promise<void>((resolvePromise, reject) => {
    createReadStream(path)
      .on("data", (chunk) => hash.update(chunk))
      .on("error", reject)
      .on("end", () => resolvePromise());
  });
  return hash.digest("hex");
}

export function validateMediaFile(
  path: string,
  allowedKinds: MediaKind[],
): { mimeType: string; sizeBytes: number; absolutePath: string; kind: MediaKind } {
  const absolutePath = resolve(path);
  let stats;
  try {
    stats = statSync(absolutePath);
  } catch {
    throw new CliError(`File not found: ${path}`, "FILE_NOT_FOUND", 1);
  }
  if (!stats.isFile()) {
    throw new CliError(`Path is not a file: ${path}`, "INVALID_FILE", 1);
  }
  const mimeType = String(lookup(absolutePath) || detectMimeType(absolutePath));
  const kind = mediaKindForMimeType(mimeType);
  if (!kind || !allowedKinds.includes(kind)) {
    const expected = allowedKinds.map((allowedKind) => expectedMimeTypes(allowedKind)).join(" or ");
    throw new CliError(`Unsupported media MIME type: ${mimeType}. Expected ${expected}.`, "INVALID_MEDIA", 1);
  }
  return { mimeType, sizeBytes: stats.size, absolutePath, kind };
}

export function validateVideoFile(path: string): { mimeType: string; sizeBytes: number; absolutePath: string } {
  return validateMediaFile(path, ["video"]);
}

export function validateImageFile(path: string): { mimeType: string; sizeBytes: number; absolutePath: string } {
  return validateMediaFile(path, ["image"]);
}

export async function uploadMedia(
  db: Db,
  storage: StorageClient,
  file: string,
  options: { prefix?: string; force?: boolean } = {},
): Promise<MediaAssetRow & { reused: boolean }> {
  const validated = validateVideoFile(file);
  return uploadValidatedMedia(db, storage, validated, options);
}

export async function uploadImageMedia(
  db: Db,
  storage: StorageClient,
  file: string,
  options: { prefix?: string; force?: boolean } = {},
): Promise<MediaAssetRow & { reused: boolean }> {
  const validated = validateImageFile(file);
  return uploadValidatedMedia(db, storage, validated, options);
}

async function uploadValidatedMedia(
  db: Db,
  storage: StorageClient,
  validated: { mimeType: string; sizeBytes: number; absolutePath: string },
  options: { prefix?: string; force?: boolean },
): Promise<MediaAssetRow & { reused: boolean }> {
  const sha256 = await sha256File(validated.absolutePath);
  const existing = findMediaBySha(db, sha256);
  if (existing && !options.force) {
    return { ...existing, reused: true };
  }

  const upload = await storage.uploadFile(validated.absolutePath, {
    prefix: options.prefix,
    sha256,
    contentType: validated.mimeType,
  });
  const row = insertMediaAsset(db, {
    local_path: validated.absolutePath,
    r2_key: upload.key,
    public_url: upload.publicUrl,
    sha256,
    mime_type: validated.mimeType,
    size_bytes: validated.sizeBytes,
  });
  return { ...row, reused: false };
}

function mediaKindForMimeType(mimeType: string): MediaKind | undefined {
  if (SUPPORTED_VIDEO_MIME_TYPES.includes(mimeType)) return "video";
  if (SUPPORTED_IMAGE_MIME_TYPES.includes(mimeType)) return "image";
  return undefined;
}

function expectedMimeTypes(kind: MediaKind): string {
  return kind === "video" ? "video/mp4 or video/quicktime" : "image/jpeg, image/png, or image/webp";
}

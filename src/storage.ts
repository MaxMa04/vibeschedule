import { HeadObjectCommand, ListObjectsV2Command, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { randomUUID } from "node:crypto";
import { createReadStream, statSync } from "node:fs";
import { extname } from "node:path";
import { DateTime } from "luxon";
import { lookup } from "mime-types";
import { AppConfig } from "./config.js";

export interface UploadFileOptions {
  key?: string;
  contentType?: string;
  prefix?: string;
  sha256?: string;
}

export class StorageClient {
  private readonly client: S3Client;

  constructor(private readonly config: AppConfig) {
    this.client = new S3Client({
      region: "auto",
      endpoint: `https://${config.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.CLOUDFLARE_R2_ACCESS_KEY_ID,
        secretAccessKey: config.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
      },
    });
  }

  async uploadFile(path: string, options: UploadFileOptions = {}): Promise<{ key: string; publicUrl: string }> {
    const key = options.key ?? makeR2Key(path, options.prefix ?? this.config.VIBESCHEDULE_MEDIA_PREFIX, options.sha256);
    const contentType = options.contentType ?? detectMimeType(path);
    const size = statSync(path).size;

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.config.CLOUDFLARE_R2_BUCKET,
        Key: key,
        Body: createReadStream(path),
        ContentLength: size,
        ContentType: contentType,
      }),
    );

    return {
      key,
      publicUrl: `${this.config.CLOUDFLARE_R2_PUBLIC_BASE_URL}/${key}`,
    };
  }

  async headObject(key: string): Promise<boolean> {
    try {
      await this.client.send(
        new HeadObjectCommand({
          Bucket: this.config.CLOUDFLARE_R2_BUCKET,
          Key: key,
        }),
      );
      return true;
    } catch {
      return false;
    }
  }

  async bucketReachable(): Promise<boolean> {
    await this.client.send(
      new ListObjectsV2Command({
        Bucket: this.config.CLOUDFLARE_R2_BUCKET,
        MaxKeys: 1,
      }),
    );
    return true;
  }
}

export function makeR2Key(path: string, prefix: string, sha256?: string, objectId = randomUUID()): string {
  const now = DateTime.utc();
  const ext = extname(path).toLowerCase();
  const shortSha = (sha256 ?? "unknown").slice(0, 16);
  return `${sanitizePrefix(prefix)}/${now.toFormat("yyyy/MM")}/${objectId}-${shortSha}${ext}`;
}

export function sanitizeFilename(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120)
    .toLowerCase() || "video";
}

function sanitizePrefix(value: string): string {
  return value
    .split("/")
    .map(sanitizeFilename)
    .filter(Boolean)
    .join("/");
}

export function detectMimeType(path: string): string {
  const mime = lookup(path);
  if (mime) return mime;
  if (path.toLowerCase().endsWith(".mov")) return "video/quicktime";
  return "application/octet-stream";
}

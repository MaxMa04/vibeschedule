import { accessSync, constants } from "node:fs";
import { dirname } from "node:path";
import { Db } from "./db.js";
import { AppConfig, missingEnv, PartialAppConfig } from "./config.js";
import { PostForMeClient } from "./postforme.js";
import { StorageClient } from "./storage.js";

export interface DoctorCheck {
  name: string;
  ok: boolean;
  message: string;
}

export async function runDoctor(config: PartialAppConfig, db: Db): Promise<DoctorCheck[]> {
  const checks: DoctorCheck[] = [];
  const missing = missingEnv();
  checks.push({
    name: "env",
    ok: missing.length === 0,
    message: missing.length === 0 ? "All required environment variables are present" : `Missing: ${missing.join(", ")}`,
  });

  try {
    const dbPath = config.VIBESCHEDULE_DB_PATH ?? ".vibeschedule.sqlite";
    const parent = dirname(dbPath);
    if (parent && parent !== ".") accessSync(parent, constants.R_OK | constants.W_OK);
    db.prepare("SELECT 1").get();
    checks.push({ name: "sqlite", ok: true, message: `SQLite ready at ${dbPath}` });
  } catch (error) {
    checks.push({ name: "sqlite", ok: false, message: error instanceof Error ? error.message : String(error) });
  }

  if (config.POST_FOR_ME_API_KEY) {
    try {
      const client = new PostForMeClient({
        apiKey: config.POST_FOR_ME_API_KEY,
        baseUrl: config.POST_FOR_ME_BASE_URL,
      });
      await client.listSocialAccounts({ platform: "tiktok", status: "connected" });
      checks.push({ name: "postforme", ok: true, message: "Post4Me API reachable" });
    } catch (error) {
      checks.push({ name: "postforme", ok: false, message: error instanceof Error ? error.message : String(error) });
    }
  } else {
    checks.push({ name: "postforme", ok: false, message: "POST_FOR_ME_API_KEY is missing" });
  }

  if (
    config.CLOUDFLARE_ACCOUNT_ID &&
    config.CLOUDFLARE_R2_ACCESS_KEY_ID &&
    config.CLOUDFLARE_R2_SECRET_ACCESS_KEY &&
    config.CLOUDFLARE_R2_BUCKET &&
    config.CLOUDFLARE_R2_PUBLIC_BASE_URL
  ) {
    try {
      const storage = new StorageClient(config as AppConfig);
      await storage.bucketReachable();
      checks.push({ name: "r2", ok: true, message: "R2 credentials accepted" });
    } catch (error) {
      checks.push({ name: "r2", ok: false, message: error instanceof Error ? error.message : String(error) });
    }
  } else {
    checks.push({ name: "r2", ok: false, message: "Cloudflare R2 environment variables are incomplete" });
  }

  return checks;
}

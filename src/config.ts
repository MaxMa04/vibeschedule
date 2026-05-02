import "dotenv/config";
import { z } from "zod";
import { ConfigError } from "./errors.js";

const requiredEnvSchema = z.object({
  POST_FOR_ME_API_KEY: z.string().min(1),
  POST_FOR_ME_BASE_URL: z.string().url().default("https://api.postforme.dev/v1"),
  CLOUDFLARE_ACCOUNT_ID: z.string().min(1),
  CLOUDFLARE_R2_ACCESS_KEY_ID: z.string().min(1),
  CLOUDFLARE_R2_SECRET_ACCESS_KEY: z.string().min(1),
  CLOUDFLARE_R2_BUCKET: z.string().min(1),
  CLOUDFLARE_R2_PUBLIC_BASE_URL: z.string().url(),
  VIBESCHEDULE_DB_PATH: z.string().min(1).default(".vibeschedule.sqlite"),
  VIBESCHEDULE_DEFAULT_TIMEZONE: z.string().min(1).default("Europe/Berlin"),
  VIBESCHEDULE_MEDIA_PREFIX: z.string().min(1).default("tiktok"),
});

const partialEnvSchema = requiredEnvSchema.partial({
  POST_FOR_ME_API_KEY: true,
  CLOUDFLARE_ACCOUNT_ID: true,
  CLOUDFLARE_R2_ACCESS_KEY_ID: true,
  CLOUDFLARE_R2_SECRET_ACCESS_KEY: true,
  CLOUDFLARE_R2_BUCKET: true,
  CLOUDFLARE_R2_PUBLIC_BASE_URL: true,
});

export type AppConfig = z.infer<typeof requiredEnvSchema>;
export type PartialAppConfig = z.infer<typeof partialEnvSchema>;

export const REQUIRED_ENV_KEYS = [
  "POST_FOR_ME_API_KEY",
  "CLOUDFLARE_ACCOUNT_ID",
  "CLOUDFLARE_R2_ACCESS_KEY_ID",
  "CLOUDFLARE_R2_SECRET_ACCESS_KEY",
  "CLOUDFLARE_R2_BUCKET",
  "CLOUDFLARE_R2_PUBLIC_BASE_URL",
] as const;

export function loadConfig(): AppConfig {
  const result = requiredEnvSchema.safeParse(process.env);
  if (!result.success) {
    const missing = REQUIRED_ENV_KEYS.filter((key) => !process.env[key]);
    const message =
      missing.length > 0
        ? `Missing required environment variables: ${missing.join(", ")}`
        : "Invalid environment configuration";
    throw new ConfigError(message, result.error.flatten());
  }
  return normalizeConfig(result.data);
}

export function loadPartialConfig(): PartialAppConfig {
  return normalizeConfig(partialEnvSchema.parse(process.env));
}

function normalizeConfig<T extends PartialAppConfig>(config: T): T {
  const publicBase = config.CLOUDFLARE_R2_PUBLIC_BASE_URL;
  if (publicBase) {
    config.CLOUDFLARE_R2_PUBLIC_BASE_URL = publicBase.replace(/\/+$/, "");
  }
  return config;
}

export function missingEnv(): string[] {
  return REQUIRED_ENV_KEYS.filter((key) => !process.env[key]);
}

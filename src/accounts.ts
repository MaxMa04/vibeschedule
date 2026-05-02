import { CliError } from "./errors.js";
import { Db, listAccounts, renameAccount, upsertAccount } from "./db.js";
import { PostForMeClient, unwrapData } from "./postforme.js";
import { redactSensitiveFields } from "./redact.js";
import { sanitizeFilename } from "./storage.js";

interface SocialAccountLike {
  id?: string;
  platform?: string;
  username?: string;
  handle?: string;
  name?: string;
  status?: string;
  [key: string]: unknown;
}

export async function syncAccounts(
  db: Db,
  client: PostForMeClient,
  options: { platform: string; status?: string },
) {
  const response = await client.listSocialAccounts({ platform: options.platform, status: options.status ?? "connected" });
  const accounts = unwrapData(response) as SocialAccountLike[];
  return accounts.map((account) => {
    const id = account.id;
    if (!id) {
      throw new CliError("Post4Me social account response did not include id", "INVALID_PROVIDER_RESPONSE", 2, account);
    }
    const username = String(account.username ?? account.handle ?? account.name ?? "");
    const alias = makeAccountAlias(username, options.platform, id);
    return upsertAccount(db, {
      alias,
      platform: String(account.platform ?? options.platform),
      post_for_me_account_id: id,
      username: username || null,
      status: account.status ? String(account.status) : null,
      metadata_json: JSON.stringify(redactSensitiveFields(account)),
    });
  });
}

export function makeAccountAlias(username: string, platform: string, id: string): string {
  const stripped = username.replace(/^@/, "").trim();
  const safe = stripped ? sanitizeFilename(stripped) : "";
  if (safe) return safe;
  return `${platform}_${id.slice(-8)}`;
}

export function listStoredAccounts(db: Db, platform?: string) {
  return listAccounts(db, platform);
}

export function renameStoredAccount(db: Db, oldAlias: string, newAlias: string) {
  return renameAccount(db, oldAlias, sanitizeFilename(newAlias));
}

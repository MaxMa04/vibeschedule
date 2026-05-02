import { Db, getScheduledPost, listScheduledPosts, updateScheduledPostProviderState } from "./db.js";
import { CliError } from "./errors.js";
import { PostForMeClient } from "./postforme.js";
import { redactSensitiveFields } from "./redact.js";

export function listLocalPosts(db: Db, status?: string) {
  return listScheduledPosts(db, status);
}

export async function getPostStatus(db: Db, client: PostForMeClient, idOrExternalId: string) {
  const row = getScheduledPost(db, idOrExternalId);
  if (!row) throw new CliError(`Scheduled post not found: ${idOrExternalId}`, "POST_NOT_FOUND", 1);
  const provider = row.post_for_me_post_id ? redactSensitiveFields(await client.getSocialPost(row.post_for_me_post_id)) : null;
  return { local: row, provider };
}

export async function refreshPost(db: Db, client: PostForMeClient, idOrExternalId: string) {
  const row = getScheduledPost(db, idOrExternalId);
  if (!row) throw new CliError(`Scheduled post not found: ${idOrExternalId}`, "POST_NOT_FOUND", 1);
  if (!row.post_for_me_post_id) {
    throw new CliError(`Post has no Post4Me id: ${idOrExternalId}`, "MISSING_PROVIDER_ID", 1);
  }
  const providerRaw = await client.getSocialPost(row.post_for_me_post_id);
  const resultsRaw = await client.listPostResults({ post_id: row.post_for_me_post_id });
  const provider = redactSensitiveFields(providerRaw);
  const results = redactSensitiveFields(resultsRaw);
  const status = provider && typeof provider === "object" && typeof (provider as { status?: unknown }).status === "string"
    ? String((provider as { status: string }).status)
    : row.status;
  const updated = updateScheduledPostProviderState(db, row.id, { status, response: { provider, results } });
  return { local: updated, provider, results };
}

export async function cancelPost(db: Db, client: PostForMeClient, idOrExternalId: string, yes?: boolean) {
  if (!yes) throw new CliError("Cancel requires --yes", "CONFIRMATION_REQUIRED", 1);
  const row = getScheduledPost(db, idOrExternalId);
  if (!row) throw new CliError(`Scheduled post not found: ${idOrExternalId}`, "POST_NOT_FOUND", 1);
  if (!row.post_for_me_post_id) {
    throw new CliError(`Post has no Post4Me id: ${idOrExternalId}`, "MISSING_PROVIDER_ID", 1);
  }
  const provider = redactSensitiveFields(await client.deleteSocialPost(row.post_for_me_post_id));
  const updated = updateScheduledPostProviderState(db, row.id, { status: "cancelled", response: provider });
  return { local: updated, provider };
}

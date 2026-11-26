import { putObject } from '@vibeschedule/nestjs-libraries/upload/r2.uploader';
import { ssrfSafeFetch } from '@vibeschedule/nestjs-libraries/upload/ssrf.guard';

const MAX_AVATAR_SIZE = 2 * 1024 * 1024;
const AVATAR_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

// PfM hosts most profile photos itself; these hosts serve stable URLs.
export const isStableAvatar = (url: string) => {
  if (!URL.canParse(url)) {
    return false;
  }
  const host = new URL(url).hostname;
  const bucket = process.env.CLOUDFLARE_BUCKET_URL;
  return (
    host.endsWith('.supabase.co') ||
    (!!bucket && url.startsWith(bucket.replace(/\/+$/, '') + '/'))
  );
};

/**
 * Returns a URL for the profile photo that does not expire. Signed platform
 * CDN URLs (TikTok) expire after a few days, so they are copied to the bucket.
 * Returns null when the photo cannot be loaded.
 */
export async function stableAvatarUrl(
  accountId: string,
  url: string | null
): Promise<string | null> {
  if (!url) {
    return null;
  }
  if (isStableAvatar(url)) {
    return url;
  }
  try {
    const response = await ssrfSafeFetch(url);
    const mime = (response.headers.get('content-type') || '').split(';')[0];
    const ext = AVATAR_MIME[mime];
    if (!response.ok || !ext) {
      await response.body?.cancel();
      return null;
    }
    const body = Buffer.from(await response.arrayBuffer());
    if (body.length > MAX_AVATAR_SIZE) {
      return null;
    }
    const key = `avatars/${accountId.replace(/[^\w-]/g, '')}.${ext}`;
    return `${await putObject(key, body, mime)}?v=${Date.now()}`;
  } catch {
    return null;
  }
}

import { mirrorImage } from '@vibeschedule/nestjs-libraries/upload/image.mirror';

const MAX_AVATAR_SIZE = 2 * 1024 * 1024;

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
  return mirrorImage(
    `avatars/${accountId.replace(/[^\w-]/g, '')}`,
    url,
    MAX_AVATAR_SIZE
  );
}

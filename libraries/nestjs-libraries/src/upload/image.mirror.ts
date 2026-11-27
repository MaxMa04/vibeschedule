import { putObject } from '@vibeschedule/nestjs-libraries/upload/r2.uploader';
import { ssrfSafeFetch } from '@vibeschedule/nestjs-libraries/upload/ssrf.guard';

const IMAGE_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

/**
 * Copies an image to the bucket under `<key>.<ext>` and returns its public
 * URL. Signed platform CDN URLs (TikTok, Instagram) expire or refuse other
 * sites, the bucket copy does not. Null when it cannot be loaded.
 */
export async function mirrorImage(
  key: string,
  url: string,
  maxSize: number,
  signal?: AbortSignal
): Promise<string | null> {
  try {
    const response = await ssrfSafeFetch(url, { signal });
    const mime = (response.headers.get('content-type') || '').split(';')[0];
    const ext = IMAGE_MIME[mime];
    if (!response.ok || !ext) {
      await response.body?.cancel();
      return null;
    }
    const body = Buffer.from(await response.arrayBuffer());
    if (body.length > maxSize) {
      return null;
    }
    return `${await putObject(`${key}.${ext}`, body, mime)}?v=${Date.now()}`;
  } catch {
    return null;
  }
}

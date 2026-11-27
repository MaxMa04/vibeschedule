import { ssrfSafeFetch } from '@vibeschedule/nestjs-libraries/upload/ssrf.guard';
import { mirrorImage } from '@vibeschedule/nestjs-libraries/upload/image.mirror';
import {
  ogImage,
  previewSource,
} from '@vibeschedule/helpers/inspiration/link.preview';
import { InspirationLinkRef } from '@vibeschedule/helpers/inspiration/inspiration.link';

// TikTok and Instagram serve the og:image tags to link preview crawlers
// without a login wall
const CRAWLER_UA =
  'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)';
// the tags sit in <head>, the rest of the page is not needed
const MAX_HTML = 512 * 1024;
const MAX_IMAGE = 3 * 1024 * 1024;
const TIMEOUT_MS = 8000;

const readHead = async (pageUrl: string, signal: AbortSignal) => {
  const response = await ssrfSafeFetch(pageUrl, {
    headers: { 'User-Agent': CRAWLER_UA, 'Accept-Language': 'de,en' },
    signal,
  });
  if (!response.ok || !response.body) {
    await response.body?.cancel();
    return null;
  }
  const decoder = new TextDecoder();
  let html = '';
  for await (const chunk of response.body) {
    html += decoder.decode(chunk as Uint8Array, { stream: true });
    if (html.length > MAX_HTML || /<\/head>/i.test(html)) break;
  }
  await response.body.cancel().catch(() => undefined);
  return html;
};

/** the preview image of a video, copied to the bucket, or null */
export async function linkPreview(
  id: string,
  ref: Pick<InspirationLinkRef, 'platform' | 'key' | 'url'>
): Promise<string | null> {
  const signal = AbortSignal.timeout(TIMEOUT_MS);
  try {
    const source = previewSource(ref);
    const image =
      'image' in source
        ? source.image
        : ogImage((await readHead(source.page, signal)) || '', source.page);
    if (!image) return null;
    return await mirrorImage(
      `inspiration/${id.replace(/[^\w-]/g, '')}`,
      image,
      MAX_IMAGE,
      signal
    );
  } catch {
    return null;
  }
}

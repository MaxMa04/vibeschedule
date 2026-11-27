// Where the preview image of a saved video comes from: YouTube has fixed
// thumbnail URLs, TikTok and Instagram name theirs in the og:image tag that
// link previews (WhatsApp, iMessage) read.

import type { InspirationLinkRef } from './inspiration.link';

/** a direct image URL, or the page whose og:image is the preview */
export const previewSource = (
  ref: Pick<InspirationLinkRef, 'platform' | 'key' | 'url'>
): { image: string } | { page: string } => {
  const youtube = /^youtube:([\w-]+)$/.exec(ref.key);
  if (youtube) {
    return { image: `https://i.ytimg.com/vi/${youtube[1]}/hqdefault.jpg` };
  }
  return { page: ref.url };
};

const ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&quot;': '"',
  '&#39;': "'",
  '&#x27;': "'",
  '&lt;': '<',
  '&gt;': '>',
  '&#x2F;': '/',
  '&#47;': '/',
};

const attribute = (tag: string, name: string) =>
  new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, 'i').exec(tag);

/** the og:image (or twitter:image) URL of a page, absolute, or null */
export const ogImage = (html: string, pageUrl: string): string | null => {
  for (const wanted of ['og:image', 'og:image:url', 'twitter:image']) {
    for (const tag of html.match(/<meta\b[^>]*>/gi) || []) {
      const key = attribute(tag, 'property') || attribute(tag, 'name');
      if ((key?.[1] ?? key?.[2])?.toLowerCase() !== wanted) continue;
      const content = attribute(tag, 'content');
      const value = (content?.[1] ?? content?.[2] ?? '')
        .trim()
        .replace(/&(?:amp|quot|#39|#x27|lt|gt|#x2F|#47);/g, (e) => ENTITIES[e]);
      if (!value) continue;
      try {
        const url = new URL(value, pageUrl);
        if (url.protocol === 'https:' || url.protocol === 'http:') {
          return url.href;
        }
      } catch {
        /* not a URL, try the next tag */
      }
    }
  }
  return null;
};

// Reads a video link someone pastes into the Inspiration page: from a share
// sheet (often with text around it), a browser or a short link. Gives the
// cleaned URL and a key, so the same video is saved only once.

export type InspirationPlatform = 'tiktok' | 'instagram' | 'youtube' | 'other';

export interface InspirationLinkRef {
  url: string;
  platform: InspirationPlatform;
  /** the same video always gets the same key, e.g. `tiktok:7301…` */
  key: string;
  /** `@handle` when the URL names the account */
  author: string | null;
  /** share short link (vm.tiktok.com/…): the server follows its redirect */
  short: boolean;
}

const URL_IN_TEXT = /https?:\/\/[^\s<>"'`]+/i;
const BARE_DOMAIN =
  /(?:^|\s)((?:www\.|m\.|vm\.|vt\.)?(?:tiktok\.com|instagram\.com|instagr\.am|youtube\.com|youtu\.be)\/[^\s<>"'`]*)/i;
const TRAILING_PUNCTUATION = /[)\].,;:!?»“”]+$/;

const findUrl = (input: string): URL | null => {
  const text = input.trim();
  const bare = BARE_DOMAIN.exec(text)?.[1];
  const raw = URL_IN_TEXT.exec(text)?.[0] || (bare ? `https://${bare}` : '');
  if (!raw) return null;
  try {
    const url = new URL(raw.replace(TRAILING_PUNCTUATION, ''));
    if (!/^https?:$/.test(url.protocol) || !url.hostname.includes('.')) {
      return null;
    }
    return url;
  } catch {
    return null;
  }
};

const bareHost = (url: URL) =>
  url.hostname.toLowerCase().replace(/^(?:www\.|m\.)/, '');

const segments = (url: URL) => url.pathname.split('/').filter(Boolean);

const handle = (segment: string | undefined) =>
  segment?.startsWith('@') && segment.length > 1 ? segment : null;

const tiktok = (url: URL, host: string): InspirationLinkRef => {
  const parts = segments(url);
  if (host === 'vm.tiktok.com' || host === 'vt.tiktok.com' || parts[0] === 't') {
    const code = parts[0] === 't' ? parts[1] : parts[0];
    const base = host === 'tiktok.com' ? 'www.tiktok.com/t' : host;
    return {
      url: code ? `https://${base}/${code}/` : url.href,
      platform: 'tiktok',
      key: `tiktok:short:${code || url.pathname}`,
      author: null,
      short: true,
    };
  }
  const author = handle(parts[0]);
  const kind = parts[1];
  const id = parts[2];
  if (author && (kind === 'video' || kind === 'photo') && /^\d{6,25}$/.test(id || '')) {
    return {
      url: `https://www.tiktok.com/${author}/${kind}/${id}`,
      platform: 'tiktok',
      key: `tiktok:${id}`,
      author,
      short: false,
    };
  }
  return {
    url: `https://www.tiktok.com/${parts.join('/')}`,
    platform: 'tiktok',
    key: `tiktok:path:${parts.join('/').toLowerCase()}`,
    author,
    short: false,
  };
};

const instagram = (url: URL): InspirationLinkRef => {
  const parts = segments(url);
  // /reel/<code>, /p/<code>, also /<user>/reel/<code>
  const at = parts.findIndex((p) => ['reel', 'reels', 'p', 'tv'].includes(p));
  const code = at >= 0 ? parts[at + 1] : undefined;
  if (code && /^[\w-]{5,40}$/.test(code)) {
    const kind = parts[at] === 'p' ? 'p' : 'reel';
    return {
      url: `https://www.instagram.com/${kind}/${code}/`,
      platform: 'instagram',
      key: `instagram:${code}`,
      author: at === 1 ? `@${parts[0]}` : null,
      short: false,
    };
  }
  return {
    url: `https://www.instagram.com/${parts.join('/')}${parts.length ? '/' : ''}`,
    platform: 'instagram',
    key: `instagram:path:${parts.join('/').toLowerCase()}`,
    author: parts.length === 1 ? `@${parts[0]}` : null,
    short: false,
  };
};

const youtube = (url: URL, host: string): InspirationLinkRef | null => {
  const parts = segments(url);
  const shorts = parts[0] === 'shorts';
  const id =
    host === 'youtu.be'
      ? parts[0]
      : shorts
      ? parts[1]
      : url.searchParams.get('v') || undefined;
  if (!id || !/^[\w-]{6,20}$/.test(id)) return null;
  return {
    url: shorts
      ? `https://www.youtube.com/shorts/${id}`
      : `https://www.youtube.com/watch?v=${id}`,
    platform: 'youtube',
    key: `youtube:${id}`,
    author: null,
    short: false,
  };
};

const other = (url: URL): InspirationLinkRef => {
  url.hash = '';
  for (const name of [...url.searchParams.keys()]) {
    if (/^(?:utm_|fbclid$|gclid$|igsh$|si$)/i.test(name)) {
      url.searchParams.delete(name);
    }
  }
  const href = url.href;
  return {
    url: href,
    platform: 'other',
    key: `url:${href.replace(/^https?:\/\/(?:www\.)?/i, '').replace(/\/+$/, '').toLowerCase()}`,
    author: null,
    short: false,
  };
};

/** null when the text holds no link */
export const parseInspirationLink = (
  input: string
): InspirationLinkRef | null => {
  const url = findUrl(input);
  if (!url) return null;
  const host = bareHost(url);
  if (host === 'tiktok.com' || host.endsWith('.tiktok.com')) {
    return tiktok(url, host);
  }
  if (host === 'instagram.com' || host === 'instagr.am') {
    return instagram(url);
  }
  if (host === 'youtube.com' || host === 'youtu.be') {
    return youtube(url, host) || other(url);
  }
  return other(url);
};

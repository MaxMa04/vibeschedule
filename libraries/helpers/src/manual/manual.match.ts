// Links a post that somebody published by hand to the post the platform
// reports in the account feed. No imports: `node --test` runs this file as is.

export interface FeedCandidate {
  platform_post_id: string;
  posted_at?: string;
  caption?: string;
  platform_url?: string;
}

const HOUR = 60 * 60 * 1000;

// the id TikTok shows in a share link, /@name/video/<id> or /@name/photo/<id>
export const tiktokPostId = (url: string): string | undefined =>
  /tiktok\.com\/(?:@[^/?#]+\/)?(?:video|photo)\/(\d{6,25})/i.exec(url)?.[1];

// vm.tiktok.com/<code> and tiktok.com/t/<code> only redirect to the real link
export const isTikTokUrl = (url: string) => {
  try {
    const { protocol, hostname } = new URL(url);
    return (
      protocol === 'https:' &&
      (hostname === 'tiktok.com' || hostname.endsWith('.tiktok.com'))
    );
  } catch {
    return false;
  }
};

export const normalizeCaption = (caption: string) =>
  caption.toLowerCase().replace(/\s+/g, ' ').trim();

// TikTok may cut a caption or people add hashtags in the app, so a long
// common start counts. Nothing looser: accounts post series whose captions
// differ in a few words only.
const sameCaption = (a: string, b: string) => {
  if (!a || !b) {
    return false;
  }
  if (a === b) {
    return true;
  }
  const [short, long] = a.length < b.length ? [a, b] : [b, a];
  return short.length >= 20 && long.startsWith(short);
};

export const matchFeedPost = (
  post: { caption: string; postedAt: Date; createdAt: Date },
  feed: FeedCandidate[],
  // feed posts that already belong to another post
  taken: Set<string>
): FeedCandidate | undefined => {
  const marked = post.postedAt.getTime();
  const distance = (item: FeedCandidate) =>
    Math.abs(new Date(item.posted_at!).getTime() - marked);

  const candidates = feed.filter((item) => {
    if (!item.posted_at || taken.has(item.platform_post_id)) {
      return false;
    }
    const at = new Date(item.posted_at).getTime();
    return (
      at >= post.createdAt.getTime() &&
      at >= marked - 48 * HOUR &&
      at <= marked + 24 * HOUR
    );
  });

  const caption = normalizeCaption(post.caption);
  const byCaption = candidates
    .filter((item) => sameCaption(caption, normalizeCaption(item.caption || '')))
    .sort((a, b) => distance(a) - distance(b));
  // No caption match, no link: a post that merely went out around the same
  // time may be a different one, and a wrong link shows wrong numbers. The
  // person can paste the link instead.
  return byCaption[0];
};

// Finds a post of a channel's PfM feed by what a person pastes: the share
// link of the post, its platform id or the PfM post id.

export interface FeedPostLike {
  platform_post_id?: string | null;
  social_post_id?: string | null;
  platform_url?: string | null;
}

const PATTERNS = [
  // tiktok.com/@name/video/<id>, /photo/<id>
  /tiktok\.com\/(?:@[^/?#]+\/)?(?:video|photo)\/(\d{6,25})/i,
  // youtube.com/shorts/<id>, youtu.be/<id>, youtube.com/watch?v=<id>
  /youtube\.com\/shorts\/([\w-]{6,20})/i,
  /youtu\.be\/([\w-]{6,20})/i,
  /youtube\.com\/watch\?(?:[^#]*&)?v=([\w-]{6,20})/i,
  // instagram.com/reel/<code>, /p/<code>
  /instagram\.com\/(?:[^/]+\/)?(?:reel|reels|p)\/([\w-]{5,40})/i,
];

/** the platform id inside a share link, or the trimmed input itself */
export const feedPostKey = (ref: string): string => {
  const value = ref.trim();
  for (const pattern of PATTERNS) {
    const hit = pattern.exec(value);
    if (hit) return hit[1];
  }
  return value;
};

const sameUrl = (a: string, b: string) =>
  a.replace(/[?#].*$/, '').replace(/\/+$/, '').toLowerCase() ===
  b.replace(/[?#].*$/, '').replace(/\/+$/, '').toLowerCase();

export const findFeedPost = <T extends FeedPostLike>(
  feed: T[],
  ref: string
): T | undefined => {
  const value = ref.trim();
  if (!value) return undefined;
  const key = feedPostKey(value);
  return (
    feed.find((p) => p.platform_post_id && p.platform_post_id === key) ||
    feed.find((p) => p.social_post_id && p.social_post_id === value) ||
    feed.find((p) => p.platform_url && sameUrl(p.platform_url, value)) ||
    // Instagram feeds may report the numeric media id; the share code then
    // only sits in the URL
    feed.find(
      (p) =>
        key !== value &&
        p.platform_url &&
        feedPostKey(p.platform_url) === key
    )
  );
};

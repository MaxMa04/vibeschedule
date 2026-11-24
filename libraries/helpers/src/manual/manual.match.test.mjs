import test from 'node:test';
import assert from 'node:assert/strict';
import { isTikTokUrl, matchFeedPost, tiktokPostId } from './manual.match.ts';

const at = (iso) => new Date(iso);
const post = (overrides = {}) => ({
  caption: 'Nie wieder Lauch: 8 Sätze, die du im Gym nicht mehr hören willst',
  postedAt: at('2026-11-23T18:10:00Z'),
  createdAt: at('2026-11-20T09:00:00Z'),
  ...overrides,
});
const feedItem = (id, postedAt, caption = '') => ({
  platform_post_id: id,
  posted_at: postedAt,
  caption,
});

test('reads the post id from video, photo and tracking links', () => {
  assert.equal(
    tiktokPostId('https://www.tiktok.com/@jona.bulks/video/7711384504350280992'),
    '7711384504350280992'
  );
  assert.equal(
    tiktokPostId(
      'https://www.tiktok.com/@jona.bulks/photo/7711384504350280992?utm_source=x&is_from_webapp=1'
    ),
    '7711384504350280992'
  );
  assert.equal(tiktokPostId('https://vm.tiktok.com/ZNabc123/'), undefined);
  assert.equal(tiktokPostId('https://example.com/video/7711384504350280992'), undefined);
});

test('accepts only https links on tiktok.com', () => {
  assert.equal(isTikTokUrl('https://vm.tiktok.com/ZNabc123/'), true);
  assert.equal(isTikTokUrl('https://www.tiktok.com/t/ZNabc123/'), true);
  assert.equal(isTikTokUrl('http://www.tiktok.com/t/ZNabc123/'), false);
  assert.equal(isTikTokUrl('https://tiktok.com.evil.example/x'), false);
  assert.equal(isTikTokUrl('nope'), false);
});

test('matches by caption, also with hashtags added in the app', () => {
  const hit = matchFeedPost(
    post(),
    [
      feedItem('1', '2026-11-23T18:02:00Z', 'Etwas ganz anderes'),
      feedItem(
        '2',
        '2026-11-23T17:55:00Z',
        'Nie wieder Lauch: 8 Sätze,  die du im Gym nicht mehr hören willst #gym #fyp'
      ),
    ],
    new Set()
  );
  assert.equal(hit?.platform_post_id, '2');
});

test('skips feed posts that belong to another post or are older than the post', () => {
  const caption = post().caption;
  assert.equal(
    matchFeedPost(
      post(),
      [feedItem('1', '2026-11-23T18:00:00Z', caption)],
      new Set(['1'])
    ),
    undefined
  );
  assert.equal(
    matchFeedPost(
      post({ createdAt: at('2026-11-23T12:00:00Z') }),
      [feedItem('1', '2026-11-23T08:00:00Z', caption)],
      new Set()
    ),
    undefined
  );
});

test('takes the repost closest to the marking when the caption is used twice', () => {
  const caption = post().caption;
  const hit = matchFeedPost(
    post(),
    [
      feedItem('old', '2026-11-22T09:00:00Z', caption),
      feedItem('new', '2026-11-23T18:05:00Z', caption),
    ],
    new Set()
  );
  assert.equal(hit?.platform_post_id, 'new');
});

test('keeps the posts of a series apart', () => {
  const series = (food) =>
    `Vegan für Anfänger: was du statt ${food} essen kannst #vegan #veganfüranfänger #rezepte`;
  assert.equal(
    matchFeedPost(
      post({ caption: series('Käse') }),
      [feedItem('1', '2026-11-23T18:00:00Z', series('Gummibärchen'))],
      new Set()
    ),
    undefined
  );
});

test('never links by time alone', () => {
  assert.equal(
    matchFeedPost(
      post(),
      [feedItem('1', '2026-11-23T18:05:00Z', 'Ein ganz anderer Post vom selben Tag')],
      new Set()
    ),
    undefined
  );
  assert.equal(
    matchFeedPost(
      post(),
      [
        feedItem(
          '1',
          '2026-11-23T18:05:00Z',
          'Nie wieder Lauch: 8 Rezepte, die du nach dem Gym kochen willst'
        ),
      ],
      new Set()
    ),
    undefined
  );
});

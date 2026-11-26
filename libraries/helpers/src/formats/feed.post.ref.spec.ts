import { test } from 'node:test';
import assert from 'node:assert/strict';
import { feedPostKey, findFeedPost } from './feed.post.ref';

test('feedPostKey reads the id from share links', () => {
  assert.equal(
    feedPostKey(
      'https://www.tiktok.com/@leon.gains/video/7712451143204408615?utm_campaign=tt4d_open_api'
    ),
    '7712451143204408615'
  );
  assert.equal(
    feedPostKey('https://www.tiktok.com/@bulk108/photo/7691281072277032225'),
    '7691281072277032225'
  );
  assert.equal(feedPostKey('https://youtube.com/shorts/0mxtaxGFswA?si=x'), '0mxtaxGFswA');
  assert.equal(feedPostKey('https://www.youtube.com/watch?v=jxIljzBlMTo&t=3'), 'jxIljzBlMTo');
  assert.equal(feedPostKey('https://youtu.be/jxIljzBlMTo'), 'jxIljzBlMTo');
  assert.equal(feedPostKey('https://www.instagram.com/reel/DAbc_12-x/'), 'DAbc_12-x');
  assert.equal(feedPostKey(' 7712451143204408615 '), '7712451143204408615');
});

const feed = [
  {
    platform_post_id: '7712451143204408615',
    social_post_id: 'sp_1',
    platform_url: 'https://www.tiktok.com/@leon.gains/video/7712451143204408615',
  },
  {
    platform_post_id: '3412',
    social_post_id: 'sp_2',
    platform_url: 'https://www.instagram.com/reel/DAbc_12-x/',
  },
];

test('findFeedPost matches link, platform id, PfM id and Instagram code', () => {
  assert.equal(
    findFeedPost(feed, 'https://www.tiktok.com/@leon.gains/video/7712451143204408615?lang=de'),
    feed[0]
  );
  assert.equal(findFeedPost(feed, '7712451143204408615'), feed[0]);
  assert.equal(findFeedPost(feed, 'sp_2'), feed[1]);
  assert.equal(findFeedPost(feed, 'https://instagram.com/reel/DAbc_12-x'), feed[1]);
});

test('findFeedPost finds nothing for other posts or empty input', () => {
  assert.equal(findFeedPost(feed, 'https://www.tiktok.com/@x/video/1111111111'), undefined);
  assert.equal(findFeedPost(feed, '   '), undefined);
});

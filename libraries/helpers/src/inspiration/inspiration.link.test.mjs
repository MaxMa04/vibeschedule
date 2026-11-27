import test from 'node:test';
import assert from 'node:assert/strict';
import { parseInspirationLink } from './inspiration.link.ts';

test('a TikTok video link loses its tracking params and keeps the handle', () => {
  const ref = parseInspirationLink(
    'https://www.tiktok.com/@vibe.app/video/7301234567890123456?is_from_webapp=1&sender_device=pc'
  );
  assert.deepEqual(ref, {
    url: 'https://www.tiktok.com/@vibe.app/video/7301234567890123456',
    platform: 'tiktok',
    key: 'tiktok:7301234567890123456',
    author: '@vibe.app',
    short: false,
  });
});

test('finds the link inside shared text', () => {
  const ref = parseInspirationLink(
    'Schau dir dieses Video an! https://vm.tiktok.com/ZNdAbC123/ #fyp'
  );
  assert.equal(ref.url, 'https://vm.tiktok.com/ZNdAbC123/');
  assert.equal(ref.short, true);
  assert.equal(ref.key, 'tiktok:short:ZNdAbC123');
});

test('tiktok.com/t/ is a short link too', () => {
  const ref = parseInspirationLink('https://www.tiktok.com/t/ZT8abcd/');
  assert.equal(ref.short, true);
  assert.equal(ref.url, 'https://www.tiktok.com/t/ZT8abcd/');
});

test('the same Instagram reel gets one key, with or without the share params', () => {
  const a = parseInspirationLink(
    'https://www.instagram.com/reel/C9xYz_AbCd1/?igsh=MWZ0b2V4'
  );
  const b = parseInspirationLink('instagram.com/reels/C9xYz_AbCd1');
  assert.equal(a.url, 'https://www.instagram.com/reel/C9xYz_AbCd1/');
  assert.equal(a.key, 'instagram:C9xYz_AbCd1');
  assert.equal(b.key, a.key);
  assert.equal(b.url, a.url);
});

test('an Instagram post link names its user when the URL has it', () => {
  const ref = parseInspirationLink('https://instagram.com/somebody/p/Cabc123xyz/');
  assert.equal(ref.url, 'https://www.instagram.com/p/Cabc123xyz/');
  assert.equal(ref.author, '@somebody');
});

test('YouTube shorts and youtu.be share one key per video', () => {
  const a = parseInspirationLink('https://youtube.com/shorts/dQw4w9WgXcQ?si=abc');
  const b = parseInspirationLink('https://youtu.be/dQw4w9WgXcQ');
  assert.equal(a.url, 'https://www.youtube.com/shorts/dQw4w9WgXcQ');
  assert.equal(a.key, 'youtube:dQw4w9WgXcQ');
  assert.equal(b.key, a.key);
});

test('other links are kept without tracking params', () => {
  const ref = parseInspirationLink('https://example.com/video/1?utm_source=x&id=2#top');
  assert.equal(ref.platform, 'other');
  assert.equal(ref.url, 'https://example.com/video/1?id=2');
  assert.equal(ref.key, 'url:example.com/video/1?id=2');
});

test('text without a link is no link', () => {
  assert.equal(parseInspirationLink('kein link hier'), null);
  assert.equal(parseInspirationLink(''), null);
  assert.equal(parseInspirationLink('ftp://example.com/a'), null);
});

test('drops punctuation that follows the link in a sentence', () => {
  const ref = parseInspirationLink('(siehe https://www.tiktok.com/@a/video/7301234567890123456).');
  assert.equal(ref.key, 'tiktok:7301234567890123456');
});

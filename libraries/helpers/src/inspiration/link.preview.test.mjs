import test from 'node:test';
import assert from 'node:assert/strict';
import { ogImage, previewSource } from './link.preview.ts';

test('YouTube uses the fixed thumbnail, everything else the page', () => {
  assert.deepEqual(
    previewSource({ platform: 'youtube', key: 'youtube:dQw4w9WgXcQ', url: 'x' }),
    { image: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg' }
  );
  assert.deepEqual(
    previewSource({
      platform: 'tiktok',
      key: 'tiktok:1',
      url: 'https://www.tiktok.com/@a/video/1',
    }),
    { page: 'https://www.tiktok.com/@a/video/1' }
  );
});

test('reads og:image and decodes the entities of signed CDN URLs', () => {
  const html =
    '<head><meta property="og:title" content="x"/>' +
    '<meta property="og:image" content="https://scontent.cdninstagram.com/v/a.jpg?stp=x&amp;_nc_cat=1&amp;oe=6A" />';
  assert.equal(
    ogImage(html, 'https://www.instagram.com/reel/abc/'),
    'https://scontent.cdninstagram.com/v/a.jpg?stp=x&_nc_cat=1&oe=6A'
  );
});

test('content may come first, quotes may be single, URLs relative', () => {
  assert.equal(
    ogImage("<meta content='/img/c.png' name='twitter:image'>", 'https://example.com/v/1'),
    'https://example.com/img/c.png'
  );
});

test('og:image wins over twitter:image, no tag gives null', () => {
  const html =
    '<meta name="twitter:image" content="https://a.com/t.jpg"><meta property="og:image" content="https://a.com/o.jpg">';
  assert.equal(ogImage(html, 'https://a.com'), 'https://a.com/o.jpg');
  assert.equal(ogImage('<meta property="og:title" content="x">', 'https://a.com'), null);
  assert.equal(ogImage('<meta property="og:image" content="javascript:alert(1)">', 'https://a.com'), null);
});

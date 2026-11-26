import { test } from 'node:test';
import assert from 'node:assert/strict';
import dayjs from 'dayjs';
import {
  analyticsRange,
  dailySeries,
  mapLimit,
  metricDefs,
  metricValues,
  periodChange,
  periodTotals,
  postDay,
} from './analytics.compute';

const tiktok = [
  { path: 'view_count', label: 'Aufrufe' },
  { path: 'like_count', label: 'Likes' },
  { path: 'comment_count', label: 'Kommentare' },
];

test('range: Berlin calendar days, previous period of equal length', () => {
  // 23:30 UTC on Nov 25 is already Nov 26 in Berlin
  const r = analyticsRange(7, dayjs('2026-11-25T23:30:00Z'));
  assert.equal(r.to, '2026-11-26');
  assert.equal(r.from, '2026-11-20');
  assert.equal(r.prevTo, '2026-11-19');
  assert.equal(r.prevFrom, '2026-11-13');
  assert.equal(r.dates.length, 7);
  assert.equal(r.since.toISOString(), '2026-11-12T23:00:00.000Z');
});

test('range across the DST switch keeps whole days', () => {
  const r = analyticsRange(7, dayjs('2026-10-28T12:00:00Z'));
  assert.deepEqual(r.dates, [
    '2026-10-22', '2026-10-23', '2026-10-24', '2026-10-25',
    '2026-10-26', '2026-10-27', '2026-10-28',
  ]);
});

test('post day is the Berlin date', () => {
  assert.equal(postDay({ posted_at: '2026-11-25T23:30:00Z' }), '2026-11-26');
});

test('metrics: views are primary, nested paths get flat keys', () => {
  const { defs, primary } = metricDefs(
    [
      { path: 'public_metrics.like_count', label: 'Likes' },
      { path: 'public_metrics.impression_count', label: 'Impressionen' },
    ],
    [{ metrics: { public_metrics: { like_count: 2, impression_count: 10 } } }]
  );
  assert.equal(primary, 'public_metrics_impression_count');
  assert.deepEqual(metricValues(
    { metrics: { public_metrics: { like_count: 2, impression_count: 10 } } },
    defs
  ), { public_metrics_like_count: 2, public_metrics_impression_count: 10 });
});

test('totals, engagement, change and series', () => {
  const { defs, primary } = metricDefs(tiktok, [
    { metrics: { view_count: 1, like_count: 1 } },
  ]);
  assert.deepEqual(defs.map((d) => d.key), ['view_count', 'like_count']);
  const rows = [
    { date: '2026-11-25', values: { view_count: 100, like_count: 10 } },
    { date: '2026-11-25', values: { view_count: 300, like_count: 30 } },
  ];
  const cur = periodTotals(rows.map((r) => r.values), defs, primary, 'a', 'b');
  assert.equal(cur.posts, 2);
  assert.equal(cur.metrics.view_count, 400);
  assert.equal(cur.avgPerPost, 200);
  assert.equal(cur.engagementRate, 0.1);
  const prev = periodTotals([{ view_count: 200, like_count: 0 }], defs, primary, 'c', 'd');
  const change = periodChange(cur, prev);
  assert.equal(change.view_count, 100);
  assert.equal(change.like_count, null);
  assert.equal(change.posts, 100);
  const series = dailySeries(['2026-11-24', '2026-11-25'], rows, defs);
  assert.deepEqual(series[0], { date: '2026-11-24', posts: 0, view_count: 0, like_count: 0 });
  assert.equal(series[1].view_count, 400);
});

test('mapLimit keeps order and the limit', async () => {
  let running = 0;
  let max = 0;
  const out = await mapLimit([5, 1, 3, 2], 2, async (n) => {
    running++;
    max = Math.max(max, running);
    await new Promise((r) => setTimeout(r, n));
    running--;
    return n * 2;
  });
  assert.deepEqual(out, [10, 2, 6, 4]);
  assert.equal(max, 2);
});

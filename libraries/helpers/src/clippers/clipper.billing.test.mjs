import test from 'node:test';
import assert from 'node:assert/strict';
import {
  billingDay,
  billingMonth,
  clipperBilling,
  isBillingMonth,
} from './clipper.billing.ts';

const days = (month, from, to, skip = []) =>
  Array.from({ length: to - from + 1 }, (_, i) => from + i)
    .filter((d) => !skip.includes(d))
    .map((d) => `${month}-${String(d).padStart(2, '0')}`);

const base = {
  month: '2026-11',
  today: '2026-12-05',
  monthlyFeeCents: 3000,
  postsPerDay: 1,
  ended: false,
};

test('a full month with a post every day pays the whole fee', () => {
  const bill = clipperBilling({
    ...base,
    postedDays: [...days('2026-10', 20, 31), ...days('2026-11', 1, 30)],
  });
  assert.equal(bill.activeDays, 30);
  assert.equal(bill.missed, 0);
  assert.equal(bill.amountCents, 3000);
  assert.equal(bill.running, false);
});

test('five missed days are free, every further one costs 1 euro', () => {
  const five = clipperBilling({
    ...base,
    postedDays: [...days('2026-10', 31, 31), ...days('2026-11', 1, 30, [3, 4, 5, 6, 7])],
  });
  assert.equal(five.missed, 5);
  assert.equal(five.amountCents, 3000);

  const eight = clipperBilling({
    ...base,
    postedDays: [...days('2026-10', 31, 31), ...days('2026-11', 1, 30, [3, 4, 5, 6, 7, 8, 9, 10])],
  });
  assert.equal(eight.missed, 8);
  assert.equal(eight.charged, 3);
  assert.equal(eight.amountCents, 2700);
});

test('the fee starts with the first post on the account', () => {
  const bill = clipperBilling({ ...base, postedDays: days('2026-11', 16, 30) });
  assert.equal(bill.activeDays, 15);
  assert.equal(bill.missed, 0);
  assert.equal(bill.amountCents, 1500);
});

test('an account without any post costs nothing', () => {
  const bill = clipperBilling({ ...base, postedDays: [] });
  assert.equal(bill.amountCents, 0);
  assert.equal(bill.activeDays, 0);
});

test('a lost account is paid up to its last post', () => {
  const bill = clipperBilling({
    ...base,
    ended: true,
    postedDays: [...days('2026-10', 25, 31), ...days('2026-11', 1, 10)],
  });
  assert.equal(bill.activeDays, 10);
  assert.equal(bill.missed, 0);
  assert.equal(bill.amountCents, 1000);
});

test('in a running month only past days can be missed', () => {
  const bill = clipperBilling({
    ...base,
    today: '2026-11-10',
    postedDays: [...days('2026-10', 30, 31), ...days('2026-11', 1, 8)],
  });
  // the 9th is missed, the 10th is still open
  assert.equal(bill.due, 9);
  assert.equal(bill.missed, 1);
  assert.equal(bill.running, true);
  assert.equal(bill.amountCents, 3000);
});

test('more posts per day count every missing post', () => {
  const bill = clipperBilling({
    ...base,
    monthlyFeeCents: 6000,
    postsPerDay: 2,
    postedDays: [...days('2026-10', 31, 31), ...days('2026-11', 1, 30), ...days('2026-11', 1, 20)],
  });
  assert.equal(bill.posted, 50);
  assert.equal(bill.missed, 10);
  assert.equal(bill.charged, 5);
  assert.equal(bill.amountCents, 5500);
});

test('the penalty never makes the amount negative', () => {
  const bill = clipperBilling({
    ...base,
    monthlyFeeCents: 300,
    postedDays: ['2026-10-01', '2026-11-30'],
  });
  assert.equal(bill.amountCents, 0);
});

test('days and months are counted in Berlin time', () => {
  assert.equal(billingDay('2026-11-30T23:30:00Z'), '2026-12-01');
  assert.equal(billingMonth('2026-11-30T22:59:00Z'), '2026-11');
  assert.equal(isBillingMonth('2026-11'), true);
  assert.equal(isBillingMonth('2026-13'), false);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addDays,
  normalizeUsername,
  planAccounts,
  profileCheck,
  WARMUP_DAYS,
} from './clipper.onboarding.ts';

const account = (over = {}) => ({
  id: 'a',
  profileReady: true,
  createdDay: null,
  warmupDays: [],
  fypOk: false,
  connection: 'none',
  ...over,
});

const states = (plan) =>
  Object.fromEntries(plan.tasks.map((t) => [t.key, t.state]));

test('the warm-up takes three days', () => {
  assert.equal(WARMUP_DAYS, 3);
  assert.equal(addDays('2026-11-30', 2), '2026-12-02');
});

test('no profile from us yet: nothing to do', () => {
  const [plan] = planAccounts([account({ profileReady: false })], '2026-11-26');
  assert.equal(plan.stage, 'profile');
  assert.equal(plan.tasks[0].lock, 'profile');
});

test('creating opens the first warm-up on the same day, the next ones a day later each', () => {
  const today = '2026-11-26';
  let [plan] = planAccounts([account({ createdDay: today })], today);
  assert.equal(plan.stage, 'warmup');
  assert.equal(states(plan).warmup_1, 'open');
  assert.equal(states(plan).warmup_2, 'locked');

  [plan] = planAccounts(
    [account({ createdDay: today, warmupDays: [today] })],
    today
  );
  assert.deepEqual(plan.tasks[2], {
    key: 'warmup_2',
    state: 'locked',
    lock: 'day',
    from: '2026-11-27',
  });

  [plan] = planAccounts(
    [account({ createdDay: today, warmupDays: [today] })],
    '2026-11-27'
  );
  assert.equal(states(plan).warmup_2, 'open');
});

test('a missed day only shifts the warm-up', () => {
  const [plan] = planAccounts(
    [account({ createdDay: '2026-11-20', warmupDays: ['2026-11-20'] })],
    '2026-11-26'
  );
  assert.equal(states(plan).warmup_2, 'open');
  assert.equal(plan.warmups, 1);
});

test('after three warm-ups: check the For You page, connect the day after', () => {
  const days = ['2026-11-24', '2026-11-25', '2026-11-26'];
  let [plan] = planAccounts(
    [account({ createdDay: days[0], warmupDays: days })],
    '2026-11-26'
  );
  assert.equal(plan.stage, 'fyp');
  assert.equal(states(plan).connect, 'locked');

  [plan] = planAccounts(
    [account({ createdDay: days[0], warmupDays: days, fypOk: true })],
    '2026-11-26'
  );
  assert.equal(plan.stage, 'connect');
  assert.equal(plan.tasks.find((t) => t.key === 'connect').from, '2026-11-27');

  [plan] = planAccounts(
    [account({ createdDay: days[0], warmupDays: days, fypOk: true })],
    '2026-11-27'
  );
  assert.equal(states(plan).connect, 'open');
});

test('at most one new account per day, in order', () => {
  const today = '2026-11-26';
  let plans = planAccounts([account({ id: 'a' }), account({ id: 'b' })], today);
  assert.equal(plans[0].stage, 'create');
  assert.equal(plans[1].tasks[0].lock, 'previous');

  plans = planAccounts(
    [account({ id: 'a', createdDay: today }), account({ id: 'b' })],
    today
  );
  assert.equal(plans[1].stage, 'waiting');
  assert.equal(plans[1].tasks[0].from, '2026-11-27');

  plans = planAccounts(
    [account({ id: 'a', createdDay: today }), account({ id: 'b' })],
    '2026-11-27'
  );
  assert.equal(plans[1].stage, 'create');
});

test('a connected account is done, also one from before the onboarding', () => {
  const plans = planAccounts(
    [account({ id: 'a', connection: 'active' }), account({ id: 'b' })],
    '2026-11-26'
  );
  assert.equal(plans[0].stage, 'active');
  assert.equal(plans[1].stage, 'create');
});

test('a disconnected account only needs to be connected again', () => {
  const [plan] = planAccounts(
    [account({ connection: 'disconnected' })],
    '2026-11-26'
  );
  assert.equal(plan.stage, 'reconnect');
  assert.equal(states(plan).connect, 'open');
});

test('usernames compare without @ and case', () => {
  assert.equal(normalizeUsername(' @Gym.Max '), 'gym.max');
  assert.equal(normalizeUsername(null), '');
});

test('the TikTok display name counts as the handed-out profile', () => {
  const profile = { name: 'Ethan', username: 'ethanbulking' };
  assert.equal(profileCheck('Ethan', profile, true), 'ok');
  assert.equal(profileCheck('@EthanBulking', profile, true), 'ok');
  assert.equal(profileCheck(null, profile, true), 'ok');
  assert.equal(profileCheck('Kira', { name: null, username: null }, false), 'ok');
});

test('an account from before the onboarding gets switched over, a new one is the wrong account', () => {
  const profile = { name: 'Ethan', username: 'ethanbulking' };
  assert.equal(profileCheck('Kira', profile, false), 'rebrand');
  assert.equal(profileCheck('Kira', profile, true), 'mismatch');
});

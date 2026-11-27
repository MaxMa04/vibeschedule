import test from 'node:test';
import assert from 'node:assert/strict';
import { planAccounts } from './clipper.onboarding.ts';
import {
  accountToDo,
  clipperToDo,
  dueToday,
  teamToDos,
  waitsForUs,
} from './clipper.todo.ts';

const today = '2026-11-27';
const posts = { postedToday: 0, postsPerDay: 2 };

const account = (over = {}) => ({
  id: 'a',
  profileReady: true,
  createdDay: null,
  warmupDays: [],
  fypOk: false,
  connection: 'none',
  ...over,
});

const todo = (over, p = posts) =>
  accountToDo(planAccounts([account(over)], today)[0], p);

test('without a profile from us the account waits for us, not for the clipper', () => {
  const result = todo({ profileReady: false });
  assert.deepEqual(result, { kind: 'locked', key: 'create', lock: 'profile', from: undefined });
  assert.equal(waitsForUs(result), true);
  assert.equal(dueToday(result), false);
});

test('creating is due today once the profile is there', () => {
  const result = todo({});
  assert.deepEqual(result, { kind: 'open', key: 'create' });
  assert.equal(dueToday(result), true);
});

test('a warm-up done today leaves the next one for tomorrow', () => {
  const result = todo({ createdDay: today, warmupDays: [today] });
  assert.equal(result.kind, 'locked');
  assert.equal(result.key, 'warmup_2');
  assert.equal(result.from, '2026-11-28');
  assert.equal(dueToday(result), false);
});

test('a running account counts the posts of the day', () => {
  assert.deepEqual(todo({ connection: 'active' }, { postedToday: 1, postsPerDay: 2 }), {
    kind: 'post',
    posted: 1,
    due: 2,
  });
  assert.equal(dueToday(todo({ connection: 'active' }, { postedToday: 1, postsPerDay: 2 })), true);
  assert.equal(dueToday(todo({ connection: 'active' }, { postedToday: 2, postsPerDay: 2 })), false);
});

test('a disconnected account has to be connected again', () => {
  assert.deepEqual(todo({ connection: 'disconnected' }), { kind: 'open', key: 'connect' });
});

test('a clipper sums up steps, posts, account and general tasks and missing payout details', () => {
  const open = { todo: { kind: 'open', key: 'create' }, openTasks: 1 };
  const posted = { todo: { kind: 'post', posted: 2, due: 2 }, openTasks: 0 };
  const waiting = {
    todo: { kind: 'locked', key: 'create', lock: 'profile' },
    openTasks: 2,
  };
  assert.deepEqual(
    clipperToDo([open, posted, waiting], { payoutDone: true, openTasks: 0 }),
    { open: 4, waitingForUs: 1 }
  );
  assert.deepEqual(
    clipperToDo([posted], { payoutDone: false, openTasks: 2 }),
    { open: 3, waitingForUs: 0 }
  );
});

const running = { kind: 'post', posted: 0, due: 1 };
const teamAccount = (over = {}) => ({
  id: 'acc',
  todo: running,
  rebrand: false,
  usernameMismatch: false,
  tasks: [],
  ...over,
});
const task = (over = {}) => ({
  id: 't',
  kind: 'CUSTOM',
  forTeam: true,
  doneDay: null,
  ...over,
});

test('a clipper without anyone looking after them is a to-do for us', () => {
  assert.deepEqual(teamToDos({ manager: null, tasks: [], accounts: [] }), [
    { kind: 'manager' },
  ]);
  assert.deepEqual(teamToDos({ manager: { id: 'max' }, tasks: [], accounts: [] }), []);
});

test('open tasks for us show, tasks for the clipper and done ones do not', () => {
  const result = teamToDos({
    manager: { id: 'max' },
    tasks: [task({ id: 'pay' }), task({ id: 'clip', forTeam: false })],
    accounts: [
      teamAccount({ tasks: [task({ id: 'done', doneDay: '2026-11-27' }), task({ id: 'acc-task' })] }),
    ],
  });
  assert.deepEqual(result, [
    { kind: 'task', taskId: 'pay', accountId: null },
    { kind: 'task', taskId: 'acc-task', accountId: 'acc' },
  ]);
});

test('missing profiles, rebrands and the wrong account are ours to fix', () => {
  const result = teamToDos({
    manager: { id: 'max' },
    tasks: [],
    accounts: [
      teamAccount({ id: 'a', todo: { kind: 'locked', key: 'create', lock: 'profile' } }),
      teamAccount({ id: 'b', rebrand: true }),
      teamAccount({
        id: 'c',
        rebrand: true,
        tasks: [task({ kind: 'PROFILE', forTeam: false })],
      }),
      teamAccount({ id: 'd', usernameMismatch: true }),
    ],
  });
  assert.deepEqual(result, [
    { kind: 'profile', accountId: 'a' },
    { kind: 'rebrand', accountId: 'b' },
    { kind: 'mismatch', accountId: 'd' },
  ]);
});

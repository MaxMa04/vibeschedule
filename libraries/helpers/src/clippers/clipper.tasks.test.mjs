import test from 'node:test';
import assert from 'node:assert/strict';
import {
  needsProfileTask,
  openTaskCount,
  profileChanged,
  visibleTasks,
} from './clipper.tasks.ts';

test('a changed name, username, bio or picture changes the profile', () => {
  const before = { name: 'Kira', username: 'kira', bio: null, avatar: null };
  assert.equal(profileChanged(before, { name: 'Ethan' }), true);
  assert.equal(profileChanged(before, { username: 'ethanbulking' }), true);
  assert.equal(profileChanged(before, { bio: '19 · bulking diary' }), true);
  assert.equal(profileChanged(before, { avatar: 'https://r2/ethan.jpg' }), true);
});

test('fields left out, the same values or empty for null change nothing', () => {
  const before = { name: 'Kira', username: 'kira', bio: null, avatar: 'a' };
  assert.equal(profileChanged(before, {}), false);
  assert.equal(profileChanged(before, { name: 'Kira', username: 'kira' }), false);
  assert.equal(profileChanged(before, { bio: '' }), false);
  assert.equal(profileChanged(before, { bio: null }), false);
});

test('clearing a field is a change', () => {
  assert.equal(profileChanged({ name: 'Kira' }, { name: null }), true);
});

test('a new profile on a running account needs a profile task', () => {
  assert.equal(
    needsProfileTask({ changed: true, started: true, openProfileTask: false }),
    true
  );
});

test('no profile task when nothing changed, one is open or the account is new', () => {
  assert.equal(
    needsProfileTask({ changed: false, started: true, openProfileTask: false }),
    false
  );
  assert.equal(
    needsProfileTask({ changed: true, started: true, openProfileTask: true }),
    false
  );
  // not created yet: the create step hands out the profile
  assert.equal(
    needsProfileTask({ changed: true, started: false, openProfileTask: false }),
    false
  );
});

test('the checklist shows open tasks first, then those done today', () => {
  const tasks = [
    { id: 'done-old', doneDay: '2026-11-20', createdAt: '2026-11-01' },
    { id: 'done-today', doneDay: '2026-11-26', createdAt: '2026-11-02' },
    { id: 'open-new', doneDay: null, createdAt: '2026-11-25' },
    { id: 'open-old', doneDay: null, createdAt: '2026-11-03' },
  ];
  assert.deepEqual(
    visibleTasks(tasks, '2026-11-26').map((t) => t.id),
    ['open-old', 'open-new', 'done-today']
  );
  assert.equal(openTaskCount(tasks), 2);
});

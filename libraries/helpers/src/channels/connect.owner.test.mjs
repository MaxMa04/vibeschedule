import test from 'node:test';
import assert from 'node:assert/strict';
import {
  connectAccount,
  connectExternalId,
  connectOwner,
} from './connect.owner.ts';

test('a clipper link names the clipper, a team link only the workspace', () => {
  assert.equal(connectExternalId('org1', 'user1'), 'org1:user1');
  assert.equal(connectExternalId('org1'), 'org1');
  assert.equal(connectExternalId('org1', 'user1', 'acc1'), 'org1:user1:acc1');
  assert.equal(connectExternalId('org1', undefined, 'acc1'), 'org1');
});

test('reads the clipper back, only from this workspace', () => {
  assert.equal(connectOwner('org1', 'org1:user1'), 'user1');
  assert.equal(connectOwner('org1', 'org1:user1:acc1'), 'user1');
  assert.equal(connectOwner('org1', 'org1'), null);
  assert.equal(connectOwner('org1', 'org1:'), null);
  assert.equal(connectOwner('org1', 'org2:user1'), null);
  assert.equal(connectOwner('org1', null), null);
});

test('reads the onboarding account back', () => {
  assert.equal(connectAccount('org1', 'org1:user1:acc1'), 'acc1');
  assert.equal(connectAccount('org1', 'org1:user1'), null);
  assert.equal(connectAccount('org1', 'org2:user1:acc1'), null);
});

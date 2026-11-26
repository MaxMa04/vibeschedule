import test from 'node:test';
import assert from 'node:assert/strict';
import { sameOriginUrl } from './same.origin.url.ts';

const app = 'https://vibeschedule.vibelabs.to';

test('a path or an address on this app is followed', () => {
  assert.equal(
    sameOriginUrl('/integrations/social/postforme?isSuccess=true&accountIds=spc_1', app),
    `${app}/integrations/social/postforme?isSuccess=true&accountIds=spc_1`
  );
  assert.equal(sameOriginUrl(`${app}/launches`, app), `${app}/launches`);
});

test('anything that leaves the app is dropped', () => {
  for (const url of [
    'https://evil.example/launches',
    '//evil.example/launches',
    '\\\\evil.example/launches',
    'http://vibeschedule.vibelabs.to/launches',
    'http://localhost:4200/integrations/social/postforme',
    'javascript:alert(1)',
    '',
    null,
  ]) {
    assert.equal(sameOriginUrl(url, app), null, String(url));
  }
});

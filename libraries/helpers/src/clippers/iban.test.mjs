import test from 'node:test';
import assert from 'node:assert/strict';
import { formatIban, isValidIban, normalizeIban } from './iban.ts';

test('accepts valid IBANs in any spelling', () => {
  assert.equal(isValidIban('DE89370400440532013000'), true);
  assert.equal(isValidIban('de89 3704 0044 0532 0130 00'), true);
  assert.equal(isValidIban('AT61 1904 3002 3457 3201'), true);
});

test('rejects typos and garbage', () => {
  assert.equal(isValidIban('DE88370400440532013000'), false);
  assert.equal(isValidIban('DE8937040044053201300'), false);
  assert.equal(isValidIban('1234'), false);
  assert.equal(isValidIban(''), false);
});

test('normalizes and groups by four', () => {
  assert.equal(normalizeIban(' de89-3704 0044 '), 'DE8937040044');
  assert.equal(
    formatIban('DE89370400440532013000'),
    'DE89 3704 0044 0532 0130 00'
  );
});

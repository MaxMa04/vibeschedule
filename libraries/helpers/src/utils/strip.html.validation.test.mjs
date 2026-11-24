import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

// the module imports cjs packages by name, so it is loaded through require
const require = createRequire(import.meta.url);
const { stripHtmlValidation } = require('./strip.html.validation.ts');

const caption = (content) => stripHtmlValidation('normal', content, true);

test('a plain text caption from the API keeps its special characters', () => {
  assert.equal(
    caption('Nutella & Kakao: "Zartbitter" < 70 % ist nicht vegan'),
    'Nutella & Kakao: "Zartbitter" < 70 % ist nicht vegan'
  );
  assert.equal(caption('Zeile 1\nZeile 2 #vegan'), 'Zeile 1\nZeile 2 #vegan');
});

test('an editor caption turns paragraphs into lines', () => {
  assert.equal(
    caption('<p>Nutella &amp; Kakao</p><p>#vegan</p>'),
    'Nutella & Kakao\n#vegan'
  );
});

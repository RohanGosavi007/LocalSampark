/**
 * P12 on the website: the translation dictionary (src/app/data/translations.js).
 *
 * t(key) answers the language's string, else English, else the KEY, so a
 * missing entry is not an error: it shows up on screen as "gatekeeper.title".
 * The gatekeeper page did exactly that (19 keys in no dictionary) until this
 * test existed.
 *
 * The Krishi module's copy (feat_* and cat_*) is English in Hindi and Marathi:
 * the module is off at launch. Everything else must be translated.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { translations } from '../src/app/data/translations.js';

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src');
const LANGUAGES = ['en', 'hi', 'mr'];
const KRISHI_COPY = /^(feat|cat)_/; // off at launch; translated when the module goes live

function* sourceFiles(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* sourceFiles(p);
    else if (/\.(js|jsx)$/.test(e.name)) yield p;
  }
}

test('[P12.7] every language has every English key, none empty, and nothing extra', () => {
  const english = Object.keys(translations.en);
  for (const lang of LANGUAGES) {
    assert.ok(translations[lang], `${lang} dictionary exists`);
    const keys = Object.keys(translations[lang]);
    assert.deepEqual(english.filter((k) => !(k in translations[lang])), [], `${lang} is missing keys`);
    assert.deepEqual(keys.filter((k) => !(k in translations.en)), [], `${lang} has keys English does not`);
    assert.deepEqual(keys.filter((k) => !String(translations[lang][k]).trim()), [], `${lang} has empty strings`);
  }
});

test('[P12.7] every key the code asks for exists, so no key is ever shown in place of a string', () => {
  const asked = new Map();
  for (const file of sourceFiles(SRC)) {
    const text = fs.readFileSync(file, 'utf8');
    for (const m of text.matchAll(/\bt\(\s*['"`]([a-zA-Z0-9_.-]+)['"`]\s*[,)]/g)) {
      if (!asked.has(m[1])) asked.set(m[1], path.relative(SRC, file));
    }
  }
  assert.ok(asked.size > 40, 'the scan found the t() calls');
  const unknown = [...asked].filter(([k]) => !(k in translations.en)).map(([k, f]) => `${k} (${f})`);
  assert.deepEqual(unknown, []);
});

test('[P12.7] Hindi and Marathi really translate the launch interface (everything but the Krishi copy)', () => {
  const english = Object.keys(translations.en).filter((k) => !KRISHI_COPY.test(k));
  assert.ok(english.length > 100);
  for (const lang of ['hi', 'mr']) {
    const stillEnglish = english.filter((k) => translations[lang][k] === translations.en[k]);
    assert.deepEqual(stillEnglish, [], `${lang} still shows English for these launch strings`);
    // …and in the right script: Devanagari.
    const notDevanagari = english.filter((k) => !/[ऀ-ॿ]/.test(translations[lang][k]) && /[A-Za-z]{3,}/.test(translations.en[k]));
    assert.deepEqual(notDevanagari.slice(0, 5), [], `${lang} has launch strings with no Devanagari`);
  }
});

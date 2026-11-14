import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const WEB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const APP = path.join(WEB, 'src', 'app');

test('P12.1 [a11y]: layout.js declares accessible skip-to-content link targeting main-content', () => {
  const layoutSrc = fs.readFileSync(path.join(APP, 'layout.js'), 'utf8');
  assert.ok(layoutSrc.includes('href="#main-content"'), 'layout.js must carry skip link targeting #main-content');
  assert.ok(layoutSrc.includes('Skip to main content'), 'layout.js must carry human readable skip link text');
});

test('P12.2 [a11y]: root landing page declares main landmark with id="main-content" and tabIndex="-1"', () => {
  const pageSrc = fs.readFileSync(path.join(APP, 'page.js'), 'utf8');
  assert.ok(pageSrc.includes('id="main-content"'), 'page.js must have id="main-content" on main landmark');
  assert.ok(pageSrc.includes('tabIndex="-1"'), 'page.js main element should have tabIndex="-1" for focus management');
});

test('P12.3 [a11y]: Header declares accessible banner and navigation landmarks', () => {
  const headerSrc = fs.readFileSync(path.join(APP, 'components', 'Header.js'), 'utf8');
  assert.ok(headerSrc.includes('role="banner"'), 'Header.js must declare role="banner"');
  assert.ok(headerSrc.includes('aria-label="Main Navigation"'), 'Header.js must declare nav with aria-label="Main Navigation"');
});

test('P12.4 [a11y]: interactive action buttons carry explicit aria-label attributes', () => {
  const headerSrc = fs.readFileSync(path.join(APP, 'components', 'Header.js'), 'utf8');
  // The location button's name starts "Select Delivery Location" and CONTAINS the
  // text it shows (WCAG 2.5.3, label in name; axe: label-content-name-mismatch).
  const locationLabel = headerSrc.match(/aria-label=\{`(Select Delivery Location[^`]*)`\}/);
  assert.ok(locationLabel, 'location button missing aria-label');
  assert.ok(locationLabel[1].includes("${location?.addressLabel || t('set_loc')}"), 'location button name must include the visible text');
  assert.ok(headerSrc.includes('aria-label="Voice Search"'), 'voice search button missing aria-label');
  assert.ok(headerSrc.includes('aria-label="Open Shopping Cart"'), 'cart button missing aria-label');
  assert.ok(headerSrc.includes('aria-label="Messages"'), 'chat link missing aria-label');
  assert.ok(headerSrc.includes('aria-label="Notifications"'), 'notifications button missing aria-label');
  assert.ok(headerSrc.includes('aria-label="Toggle navigation menu"'), 'mobile menu toggle missing aria-label');
});

test('P12.5 [a11y]: globals.css defines accessible skip-link styles with focus visibility', () => {
  const cssSrc = fs.readFileSync(path.join(APP, 'globals.css'), 'utf8');
  assert.ok(cssSrc.includes('.skip-link'), 'globals.css must define .skip-link');
  assert.ok(cssSrc.includes('.skip-link:focus'), 'globals.css must define .skip-link:focus');
});

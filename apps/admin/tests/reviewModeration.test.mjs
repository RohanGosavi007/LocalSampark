/**
 * C11 in the admin console: the Reviews section reads the moderation queue and
 * sends each decision to the endpoint that hides or keeps the review.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const src = fs.readFileSync(new URL('../src/components/tabs/CommerceOpsTab.js', import.meta.url), 'utf8');

test('[C11.11] the console lists reported reviews and records each decision with a note', () => {
  assert.match(src, /\['reviews', 'Reviews', ReviewsSection\]/);
  assert.match(src, /get\(`\$\{API_BASE\}\/admin\/commerce\/review-reports`\)/);
  assert.match(src, /\/admin\/commerce\/review-reports\/\$\{r\.review_id\}\/moderate`, \{ method: 'POST', \.\.\.opts\(\{ action, note:/);
  assert.match(src, /decide\(r, 'hide'\)/);
  assert.match(src, /decide\(r, 'keep'\)/);
});

/**
 * Readable fixture labels as ids that work on both engines.
 *
 * Tests and seeders name rows with readable labels ('iso-partner-a',
 * 'demo-shop-3') and clean up by prefix. SQLite accepts any text in an id
 * column; PostgreSQL declares most of them UUID, and a UUID column cannot be
 * compared with LIKE. These helpers turn a label into a deterministic UUID —
 * the same label gives the same id on every run and engine — whose leading
 * segments encode the label's prefix, so cleanup by prefix still works:
 *
 *   DELETE FROM t WHERE CAST(id AS TEXT) LIKE '<pattern>'
 *
 * which is valid on both engines.
 *
 *   fx(label) / fxLike(prefix)       first segment = the label's first token
 *                                    (test fixtures: 'iso-partner-a' -> 'iso')
 *   seedId(label) / seedLike(prefix) first segment = first token, second =
 *                                    second token ('demo-shop-3' -> 'demo','shop'),
 *                                    so 'demo-shop-' and 'demo-' are both prefixes.
 */
const crypto = require('crypto');

const sha1 = (s) => crypto.createHash('sha1').update(s).digest('hex');
const tokens = (label) => String(label).split('-').filter(Boolean);
const variantOf = (hex) => ['8', '9', 'a', 'b'][parseInt(hex, 16) % 4];

// ── test fixtures ───────────────────────────────────────────────────────────
const segment = (prefix) => sha1(`fx-prefix:${prefix}`).slice(0, 8);

/** Deterministic RFC-4122-shaped (version 4 layout) UUID for a fixture label. */
function fx(label) {
  const h = sha1(`fx-label:${label}`);
  return `${segment(tokens(label)[0])}-${h.slice(0, 4)}-4${h.slice(5, 8)}-${variantOf(h[8])}${h.slice(9, 12)}-${h.slice(12, 24)}`;
}

/** LIKE pattern matching every fx() id created under `prefix` ('iso' or 'iso-anything'). */
function fxLike(prefix) {
  return `${segment(tokens(prefix)[0])}-%`;
}

// ── seeded demo data ────────────────────────────────────────────────────────
const seg1 = (t) => sha1(`seed-1:${t}`).slice(0, 8);
const seg2 = (t) => sha1(`seed-2:${t}`).slice(0, 4);

/** Deterministic UUID for a seeded label such as 'demo-shop-3'. */
function seedId(label) {
  const [a, b = ''] = tokens(label);
  const h = sha1(`seed-label:${label}`);
  return `${seg1(a)}-${seg2(b)}-4${h.slice(0, 3)}-${variantOf(h[3])}${h.slice(4, 7)}-${h.slice(7, 19)}`;
}

/** LIKE pattern for seedId() ids under a prefix: 'demo-' (all) or 'demo-shop-' (one kind). */
function seedLike(prefix) {
  const [a, b] = tokens(prefix);
  return b ? `${seg1(a)}-${seg2(b)}-%` : `${seg1(a)}-%`;
}

module.exports = { fx, fxLike, seedId, seedLike };

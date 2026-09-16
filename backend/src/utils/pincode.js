/**
 * Indian pincode normalisation and validation.
 *
 * Every spatial lookup in this platform ultimately keys on a pincode, and the
 * pincode arrives from a dozen places that each format it differently: a mobile
 * text input with a trailing space, a CSV import with a numeric column, a
 * merchant onboarding form where someone typed "411 001", a URL parameter. One
 * shared normaliser is the difference between those all resolving to the same
 * territory and three of them silently resolving to none.
 *
 * ── Why pincodes are strings, always ────────────────────────────────────────
 *
 * An Indian pincode is a six-digit identifier, not a quantity. Storing it as a
 * number is the single most common bug in this domain, and it is quiet: the
 * arithmetic all works, the comparisons mostly work, and then a pincode is
 * rendered as 4.11001e5 in an export, or a leading-zero code — which India does
 * not currently issue but neighbouring postal systems and legacy imports do —
 * loses its zero and becomes a five-digit string that matches nothing.
 *
 * This repository is already consistent here: all 23 pincode columns are TEXT.
 * This module exists to keep it that way at the boundaries, where the
 * consistency is actually decided.
 *
 * ── The first digit ─────────────────────────────────────────────────────────
 *
 * The first digit of an Indian pincode identifies a postal zone and runs 1-9;
 * 0 is not allocated. That makes "000000" and "012345" detectably invalid
 * rather than merely unmatched, which matters because an invalid pincode and an
 * unserviced one call for completely different responses — one is a typo to
 * correct, the other is a franchise opportunity to record.
 */

/** A valid Indian pincode: six digits, first digit 1-9. */
const PINCODE_PATTERN = /^[1-9][0-9]{5}$/;

/**
 * Normalises anything into a canonical pincode string, or null.
 *
 * Accepts numbers, because JSON payloads and CSV imports produce them whatever
 * the schema says, and silently rejecting those would push the inconsistency
 * one layer further in rather than fixing it.
 *
 * Returns null rather than throwing. A bad pincode is ordinary user input on
 * every path that calls this, and an exception would turn a correctable typo
 * into a 500.
 */
function normalize(value) {
  if (value === null || value === undefined) return null;

  // Numbers first. `String(411001)` is fine, but a float that arrived as
  // 411001.0 stringifies with the decimal and would fail the pattern for a
  // reason nobody would guess from the error.
  let text;
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || !Number.isInteger(value)) return null;
    text = String(value);
  } else {
    text = String(value);
  }

  // Strip every kind of whitespace and the separators people type: "411 001",
  // "411-001". Unicode-aware, because a form autofilled from a PDF can carry a
  // non-breaking space that looks identical to a normal one and is not.
  text = text.replace(/[\s  -​\-–—]/g, '');

  // Some imports arrive as "PIN: 411001" or "411001," from a stray CSV column.
  text = text.replace(/^(?:pin|pincode|postal(?:code)?)[:.]?/i, '');
  text = text.replace(/[,.;]+$/, '');

  if (!PINCODE_PATTERN.test(text)) return null;
  return text;
}

/** Whether a value is a valid pincode once normalised. */
function isValid(value) {
  return normalize(value) !== null;
}

/**
 * Normalises a list, dropping anything unusable and de-duplicating.
 *
 * Order is preserved because a franchise's pincode list is shown back to an
 * operator, and reordering it on every save makes a diff unreadable.
 */
function normalizeList(values) {
  if (!Array.isArray(values)) return [];
  const seen = new Set();
  const out = [];
  for (const value of values) {
    const pincode = normalize(value);
    if (!pincode || seen.has(pincode)) continue;
    seen.add(pincode);
    out.push(pincode);
  }
  return out;
}

/**
 * Splits a list into the valid ones and the rejects, with reasons.
 *
 * Used by bulk assignment in the admin panel. A silent drop is the wrong
 * behaviour there: an operator pasting 200 pincodes needs to be told which four
 * were wrong, not handed 196 and left to count.
 */
function partition(values) {
  const accepted = [];
  const rejected = [];
  const seen = new Set();

  for (const raw of Array.isArray(values) ? values : []) {
    const pincode = normalize(raw);
    if (!pincode) {
      rejected.push({ value: raw, reason: describeFailure(raw) });
      continue;
    }
    if (seen.has(pincode)) {
      rejected.push({ value: raw, normalized: pincode, reason: 'duplicate in this list' });
      continue;
    }
    seen.add(pincode);
    accepted.push(pincode);
  }

  return { accepted, rejected };
}

/**
 * Why a value failed, in words an operator can act on.
 *
 * "Invalid pincode" tells someone nothing about which of 200 pasted values to
 * look at or what to change.
 */
function describeFailure(value) {
  if (value === null || value === undefined || String(value).trim() === '') {
    return 'empty';
  }
  const digits = String(value).replace(/\D/g, '');
  if (digits.length === 0) return 'contains no digits';
  if (digits.length < 6) return `only ${digits.length} digits, expected 6`;
  if (digits.length > 6) return `${digits.length} digits, expected 6`;
  if (digits[0] === '0') return 'starts with 0, which is not an allocated postal zone';
  return 'not a six-digit pincode';
}

/**
 * The postal sorting district: the first three digits.
 *
 * Territories sharing a prefix are genuinely nearby — this is what the geo
 * trust test measures real data against — so it is the right key for "roughly
 * this area" questions such as suggesting neighbouring franchise territories.
 */
function district(value) {
  const pincode = normalize(value);
  return pincode ? pincode.slice(0, 3) : null;
}

/** Whether two pincodes fall in the same postal sorting district. */
function sameDistrict(a, b) {
  const districtA = district(a);
  const districtB = district(b);
  return districtA !== null && districtA === districtB;
}

/**
 * A SQL fragment and parameters for matching a pincode column.
 *
 * Callers were writing `WHERE pincode = $1` against un-normalised input, so a
 * merchant stored as "411001" was invisible to a search for "411 001". Going
 * through here means the normalisation happens once, on the way in, rather than
 * being attempted in SQL on both sides.
 */
function matchClause(column, value, paramIndex) {
  const pincode = normalize(value);
  if (!pincode) return null;
  return { sql: `${column} = $${paramIndex}`, param: pincode };
}

module.exports = {
  normalize,
  isValid,
  normalizeList,
  partition,
  describeFailure,
  district,
  sameDistrict,
  matchClause,
  PINCODE_PATTERN,
};

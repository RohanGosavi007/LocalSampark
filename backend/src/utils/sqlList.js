/**
 * Placeholders for an IN (...) list.
 *
 * `col = ANY($1::uuid[])` with an array parameter is PostgreSQL's way to match
 * a list, and SQLite has neither ANY nor arrays, so each query written that way
 * failed there as soon as it had a row to look up — listing a customer's orders
 * worked while they had none and broke on the first one. `col IN ($1, $2, …)`
 * with the values bound one by one is accepted by both.
 *
 *   `WHERE order_id IN (${placeholders(ids.length)})`        // $1, $2, $3
 *   `WHERE shop_id = $1 AND id IN (${placeholders(n, 2)})`   // $2, $3, …
 *
 * `count` must be at least 1: an empty IN () is a syntax error on both engines,
 * so the caller decides what an empty list means before building the query.
 */
function placeholders(count, start = 1) {
  if (!Number.isInteger(count) || count < 1) {
    throw new Error('placeholders() needs at least one value; handle the empty list before querying');
  }
  return Array.from({ length: count }, (_unused, i) => `$${start + i}`).join(', ');
}

module.exports = { placeholders };

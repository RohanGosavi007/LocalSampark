/**
 * Fixture ids that work on both engines — see src/utils/fixtureIds.js.
 *
 * Suites used readable text ids ('iso-partner-a') and cleaned up with
 * `id LIKE 'iso-%'`, which only SQLite accepts on a UUID column, so they could
 * only ever run on SQLite (F-127). fx(label) is the deterministic UUID for a
 * label; fxLike(prefix) the LIKE pattern for `CAST(id AS TEXT) LIKE ...`.
 */
const { fx, fxLike } = require('../../utils/fixtureIds');

module.exports = { fx, fxLike };

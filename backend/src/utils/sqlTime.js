/**
 * Points in time as values to bind, instead of as SQL to write.
 *
 * "Thirty days ago" is spelled datetime('now', '-30 days') in SQLite and
 * NOW() - INTERVAL '30 days' in PostgreSQL, and neither engine accepts the
 * other's. Code written in the first form passed every local run and test and
 * then failed in production, where the database is PostgreSQL. Computing the
 * instant here and binding it as a parameter takes the dialect out of the
 * statement altogether.
 *
 * The text formats are the ones SQLite itself produces for CURRENT_TIMESTAMP
 * and CURRENT_DATE. That matters there because dates are stored as text and
 * compared as text: an ISO string with a 'T' in it sorts after every stored
 * value from the same day. PostgreSQL parses both formats as what they are.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** 'YYYY-MM-DD HH:MM:SS' in UTC, `offsetMs` from now (negative for the past). */
function sqlTimestamp(offsetMs = 0) {
  return new Date(Date.now() + offsetMs).toISOString().slice(0, 19).replace('T', ' ');
}

/** 'YYYY-MM-DD' in UTC, `offsetDays` from today. */
function sqlDate(offsetDays = 0) {
  return new Date(Date.now() + offsetDays * DAY_MS).toISOString().slice(0, 10);
}

/**
 * SQL for "the calendar day this column falls on", as 'YYYY-MM-DD' text.
 *
 * date(col) is SQLite's; CAST(col AS DATE) is PostgreSQL's and in SQLite
 * silently yields the year as an integer. Taking the first ten characters of
 * the text form is right on both, whether the column is stored as text, a date
 * or a timestamp. `column` is an identifier written in source, never input.
 */
function dayOf(column) {
  return `substr(CAST(${column} AS TEXT), 1, 10)`;
}

module.exports = { sqlTimestamp, sqlDate, dayOf, DAY_MS };

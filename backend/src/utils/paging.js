/**
 * Page/limit parsing for admin lists. Always bounded: a list endpoint that returns "all rows"
 * works until the table grows, then ships megabytes to a browser that renders a few dozen.
 */
function pageParams(query = {}, { defaultLimit = 50, maxLimit = 200 } = {}) {
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || defaultLimit, 1), maxLimit);
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  return { page, limit, offset: (page - 1) * limit };
}

/** Escapes % and _ so user text matches literally inside LIKE ... ESCAPE '\'. */
function likePattern(text) {
  return `%${String(text).trim().replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

module.exports = { pageParams, likePattern };

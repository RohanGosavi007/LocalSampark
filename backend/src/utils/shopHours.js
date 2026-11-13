/**
 * Whether a shop is open right now, for showing to a customer (C3.2).
 *
 * opening_hours is stored as JSON in a few shapes ({open, close}, {opens,
 * closes}, {from, to}). Returns true / false, or null when the hours are
 * missing or unreadable. ml/ranking/sessionBoost.isOpenAt deliberately treats
 * unknown hours as open, which suits ranking but would tell a customer a shop
 * is open when nobody knows; here unknown stays unknown.
 *
 * Shops are in India and the server may run in UTC, so the clock is read in
 * IST (UTC+5:30, no daylight saving).
 */
const IST_OFFSET_MINUTES = 330;

function istMinutesOfDay(now = new Date()) {
  const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  return (utcMinutes + IST_OFFSET_MINUTES) % (24 * 60);
}

function parseClock(value) {
  if (value === null || value === undefined) return null;
  const match = String(value).trim().match(/^(\d{1,2})(?::(\d{2}))?$/);
  if (!match) return null;
  const h = parseInt(match[1], 10);
  const m = match[2] ? parseInt(match[2], 10) : 0;
  if (h > 24 || m > 59 || (h === 24 && m !== 0)) return null;
  return h * 60 + m;
}

function parseHours(raw) {
  if (!raw) return null;
  let hours = raw;
  if (typeof hours === 'string') {
    try {
      hours = JSON.parse(hours);
    } catch {
      return null;
    }
  }
  if (!hours || typeof hours !== 'object') return null;
  const open = parseClock(hours.open ?? hours.opens ?? hours.from);
  const close = parseClock(hours.close ?? hours.closes ?? hours.to);
  if (open === null || close === null) return null;
  return { open, close };
}

function isOpenNow(openingHours, now = new Date()) {
  const hours = parseHours(openingHours);
  if (!hours) return null;
  const t = istMinutesOfDay(now);
  // Equal times (09:00-09:00) could mean 24 h or closed; don't guess. A real
  // 24-hour shop is 00:00-24:00, which the range check below covers.
  if (hours.open === hours.close) return null;
  // A closing time before the opening time means the shop runs past midnight.
  if (hours.close < hours.open) return t >= hours.open || t < hours.close;
  return t >= hours.open && t < hours.close;
}

module.exports = { isOpenNow, parseHours, istMinutesOfDay };

/**
 * Delivery and pickup time slots (C8: "delivery time slot selection, or ASAP").
 *
 * An order is ASAP unless the customer picks a slot. Slots are one-hour
 * windows, today and tomorrow, inside the shop's opening hours and at least
 * LEAD_MINUTES ahead, so the shop has time to prepare. Times are India time
 * (UTC+5:30, no daylight saving), the zone every shop trades in.
 *
 * opening_hours is {"open":"HH:MM","close":"HH:MM"}. A close at or before the
 * open wraps past midnight; 00:00-00:00 is open all day (seeds/seed_shops.js).
 * A shop without readable hours gets no slots: ASAP only, rather than slots
 * invented for hours nobody gave.
 */
const IST_OFFSET_MS = 330 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const LEAD_MINUTES = 45;
const DAYS = 2;
const MAX_SLOTS = 16;

class SlotError extends Error {
  constructor(message) {
    super(message);
    this.name = 'SlotError';
    this.status = 400;
    this.code = 'SLOT_UNAVAILABLE';
  }
}

function minutes(hhmm) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || '').trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 24 || min > 59) return null;
  return h * 60 + min;
}

/** { open, close } in minutes after midnight, or null. */
function parseHours(raw) {
  let value = raw;
  if (typeof value === 'string') {
    try { value = JSON.parse(value); } catch { return null; }
  }
  if (!value || typeof value !== 'object') return null;
  const open = minutes(value.open);
  const close = minutes(value.close);
  if (open === null || close === null) return null;
  return { open, close };
}

/** Whether the shop is open at this minute of the day. */
function openAt(hours, minute) {
  const m = ((minute % 1440) + 1440) % 1440;
  if (hours.open === hours.close) return true;
  if (hours.close > hours.open) return m >= hours.open && m < hours.close;
  return m >= hours.open || m < hours.close;
}

const hhmm = (ms) => {
  const d = new Date(ms + IST_OFFSET_MS);
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
};

/**
 * The slots a shop offers from `now`: [{ start, end, day, from, to }], start
 * and end as ISO instants, day 'today' or 'tomorrow', from/to as India time.
 */
function slotsFor(shop, now = new Date()) {
  const hours = parseHours(shop && shop.opening_hours);
  if (!hours) return [];
  const nowMs = now.getTime();
  const ist = new Date(nowMs + IST_OFFSET_MS);
  const todayStart = Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate()) - IST_OFFSET_MS;
  const earliest = nowMs + LEAD_MINUTES * 60 * 1000;

  const slots = [];
  for (let day = 0; day < DAYS && slots.length < MAX_SLOTS; day += 1) {
    for (let hour = 0; hour < 24 && slots.length < MAX_SLOTS; hour += 1) {
      const start = todayStart + day * DAY_MS + hour * HOUR_MS;
      if (start < earliest) continue;
      // The whole hour has to be inside opening hours.
      if (!openAt(hours, hour * 60) || !openAt(hours, hour * 60 + 59)) continue;
      slots.push({
        start: new Date(start).toISOString(),
        end: new Date(start + HOUR_MS).toISOString(),
        day: day === 0 ? 'today' : 'tomorrow',
        from: hhmm(start),
        to: hhmm(start + HOUR_MS),
      });
    }
  }
  return slots;
}

/** The slots every one of these shops offers (a multi-shop cart arrives together). */
function commonSlots(shops, now = new Date()) {
  if (!shops.length) return [];
  const [first, ...rest] = shops.map((s) => slotsFor(s, now));
  return first.filter((slot) => rest.every((list) => list.some((s) => s.start === slot.start)));
}

/**
 * The slot an order is for: null for ASAP (no value, or 'asap'), otherwise the
 * ISO start of one of the shop's slots. Anything else is refused, rather than
 * an order promised for a time the shop is shut.
 */
function chosenSlot(shop, value, now = new Date()) {
  if (value === undefined || value === null || value === '' || String(value).toLowerCase() === 'asap') return null;
  const at = new Date(value);
  if (Number.isNaN(at.getTime())) throw new SlotError('Choose a delivery time from the list, or ASAP.');
  const iso = at.toISOString();
  if (!slotsFor(shop, now).some((s) => s.start === iso)) {
    throw new SlotError('That time is no longer available. Choose another time, or ASAP.');
  }
  return iso;
}

module.exports = { slotsFor, commonSlots, chosenSlot, parseHours, openAt, SlotError, LEAD_MINUTES };

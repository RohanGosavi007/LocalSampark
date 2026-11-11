/**
 * Delivery time in the app (C8): as soon as possible, or one of the one-hour
 * slots the server's quote offers (backend services/deliverySlots.service.js).
 * React-free so it can be tested.
 */
export const ASAP = 'asap';

export const slotLabel = (slot) => `${slot.day === 'today' ? 'Today' : 'Tomorrow'} ${slot.from}–${slot.to}`;

/** The options to show: ASAP first, then each slot. */
export function timeOptions(quote) {
  const slots = quote && Array.isArray(quote.slots) ? quote.slots : [];
  return [{ value: ASAP, label: 'As soon as possible' }, ...slots.map((s) => ({ value: s.start, label: slotLabel(s) }))];
}

/** The choice to keep: ASAP when the chosen slot is no longer offered. */
export function keepChoice(choice, quote) {
  if (!choice || choice === ASAP || !quote) return choice || ASAP;
  return timeOptions(quote).some((o) => o.value === choice) ? choice : ASAP;
}

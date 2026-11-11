/**
 * The bill for a cart, as the server works it out.
 *
 * Delivery is charged by distance (POST /checkout/quote), so the server needs
 * to know where the order is going: a saved address of the customer's
 * (`addressId`) or a point (`deliveryCoordinate`). Every checkout screen asks
 * for the bill through here and shows exactly what it says — no client adds a
 * fee of its own.
 */

import { API_BASE, getAuthHeaders } from './api';

/** What to tell the customer when a cart cannot be priced as asked. */
const PROBLEMS = {
  LOCATION_REQUIRED: 'Share your delivery location — the delivery charge depends on the distance.',
  OUT_OF_DELIVERY_RANGE: null, // the server's message names the distance and the limit
  DELIVERY_NOT_OFFERED: 'This shop does not deliver. Choose pickup instead.',
  SHOP_LOCATION_MISSING: 'This shop cannot take delivery orders yet. Choose pickup instead.',
  COD_NOT_AVAILABLE: null,
};

export class QuoteError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'QuoteError';
    this.code = code;
    this.details = details;
  }
}

/**
 * POST /checkout/quote. `body` is what POST /checkout takes.
 * Resolves to { bill, paymentMethods, cod }; rejects with a QuoteError.
 *
 * With `batch: true` it prices a multi-shop cart (D6) with
 * POST /shops/cart/batch-quote, which answers in the same shape plus `shops`,
 * each shop's share; `body.items` are then { shop_id, product_id, quantity }.
 */
export async function fetchQuote(body, { batch = false } = {}) {
  let res;
  try {
    res = await fetch(`${API_BASE}${batch ? '/shops/cart/batch-quote' : '/checkout/quote'}`, {
      method: 'POST',
      // Signed in, a saved address can be named by id.
      headers: getAuthHeaders(),
      body: JSON.stringify(body),
    });
  } catch {
    throw new QuoteError('NETWORK', 'Could not reach the server to price your order.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    const code = data.code || 'UNPRICEABLE';
    throw new QuoteError(code, PROBLEMS[code] || data.error || data.message || 'This order cannot be priced right now.', data);
  }
  return data;
}

/**
 * The device's location, once. Rejects with a message the customer can act on.
 */
export function currentPosition({ timeoutMs = 15000 } = {}) {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('This browser cannot share your location. Choose a saved address instead.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
      (error) => reject(new Error(
        error && error.code === 1
          ? 'Location permission was refused. Allow it in your browser, or choose a saved address.'
          : 'Your location could not be found. Try again, or choose a saved address.'
      )),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 60000 }
    );
  });
}

const rupees = (value) => `₹${Number(value || 0).toFixed(2)}`;

/**
 * The bill as lines to show: [{ label, value, note? }]. Fees that are zero
 * are left out, except delivery, which says FREE.
 */
export function billLines(bill, { pickup = false } = {}) {
  if (!bill) return [];
  const lines = [{ label: 'Item total', value: rupees(bill.subtotal) }];

  if (pickup) {
    lines.push({ label: 'Delivery', value: 'Pickup — no charge' });
  } else {
    const parts = [];
    if (bill.distanceKm !== null && bill.distanceKm !== undefined) parts.push(`${bill.distanceKm} km`);
    if (bill.surgeMultiplier > 1) parts.push(`busy-time ×${bill.surgeMultiplier}`);
    lines.push({
      label: 'Delivery',
      value: bill.deliveryFee === 0 ? 'FREE' : rupees(bill.deliveryFee),
      note: parts.join(' · ') || undefined,
    });
  }
  if (bill.smallOrderFee > 0) lines.push({ label: 'Small order fee', value: rupees(bill.smallOrderFee) });
  if (bill.platformFee > 0) lines.push({ label: 'Platform fee', value: rupees(bill.platformFee) });
  if (bill.discount > 0) lines.push({ label: 'Discount', value: `−${rupees(bill.discount)}` });
  return lines;
}

/** "Arrives in about 25 min", or null. */
export function etaText(bill, { pickup = false } = {}) {
  if (!bill || !bill.etaMinutes) return null;
  return pickup ? `Ready in about ${bill.etaMinutes} min` : `Arrives in about ${bill.etaMinutes} min`;
}

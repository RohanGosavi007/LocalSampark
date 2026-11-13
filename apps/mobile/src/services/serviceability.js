/**
 * C2 on Android: is this position somewhere we deliver, and if not, the
 * waitlist.
 *
 * ZoneContext.detectLocation used to answer "outside every zone" by quietly
 * switching the user into the nearest zone (GET /zones/nearby), so someone
 * hundreds of kilometres away was attached to a zone that does not deliver to
 * them, and was never told. The answer is now reported as it is: inside a
 * zone, or outside with the nearest one named — never moved into it.
 */
import { apiGet, apiPost } from '../lib/api';

const PHONE_RE = /^\+?[0-9]{10,15}$/;
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;

/** GET /zones/resolve for a position. Never picks a zone on the user's behalf. */
export async function checkServiceability(lat, lng) {
  if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) {
    throw new Error('A location is needed to check your area.');
  }
  const res = await apiGet(`/zones/resolve?lat=${Number(lat)}&lng=${Number(lng)}`);
  if (res && !res.outOfBounds && res.territory) {
    return { inZone: true, territory: res.territory };
  }
  return { inZone: false, nearest: (res && res.nearest) || null, lat: Number(lat), lng: Number(lng) };
}

/** What the out-of-zone screen says, from checkServiceability's answer. */
export function outOfZoneMessage(result) {
  if (!result || result.inZone) return null;
  const n = result.nearest;
  if (!n) return "We don't deliver to your area yet.";
  const km = Number(n.distance_km);
  return `We don't deliver to your area yet. The nearest area we serve is ${n.name}${Number.isFinite(km) ? `, about ${Math.round(km)} km away` : ''}.`;
}

/**
 * One field, a phone number or an email, as the form takes it. Returns the
 * body fields for POST /zones/waitlist, or { error } with what to fix.
 */
export function waitlistContact(input) {
  const value = String(input || '').trim();
  if (!value) return { error: 'Enter a mobile number or email so we can tell you.' };
  if (value.includes('@')) {
    const email = value.toLowerCase();
    return EMAIL_RE.test(email) ? { email } : { error: 'That email does not look right.' };
  }
  const phone = value.replace(/[\s-]/g, '');
  return PHONE_RE.test(phone) ? { phone } : { error: 'That mobile number does not look right.' };
}

/** POST /zones/waitlist. Throws with a message the screen can show. */
export async function joinWaitlist({ lat, lng, contact, pincode }) {
  const fields = waitlistContact(contact);
  if (fields.error) throw new Error(fields.error);
  return apiPost('/zones/waitlist', {
    latitude: Number(lat),
    longitude: Number(lng),
    ...(pincode ? { pincode: String(pincode) } : {}),
    ...fields,
  });
}

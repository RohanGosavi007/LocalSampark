/**
 * The rider's side of delivery (R1–R5), as the screens use it.
 *
 * The tabs already showed real jobs, but four of the rider's jobs never reached
 * the server: the duty toggle flipped a local boolean, the app never sent a
 * position, the cash a rider holds was invisible to them, and "picked up" went
 * through the generic status route, which does not tell the customer. Each is
 * one call here, against the route the backend tests cover.
 */
import * as Location from 'expo-location';
import { apiGet, apiPost, apiPut } from '../lib/api';

/** KYC states in which the server lets a rider go on duty (delivery.controller updateDutyStatus). */
export const APPROVED_KYC = ['active', 'approved', 'verified'];

/** The rider's profile, or null when they have not applied yet (the server answers 404). */
export async function getRiderProfile() {
  try {
    const res = await apiGet('/delivery/profile');
    return res?.profile ?? null;
  } catch (err) {
    if (err?.status === 404) return null;
    throw err;
  }
}

/** What the duty switch should offer for this profile. */
export function dutyState(profile) {
  if (!profile) return { canToggle: false, reason: 'apply', online: false };
  const kyc = String(profile.kycStatus || 'pending').toLowerCase();
  if (!APPROVED_KYC.includes(kyc)) {
    return { canToggle: false, reason: kyc === 'rejected' ? 'rejected' : 'pending', online: false, rejectionReason: profile.rejectionReason || null };
  }
  return { canToggle: true, reason: null, online: Boolean(profile.isOnline) };
}

/**
 * Go on or off duty. Going online sends the current position, which the server
 * checks against the pilot zone; the refusal (not approved, cash limit reached,
 * outside the zone) comes back as the server's own message.
 */
export async function setDuty(online, { getPosition = currentPosition } = {}) {
  const body = { isOnline: Boolean(online) };
  if (online) {
    const pos = await getPosition();
    if (pos) { body.latitude = pos.latitude; body.longitude = pos.longitude; }
  }
  return apiPut('/delivery/duty', body);
}

/** Mark an assigned job picked up; the server tells the customer it is on the way. */
export function pickUp(jobId) {
  return apiPost(`/delivery/jobs/${jobId}/pickup`, {});
}

export function acceptJob(jobId) {
  return apiPost(`/delivery/jobs/${jobId}/accept`, {});
}

/** Close a delivery with the customer's handover code. A wrong code is refused by the server. */
export function completeJob(jobId, otp) {
  const code = String(otp || '').trim();
  if (code.length < 4) {
    const err = new Error('Ask the customer for the handover code shown in their app.');
    err.code = 'OTP_REQUIRED';
    return Promise.reject(err);
  }
  return apiPost(`/delivery/jobs/${jobId}/complete`, { otp: code });
}

/** Cash the rider is holding from COD orders, the limit, and the entries behind it. */
export async function getCash() {
  const res = await apiGet('/delivery/cash');
  const d = res?.data ?? {};
  return {
    cashInHand: Number(d.cashInHand) || 0,
    limit: Number(d.limit) || 0,
    isBlocked: Boolean(d.isBlocked),
    ledger: Array.isArray(d.ledger) ? d.ledger : [],
  };
}

/** Pay cash in hand off from wallet earnings instead of handing it in. */
export function settleCash(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) {
    return Promise.reject(new Error('Enter an amount greater than zero.'));
  }
  return apiPost('/delivery/cash/settle', { amount: n });
}

/** One foreground fix, or null when the rider has not allowed location. */
export async function currentPosition() {
  const perm = await Location.requestForegroundPermissionsAsync();
  if (perm?.status !== 'granted') return null;
  const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy?.Balanced ?? 3 });
  return pos?.coords ? { latitude: pos.coords.latitude, longitude: pos.coords.longitude } : null;
}

/**
 * Live position for one delivery, while the rider has the app open.
 *
 * Battery: fixes come from the balanced (cell/Wi-Fi assisted) provider, and only
 * after the rider has moved TRACK_DISTANCE_M, with uploads at most every
 * TRACK_MIN_INTERVAL_MS. A parked rider sends nothing. Mocked fixes (a
 * GPS-spoofing app) are dropped rather than sent to the customer.
 *
 * Returns stop(); the caller stops it when the job is delivered or the screen
 * goes away. Returns null when location is not allowed.
 */
export const TRACK_DISTANCE_M = 30;
export const TRACK_MIN_INTERVAL_MS = 10000;

export async function startTracking(orderId, { now = () => Date.now(), onError } = {}) {
  const perm = await Location.requestForegroundPermissionsAsync();
  if (perm?.status !== 'granted') return null;

  let lastSent = 0;
  const subscription = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy?.Balanced ?? 3,
      distanceInterval: TRACK_DISTANCE_M,
      timeInterval: TRACK_MIN_INTERVAL_MS,
    },
    (pos) => {
      if (!pos?.coords || pos.mocked) return;
      const t = now();
      if (t - lastSent < TRACK_MIN_INTERVAL_MS) return;
      lastSent = t;
      apiPost('/delivery/location', {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        orderId,
      }).catch((err) => { if (onError) onError(err); });
    }
  );
  return () => subscription?.remove?.();
}

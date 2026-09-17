/**
 * Territory resolution on the device.
 *
 * The app needs to know which territory the user is in before it can show them
 * anything, and that has to work on a phone in a lift with no signal, on one
 * whose owner declined location permission, and on one running a GPS spoofer.
 *
 * ── Graceful degradation, in order ─────────────────────────────────────────
 *
 *   1. **GPS**, if permission is already granted and the fix is fresh and not
 *      mocked.
 *   2. **The cached pincode** from the last successful resolution. A user's
 *      territory changes rarely; a stale-but-real answer beats a spinner.
 *   3. **The manual picker**, which is not a failure state — for a large share
 *      of users it is the fastest path and the one they would choose anyway.
 *
 * Each step reports how it got its answer so the UI can be honest: "showing
 * shops near 411001" reads very differently from a silent guess.
 *
 * ── Battery ────────────────────────────────────────────────────────────────
 *
 * There is no continuous watch and no background location. A hyperlocal
 * directory needs the user's position when they open a screen, not a trail of
 * where they have been, and `watchPositionAsync` on a phone that sits in a
 * pocket all day is a battery complaint with no product behind it.
 * `ACCESS_BACKGROUND_LOCATION` is deliberately absent from the manifest: adding
 * it would require a Play Store policy declaration for a capability nothing
 * here uses.
 *
 * A cached fix is reused inside a short window rather than re-acquired, because
 * two screens opening in the same few seconds should not each wake the GPS.
 */

import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../lib/api';

const CACHE_KEY = '@localsampark_territory_resolution';

/** How long a GPS fix stays good enough to reuse. */
const FIX_TTL_MS = 60 * 1000;

/** How long a cached resolution is offered before it is only a fallback. */
const RESOLUTION_TTL_MS = 12 * 60 * 60 * 1000;

/** Acquisition ceiling. Beyond this the user is staring at a spinner. */
const GPS_TIMEOUT_MS = 8000;

/**
 * Speed above which a jump between two fixes is not a journey.
 *
 * 300 km/h. A commercial flight exceeds it and nothing else a delivery rider
 * does comes close, so the false-positive rate on real movement is effectively
 * zero while the signal on teleportation is unambiguous.
 *
 * This exists because `position.mocked` only catches a spoofer that announces
 * itself. Android sets the flag when a mock *provider* supplies the fix, but a
 * rooted device, a patched build, or a spoofer hooking the location APIs
 * directly will hand over coordinates with the flag clear. What such a spoofer
 * cannot easily fake is a plausible *history*: jumping from Pune to Mumbai
 * between two fixes thirty seconds apart is 14,000 km/h, and no amount of
 * flag-clearing makes that a drive.
 */
const MAX_PLAUSIBLE_KMH = 300;

/** Below this gap, ordinary GPS scatter produces meaningless speeds. */
const MIN_INTERVAL_FOR_SPEED_MS = 5000;

let lastFix = null; // { lat, lng, at, mocked }

/**
 * Whether a pincode is well formed.
 *
 * Mirrors the server's rule exactly — six digits, first digit 1-9. Duplicating
 * it here is deliberate: the client can then reject a typo without a round trip
 * and, more importantly, cannot send something the server will silently drop
 * while the app believes it was accepted.
 */
export function isValidPincode(value) {
  return /^[1-9][0-9]{5}$/.test(String(value ?? '').replace(/[\s -]/g, ''));
}

export function normalizePincode(value) {
  const text = String(value ?? '').replace(/[\s -]/g, '');
  return isValidPincode(text) ? text : null;
}

async function readCache() {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.pincode) return null;
    return parsed;
  } catch {
    // A corrupt cache is not worth surfacing; it just means no cached answer.
    return null;
  }
}

async function writeCache(resolution) {
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({
      pincode: resolution.territory?.pincode || resolution.pincode || null,
      territoryId: resolution.territory?.id || null,
      territoryName: resolution.territory?.name || null,
      method: resolution.method,
      at: Date.now(),
    }));
  } catch {
    // Persisting is an optimisation. Failing to persist must not fail the
    // resolution the user is waiting on.
  }
}

/**
 * Whether moving between two fixes would require an implausible speed.
 *
 * Returns `{ implausible, kmh }`. Says no when there is nothing to compare
 * against, when the fixes are too close together in time for a speed to mean
 * anything, or when either fix is unusable — an absent history is not evidence
 * of spoofing, and treating it as such would flag every cold start.
 */
export function implausibleJump(previous, current) {
  if (!previous || !current) return { implausible: false, kmh: null };

  const elapsedMs = current.at - previous.at;
  if (!Number.isFinite(elapsedMs) || elapsedMs < MIN_INTERVAL_FOR_SPEED_MS) {
    return { implausible: false, kmh: null };
  }

  const km = haversineKm(previous.lat, previous.lng, current.lat, current.lng);
  if (!Number.isFinite(km)) return { implausible: false, kmh: null };

  const kmh = km / (elapsedMs / 3600000);
  return { implausible: kmh > MAX_PLAUSIBLE_KMH, kmh: Math.round(kmh) };
}

/** Great-circle distance in km. Small enough not to warrant a dependency. */
function haversineKm(lat1, lng1, lat2, lng2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const h =
    Math.sin(toRad(lat2 - lat1) / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(toRad(lng2 - lng1) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Acquires a position, or explains why it could not.
 *
 * Never prompts for permission on its own. A permission dialog that appears
 * because a background refresh happened to run is the single fastest way to get
 * denied permanently; asking is the caller's decision, made at a moment the
 * user can connect to something they asked for.
 */
export async function getPosition({ allowPrompt = false } = {}) {
  if (lastFix && Date.now() - lastFix.at < FIX_TTL_MS) {
    return { ok: true, ...lastFix, cached: true };
  }

  // Held before lastFix is overwritten, so the plausibility check below has a
  // previous position to compare against.
  const previousFix = lastFix;

  try {
    let { status } = await Location.getForegroundPermissionsAsync();

    if (status !== 'granted') {
      if (!allowPrompt) return { ok: false, reason: 'permission_not_granted', status };
      ({ status } = await Location.requestForegroundPermissionsAsync());
      if (status !== 'granted') return { ok: false, reason: 'permission_denied', status };
    }

    const services = await Location.hasServicesEnabledAsync();
    if (!services) return { ok: false, reason: 'location_services_off' };

    // Balanced accuracy, not High. High engages GPS hardware for metre-level
    // precision; territory resolution needs to know which suburb someone is in,
    // and Balanced answers that from wifi and cell towers in a fraction of the
    // time and power.
    const position = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy?.Balanced ?? 3 }),
      new Promise((resolve) => setTimeout(() => resolve(null), GPS_TIMEOUT_MS)),
    ]);

    if (!position) return { ok: false, reason: 'timeout' };

    const now = Date.now();
    const lat = position.coords.latitude;
    const lng = position.coords.longitude;

    // Android reports when a position came from a mock provider. It is not a
    // security control — a determined spoofer patches the app — but it catches
    // the ordinary case, and the server treats a flagged fix as unusable for
    // attribution rather than trusting it.
    const flaggedMock = position.mocked === true || position.coords?.mocked === true;

    // The second signal: a fix that is only reachable by teleporting. See
    // MAX_PLAUSIBLE_KMH — this catches the spoofer that does not set the flag.
    const jump = implausibleJump(previousFix, { lat, lng, at: now });

    lastFix = {
      lat,
      lng,
      accuracy: position.coords.accuracy,
      mocked: flaggedMock || jump.implausible,
      mockReason: flaggedMock ? 'provider_flag' : (jump.implausible ? 'implausible_speed' : null),
      impliedKmh: jump.kmh,
      at: now,
    };

    return { ok: true, ...lastFix, cached: false };
  } catch (err) {
    return { ok: false, reason: 'error', message: err?.message };
  }
}

/**
 * Asks the server where the user is.
 *
 * Sends whatever signals are available and lets the server apply precedence —
 * the client does not know which boundaries are verified, and encoding that
 * here would mean shipping an app update whenever the answer changed.
 */
async function askServer({ lat = null, lng = null, pincode = null, mocked = false }) {
  const params = new URLSearchParams();
  if (lat != null && lng != null && !mocked) {
    params.set('lat', String(lat));
    params.set('lng', String(lng));
  }
  if (pincode) params.set('pincode', pincode);
  if (mocked) params.set('mocked', 'true');

  if ([...params.keys()].length === 0) {
    return { resolved: false, method: 'unresolved', reason: 'no_location_signal' };
  }

  const response = await fetch(`${API_URL}/territories/resolve?${params.toString()}`, {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    return { resolved: false, method: 'unresolved', reason: `http_${response.status}` };
  }
  return response.json();
}

/**
 * The full degradation ladder.
 *
 * Returns `{ resolved, method, source, territory, needsManualEntry }`.
 * `source` is where the *input* came from — gps, cache, manual — which is a
 * different question from `method`, the server's basis for the answer, and the
 * UI needs both to explain itself.
 */
export async function resolveTerritory({ allowPrompt = false, pincode = null } = {}) {
  // An explicit pincode always wins: the user has just told us where they are.
  if (pincode) {
    const normalized = normalizePincode(pincode);
    if (!normalized) {
      return { resolved: false, source: 'manual', reason: 'invalid_pincode', needsManualEntry: true };
    }
    try {
      const result = await askServer({ pincode: normalized });
      if (result.resolved) {
        await writeCache(result);
        return { ...result, source: 'manual', needsManualEntry: false };
      }
      return { ...result, source: 'manual', needsManualEntry: true };
    } catch {
      return { resolved: false, source: 'manual', reason: 'network', needsManualEntry: true };
    }
  }

  // Step 1: GPS.
  const position = await getPosition({ allowPrompt });
  if (position.ok) {
    try {
      const result = await askServer({
        lat: position.lat,
        lng: position.lng,
        mocked: position.mocked,
      });
      if (result.resolved) {
        await writeCache(result);
        return { ...result, source: 'gps', mocked: position.mocked, needsManualEntry: false };
      }
      // A GPS fix the server could not place is the common case today, because
      // boundaries are quarantined. Fall through rather than stopping here.
    } catch {
      // Network failure; the cache below may still answer.
    }
  }

  // Step 2: the last known pincode.
  const cached = await readCache();
  if (cached && cached.pincode) {
    const fresh = Date.now() - cached.at < RESOLUTION_TTL_MS;
    try {
      const result = await askServer({ pincode: cached.pincode });
      if (result.resolved) {
        return {
          ...result,
          source: 'cache',
          stale: !fresh,
          needsManualEntry: false,
        };
      }
    } catch {
      // Offline with a cached answer: return it rather than nothing. It is the
      // last place this user was actually resolved to, which is a far better
      // guess than an empty screen.
      return {
        resolved: true,
        offline: true,
        source: 'cache',
        stale: !fresh,
        method: 'cached_pincode',
        territory: {
          id: cached.territoryId,
          name: cached.territoryName,
          pincode: cached.pincode,
        },
        needsManualEntry: false,
      };
    }
  }

  // Step 3: ask the user.
  return {
    resolved: false,
    source: position.ok ? 'gps' : 'none',
    reason: position.ok ? 'not_serviceable' : position.reason,
    needsManualEntry: true,
  };
}

/** Registers interest when the user's area has no franchise yet. */
export async function registerCoverageInterest(pincode) {
  const normalized = normalizePincode(pincode);
  if (!normalized) return { recorded: false, reason: 'invalid_pincode' };

  try {
    const response = await fetch(`${API_URL}/territories/interest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ pincode: normalized }),
    });
    if (!response.ok) return { recorded: false, reason: `http_${response.status}` };
    return response.json();
  } catch {
    return { recorded: false, reason: 'network' };
  }
}

/** Clears the cached resolution. Called on sign-out. */
export async function clearCache() {
  lastFix = null;
  try {
    await AsyncStorage.removeItem(CACHE_KEY);
  } catch {
    // Nothing useful to do; the TTL will expire it.
  }
}

/** Test seam: resets the in-memory fix without touching storage. */
export function __resetFixCache() {
  lastFix = null;
}

export default {
  resolveTerritory,
  getPosition,
  registerCoverageInterest,
  isValidPincode,
  normalizePincode,
  clearCache,
};

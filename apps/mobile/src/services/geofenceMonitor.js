/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Geofence monitor — foreground border watching with offline durability
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Watches for the user crossing out of the territory the app is locked to, and
 * makes sure the crossing reaches the server even if it happened in a lift.
 *
 * ── Foreground only, and why ───────────────────────────────────────────────
 *
 * There is no `ACCESS_BACKGROUND_LOCATION` here and no expo-task-manager
 * background task. OS-level geofence transitions with the app closed would be
 * more thorough, and they require that permission, which in turn requires a
 * Play Store data-safety declaration and a review in which Google asks what the
 * app does with a user's location while they are not using it. That is a
 * product and compliance decision, not a technical one, and it was taken
 * deliberately: watch while the app is open or a job is active, and do not ask
 * for a permission the platform will make us justify.
 *
 * ── Not polling ────────────────────────────────────────────────────────────
 *
 * `watchPositionAsync` is driven by `distanceInterval`, so Android delivers a
 * fix when the device has actually moved rather than on a timer. A rider whose
 * phone sits in a cradle at a junction for ten minutes produces no updates and
 * costs no battery. `timeInterval` is set as a floor, not a target — it caps
 * how often we are willing to hear, not how often we ask.
 *
 * ── The offline queue ──────────────────────────────────────────────────────
 *
 * Crossing a franchise boundary is exactly the moment a rider is most likely to
 * be somewhere with no signal — the edge of a serviced area. A transition that
 * is only reported live is a transition that is lost precisely when it matters.
 * Transitions are therefore written to AsyncStorage first and flushed when
 * connectivity returns, oldest first, with the timestamp of the crossing rather
 * than of the upload — otherwise every reconnection reports a rider leaving
 * their zone at the moment their signal came back.
 */

import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { apiPost } from '../lib/api';
import { resolveTerritory } from './territoryResolver';

const QUEUE_KEY = '@localsampark_territory_transitions';

/** Deliver a fix only once the device has moved this far. */
export const DISTANCE_INTERVAL_METRES = 250;

/** Never accept updates more often than this, however fast the device moves. */
export const MIN_TIME_INTERVAL_MS = 30 * 1000;

/** Cap on the offline backlog. */
const MAX_QUEUED = 200;

let subscription = null;
let currentTerritoryId = null;
let onTransition = null;

async function readQueue() {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    // A corrupt queue is not worth surfacing to a rider mid-shift; it means the
    // backlog is lost, not that the app should stop working.
    return [];
  }
}

async function writeQueue(items) {
  try {
    // Oldest dropped first if the cap is hit: a three-hour-old transition is
    // less useful than the one that just happened, and an unbounded queue on a
    // device with no signal for a day is a storage problem of its own.
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(items.slice(-MAX_QUEUED)));
  } catch {
    // Nothing useful to do; the live send below may still succeed.
  }
}

/** Queues a transition and tries to flush immediately. */
export async function recordTransition(transition) {
  const queued = await readQueue();
  queued.push({ ...transition, queued_at: Date.now() });
  await writeQueue(queued);

  await flushQueue();
}

/**
 * Sends everything queued, oldest first.
 *
 * Stops at the first failure rather than carrying on: if the network is down
 * the rest will fail too, and draining the queue against a dead connection
 * turns one failure into two hundred. Anything not sent stays queued.
 */
export async function flushQueue() {
  const queued = await readQueue();
  if (queued.length === 0) return { sent: 0, remaining: 0 };

  let state;
  try {
    state = await NetInfo.fetch();
  } catch {
    state = null;
  }

  // `isInternetReachable` is null while unknown; only a definite false means
  // there is no point trying.
  if (state && state.isConnected === false) {
    return { sent: 0, remaining: queued.length };
  }

  let sent = 0;
  for (const transition of queued) {
    try {
      await apiPost('/territories/transitions', {
        from_territory_id: transition.from_territory_id || null,
        to_territory_id: transition.to_territory_id || null,
        lat: transition.lat,
        lng: transition.lng,
        // The time of the crossing, not of the upload. Without this every
        // reconnection reports a rider leaving their zone at the moment their
        // signal came back, which makes the whole log useless for anything
        // anyone would want to ask of it.
        occurred_at: new Date(transition.at).toISOString(),
        mocked: transition.mocked === true,
      });
      sent += 1;
    } catch {
      break;
    }
  }

  const remaining = queued.slice(sent);
  await writeQueue(remaining);
  return { sent, remaining: remaining.length };
}

/**
 * Handles one position update from the watcher.
 *
 * Exported so the tests can drive it directly; a test that has to stand up an
 * expo-location subscription to check a decision is testing expo-location.
 */
export async function handlePosition(position) {
  const lat = position?.coords?.latitude;
  const lng = position?.coords?.longitude;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const mocked = position.mocked === true || position.coords?.mocked === true;

  // A spoofed fix is not allowed to move the app's territory. Attribution and
  // the franchise context follow from this, so accepting a mock provider's
  // word here would let a user select whichever franchise they preferred.
  if (mocked) return null;

  const result = await resolveTerritory();
  if (!result?.resolved || !result.territory) return null;

  const nextId = result.territory.id;
  if (nextId === currentTerritoryId) return null;

  const transition = {
    from_territory_id: currentTerritoryId,
    to_territory_id: nextId,
    lat,
    lng,
    at: Date.now(),
    mocked: false,
  };

  currentTerritoryId = nextId;

  await recordTransition(transition);
  if (onTransition) onTransition(transition, result);

  return transition;
}

/**
 * Starts watching. Idempotent — calling it twice does not open two watchers.
 *
 * `territoryId` seeds the current territory so the first update after a border
 * crossing is recognised as one rather than as the initial reading.
 */
export async function start({ territoryId = null, onChange = null } = {}) {
  if (subscription) return { started: false, reason: 'already_watching' };

  const { status } = await Location.getForegroundPermissionsAsync();
  if (status !== 'granted') {
    // Deliberately does not prompt: see territoryResolver for why a dialog
    // raised by a background refresh is the fastest route to a permanent no.
    return { started: false, reason: 'permission_not_granted' };
  }

  currentTerritoryId = territoryId;
  onTransition = onChange;

  subscription = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy?.Balanced ?? 3,
      distanceInterval: DISTANCE_INTERVAL_METRES,
      timeInterval: MIN_TIME_INTERVAL_MS,
    },
    (position) => { handlePosition(position); }
  );

  return { started: true };
}

/** Stops watching. Safe to call when not started. */
export async function stop() {
  if (subscription) {
    try {
      subscription.remove();
    } catch {
      // A subscription already torn down by the OS is not an error.
    }
    subscription = null;
  }
  onTransition = null;

  // One last attempt to drain anything queued while the app was in use.
  await flushQueue();
}

/** Test seam. */
export function __reset() {
  subscription = null;
  currentTerritoryId = null;
  onTransition = null;
}

export default {
  start,
  stop,
  handlePosition,
  recordTransition,
  flushQueue,
  __reset,
  DISTANCE_INTERVAL_METRES,
  MIN_TIME_INTERVAL_MS,
};

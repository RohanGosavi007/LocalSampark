/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Gate queue — offline-durable visitor entries for the security desk
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * A guard's post is a gate: a concrete box at the edge of a compound, often in
 * a basement or against a boundary wall, which is exactly where mobile signal
 * is worst. The gate console had no allowance for that at all — every entry was
 * a live POST, so a visitor arriving during a signal drop either could not be
 * logged or was logged after the fact with the wrong time, and the resident
 * upstairs was never alerted.
 *
 * ── Optimistic, then reconciled ────────────────────────────────────────────
 *
 * An entry is written locally and handed back immediately, so the guard can
 * wave the visitor through and move to the next person. It carries a
 * client-generated id and the time it actually happened. When connectivity
 * returns the queue drains oldest first, and the server keeps the *recorded*
 * time rather than the upload time — otherwise a reconnection stamps an hour of
 * backlogged arrivals with the same instant, and the gate register, which is
 * the only evidence of who was in the compound and when, becomes useless for
 * the one question anyone ever asks of it.
 *
 * ── Why the client id matters ──────────────────────────────────────────────
 *
 * A retried upload must not create a second visitor. The id is generated on the
 * device and sent with the entry, so the server can recognise a replay. Without
 * it a flaky connection produces duplicate gate entries, and a duplicate entry
 * is a visitor who appears never to have left.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { apiPost } from '../lib/api';

const QUEUE_KEY = '@localsampark_gate_queue';

/**
 * Cap on the backlog.
 *
 * A busy gate logs a few hundred entries a day. This is generous enough to hold
 * a full shift offline and small enough that a device with no signal for a week
 * does not become a storage problem.
 */
export const MAX_QUEUED = 500;

/** Entries are dropped oldest-first at the cap; a day-old arrival is spent. */
function trim(items) {
  return items.slice(-MAX_QUEUED);
}

/**
 * Serialises every read-modify-write of the queue.
 *
 * AsyncStorage has no compare-and-swap, so two overlapping mutations both read
 * the old list and the second write discards the first's entry. That is not
 * hypothetical here: recordEntry starts a background sync without awaiting it,
 * so a guard logging two visitors in quick succession had a drain running
 * against the same key as the next insert — and the lost write is a visitor
 * with no record of having entered.
 *
 * Every mutation goes through this chain, so they queue behind one another
 * instead of interleaving.
 */
let mutation = Promise.resolve();

function withQueueLock(work) {
  const next = mutation.then(work, work);
  // Keep the chain alive after a rejection, without swallowing it for the caller.
  mutation = next.then(() => undefined, () => undefined);
  return next;
}

function newId() {
  // Not crypto.randomUUID: React Native's global crypto is inconsistent across
  // Expo SDK versions and a gate entry must never fail for want of an id.
  return `gate-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

async function readQueue() {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    // A corrupt queue costs the backlog, not the shift.
    return [];
  }
}

async function writeQueue(items) {
  try {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(trim(items)));
    return true;
  } catch {
    return false;
  }
}

/**
 * Everything still waiting to reach the server.
 *
 * Takes the same lock as the writers. Reading straight through would let a
 * caller observe the queue midway through a drain — a count that is neither
 * what was there before nor what is there after, which is the worst possible
 * number to show a guard checking whether their shift has uploaded.
 */
export async function pending() {
  return withQueueLock(readQueue);
}

export async function pendingCount() {
  return (await pending()).length;
}

/**
 * Records a visitor at the gate.
 *
 * Returns the local entry straight away — the guard is not kept waiting on a
 * network round trip with a person standing in front of them — and attempts a
 * sync in the background.
 */
export async function recordEntry(entry) {
  const name = String(entry?.name || '').trim();
  const flat = String(entry?.flat || '').trim();

  // The two fields the server also insists on. Catching it here means the guard
  // is told at the gate rather than discovering it at the end of a shift when
  // the backlog is rejected.
  if (!name || !flat) {
    return { queued: false, reason: 'name_and_flat_required' };
  }

  const local = {
    clientId: entry.clientId || newId(),
    name,
    flat,
    phone: entry.phone || null,
    purpose: entry.purpose || 'guest',
    vehicleNumber: entry.vehicleNumber || null,
    photo: entry.photo || null,
    // The time the visitor actually arrived.
    recordedAt: entry.recordedAt || new Date().toISOString(),
    syncState: 'pending',
  };

  await withQueueLock(async () => {
    const queue = await readQueue();
    queue.push(local);
    await writeQueue(queue);
  });

  // Fire and forget: a slow or failing sync must not hold up the gate. It takes
  // the same lock, so it cannot interleave with the next entry.
  sync().catch(() => {});

  return { queued: true, entry: local };
}

/**
 * Sends everything queued, oldest first.
 *
 * Stops at the first network failure rather than continuing: if the connection
 * is down the rest will fail too, and draining a shift's backlog against a dead
 * link turns one failure into five hundred.
 *
 * A *rejected* entry is different from a failed one. The server refusing an
 * entry — a flat that does not exist, a society the guard no longer works at —
 * will refuse it again on every retry, so it is removed from the queue and
 * reported, rather than blocking everything behind it forever.
 */
export async function sync() {
  return withQueueLock(syncLocked);
}

async function syncLocked() {
  const queue = await readQueue();
  if (queue.length === 0) return { sent: 0, rejected: 0, remaining: 0 };

  let online = true;
  try {
    const state = await NetInfo.fetch();
    // `isInternetReachable` is null while unknown; only a definite false means
    // there is no point trying.
    if (state && state.isConnected === false) online = false;
  } catch {
    online = true;
  }

  if (!online) return { sent: 0, rejected: 0, remaining: queue.length };

  let sent = 0;
  const rejected = [];
  let index = 0;

  for (; index < queue.length; index++) {
    const item = queue[index];
    try {
      await apiPost('/society-management/visitors', {
        clientId: item.clientId,
        name: item.name,
        flat: item.flat,
        phone: item.phone,
        purpose: item.purpose,
        vehicleNumber: item.vehicleNumber,
        photo: item.photo,
        recordedAt: item.recordedAt,
      });
      sent += 1;
    } catch (err) {
      const status = err?.status || err?.statusCode;

      // 4xx other than 408/429 is the server's considered refusal, and it will
      // refuse the same entry next time. Drop it rather than wedging the queue.
      if (status && status >= 400 && status < 500 && status !== 408 && status !== 429) {
        rejected.push({ ...item, rejectedReason: err?.message || `HTTP ${status}` });
        continue;
      }

      break; // network or server trouble: stop and keep the rest
    }
  }

  const remaining = queue
    .slice(index)
    .filter((item) => !rejected.some((r) => r.clientId === item.clientId));

  await writeQueue(remaining);

  return { sent, rejected: rejected.length, rejectedEntries: rejected, remaining: remaining.length };
}

/**
 * Drains the queue whenever the device comes back online.
 *
 * Returns the unsubscribe function. A guard's phone reconnects as they walk
 * toward the building, and the backlog should go then rather than when someone
 * next opens the app.
 */
export function syncOnReconnect() {
  try {
    return NetInfo.addEventListener((state) => {
      if (state?.isConnected) sync().catch(() => {});
    });
  } catch {
    return () => {};
  }
}

/** Test seam, and the "discard backlog" action for a device being handed over. */
export async function clear() {
  try {
    await AsyncStorage.removeItem(QUEUE_KEY);
  } catch {
    // Nothing useful to do; the queue is already unreadable.
  }
}

export default {
  pending,
  pendingCount,
  recordEntry,
  sync,
  syncOnReconnect,
  clear,
  MAX_QUEUED,
};

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Spatial cache — geohash-bucketed territory resolution
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Territory resolution is on the hot path of nearly every screen: the shop
 * list, the home feed, checkout and lead capture all need to know which
 * territory a user is in before they can show anything. Resolving from scratch
 * means loading every verified boundary and running point-in-polygon across
 * them, which is fine once and wasteful ten thousand times an hour.
 *
 * ── Why a geohash and not just the coordinates ─────────────────────────────
 *
 * Raw coordinates are useless as a cache key: two users standing next to each
 * other produce different keys and neither ever hits. A geohash truncates
 * position to a cell, so everyone in the same block shares one entry.
 *
 * ── The rule that makes this safe ──────────────────────────────────────────
 *
 * A geohash cell is a rectangle, and a territory boundary does not respect it.
 * A cell straddling a boundary contains users of two different franchises, so
 * caching one answer for that cell would serve a user the *other* side of the
 * street's franchise — silently, with full confidence, and with commission
 * attributed accordingly. That is a worse failure than any cache miss.
 *
 * So a coordinate answer is cached only when the point is comfortably interior
 * to its territory: further from the boundary than the cell's own diagonal, so
 * every other point in the cell is provably in the same territory. Points near
 * an edge — the 50 m case — always resolve exactly, every time. The cache
 * accelerates the overwhelming majority of lookups that are nowhere near a
 * border and declines to answer for the ones that are.
 *
 * ── Storage ────────────────────────────────────────────────────────────────
 *
 * Redis when it is connected, an in-memory LRU when it is not. The Redis
 * helpers already degrade to no-op rather than throwing, and this layer must
 * never be the reason a request fails: every read is wrapped, and a cache
 * failure resolves the hard way rather than erroring.
 *
 * ── Invalidation ───────────────────────────────────────────────────────────
 *
 * Territory assignments change who is paid, so a stale entry is a payment to
 * the wrong partner. Rather than hunting keys across two stores, every key
 * carries a generation number; bumping the generation makes every existing
 * entry unreachable at once and lets Redis expire them on its own schedule.
 */

const { cacheGet, cacheSet } = require('../config/redis');
const logger = require('../config/logger');

/**
 * Geohash cell size, in characters.
 *
 * Precision 7 is roughly 153 m × 153 m at this latitude. Big enough that a
 * neighbourhood shares a handful of cells, small enough that the interior test
 * below still admits most points in a town-sized territory.
 */
const GEOHASH_PRECISION = 7;

/** Cell diagonal at precision 7, in kilometres. The interior margin. */
const CELL_DIAGONAL_KM = 0.217;

/** How long a resolved answer stays cached. */
const TTL_SECONDS = 10 * 60;

/** Entries held in memory when Redis is unavailable. */
const MEMORY_LIMIT = 5000;

const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';

let generation = 1;
const memory = new Map();

/**
 * Encodes a coordinate as a geohash.
 *
 * Implemented here rather than pulled in as a dependency: it is the standard
 * interleaved-bits algorithm, it is twenty lines, and the alternative is a
 * package in the hot path of every territory lookup.
 */
function geohash(lat, lng, precision = GEOHASH_PRECISION) {
  let latMin = -90;
  let latMax = 90;
  let lngMin = -180;
  let lngMax = 180;

  let hash = '';
  let bits = 0;
  let bit = 0;
  let even = true;

  while (hash.length < precision) {
    if (even) {
      const mid = (lngMin + lngMax) / 2;
      if (lng >= mid) {
        bit = (bit << 1) + 1;
        lngMin = mid;
      } else {
        bit = bit << 1;
        lngMax = mid;
      }
    } else {
      const mid = (latMin + latMax) / 2;
      if (lat >= mid) {
        bit = (bit << 1) + 1;
        latMin = mid;
      } else {
        bit = bit << 1;
        latMax = mid;
      }
    }

    even = !even;
    bits += 1;

    if (bits === 5) {
      hash += BASE32[bit];
      bits = 0;
      bit = 0;
    }
  }

  return hash;
}

function memoryGet(key) {
  const entry = memory.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    memory.delete(key);
    return null;
  }
  // Re-insert so the Map's insertion order doubles as recency for the eviction
  // below. Without this the oldest *written* entry is evicted rather than the
  // least recently used one, which throws away exactly the hot keys.
  memory.delete(key);
  memory.set(key, entry);
  return entry.value;
}

function memorySet(key, value) {
  if (memory.size >= MEMORY_LIMIT) {
    const oldest = memory.keys().next().value;
    if (oldest !== undefined) memory.delete(oldest);
  }
  memory.set(key, { value, expiresAt: Date.now() + TTL_SECONDS * 1000 });
}

async function read(key) {
  const local = memoryGet(key);
  if (local) return local;

  try {
    const remote = await cacheGet(key);
    if (remote) {
      // Populate the local tier too, so a burst of requests for one cell does
      // not make a Redis round trip each time.
      memorySet(key, remote);
      return remote;
    }
  } catch (err) {
    logger.warn('Spatial cache read failed, resolving directly: ' + err.message);
  }

  return null;
}

async function write(key, value) {
  memorySet(key, value);
  try {
    await cacheSet(key, value, TTL_SECONDS);
  } catch (err) {
    logger.warn('Spatial cache write failed: ' + err.message);
  }
}

const pincodeKey = (pincode) => `geo:v${generation}:pin:${pincode}`;
const cellKey = (hash) => `geo:v${generation}:cell:${hash}`;

/**
 * A cached answer for a pincode, or null.
 *
 * Pincodes are exact keys — a pincode either belongs to a territory or it does
 * not — so there is no interior test to apply here and no straddling to worry
 * about.
 */
async function getPincode(pincode) {
  if (!pincode) return null;
  return read(pincodeKey(pincode));
}

async function setPincode(pincode, resolution) {
  if (!pincode || !resolution || !resolution.resolved) return;
  await write(pincodeKey(pincode), resolution);
}

/**
 * A cached answer for a coordinate, or null.
 *
 * Only ever returns entries written by setCoordinate below, which applies the
 * interior test — so a hit here is already known to be safe for every point in
 * the cell.
 */
async function getCoordinate(lat, lng) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return read(cellKey(geohash(lat, lng)));
}

/**
 * Caches a coordinate answer, if and only if the whole cell shares it.
 *
 * `marginKm` is the resolved point's distance to the nearest boundary of the
 * territory it matched. When that margin exceeds the cell diagonal, every point
 * in the cell lies inside the same territory and one answer is correct for all
 * of them. Otherwise the cell straddles a border and nothing is written — the
 * next request for that cell resolves exactly, which is the entire point.
 *
 * Returns whether it cached, so callers and tests can see the decision rather
 * than infer it.
 */
async function setCoordinate(lat, lng, resolution, marginKm) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (!resolution || !resolution.resolved) return false;

  // An answer that did not come from real geometry has no meaningful margin,
  // and a centroid guess must not be frozen into a cell and handed out as
  // though it were a boundary match.
  if (resolution.method !== 'boundary') return false;

  if (!Number.isFinite(marginKm) || marginKm <= CELL_DIAGONAL_KM) return false;

  await write(cellKey(geohash(lat, lng)), resolution);
  return true;
}

/**
 * Makes every cached answer unreachable.
 *
 * Called whenever a territory is assigned, transferred or released. Bumping the
 * generation is O(1) and cannot half-succeed, which matters because the failure
 * mode of a partial invalidation is paying the previous franchise.
 */
function invalidate() {
  generation += 1;
  memory.clear();
}

/** Test seam: the current generation and memory tier size. */
function stats() {
  return { generation, memoryEntries: memory.size, cellDiagonalKm: CELL_DIAGONAL_KM };
}

module.exports = {
  geohash,
  getPincode,
  setPincode,
  getCoordinate,
  setCoordinate,
  invalidate,
  stats,
  GEOHASH_PRECISION,
  CELL_DIAGONAL_KM,
  TTL_SECONDS,
};

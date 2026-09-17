/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Boundary monitor — real-time zone-exit detection for delivery partners
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * A delivery partner who leaves their assigned franchise zone is worth telling
 * someone about: the franchise is paying for coverage they are not getting, and
 * the partner may simply not know where the line is. This turns a stream of
 * location pings into a small number of meaningful events.
 *
 * ── Hysteresis is the whole design ─────────────────────────────────────────
 *
 * The naive version — resolve every ping, fire an event whenever the answer
 * changes — is unusable in practice. Consumer GPS wanders by tens of metres
 * while a phone sits still, so a rider parked on a boundary line flips between
 * inside and outside every few seconds. That produces an alert storm on the
 * admin dashboard, a stream of push notifications to the rider, and within a
 * day everyone has learned to ignore both.
 *
 * Three things prevent it:
 *
 *   1. **A buffer.** Leaving is only leaving once the rider is more than
 *      EXIT_BUFFER_METRES beyond the boundary. Returning requires coming back
 *      inside by the same margin. The band between the two is where nothing
 *      happens, which is exactly where the jitter lives.
 *
 *   2. **Dwell time.** A rider must stay outside for MIN_DWELL_MS before an
 *      exit fires. Cutting a corner, or a single wild fix, does not count as
 *      leaving your zone.
 *
 *   3. **A cooldown.** Once an alert fires, the same rider cannot produce
 *      another for ALERT_COOLDOWN_MS. A rider legitimately working a boundary
 *      street generates one alert, not forty.
 *
 * ── Mocked fixes ───────────────────────────────────────────────────────────
 *
 * A fix flagged as coming from a mock provider is not evidence of anything. It
 * must not raise an alert, and — importantly — it must not *clear* one either:
 * otherwise the way to silence a zone-exit alert is to turn on a GPS spoofer,
 * which converts the anti-fraud signal into a fraud instruction.
 */

const { queryOne } = require('../config/database');
const spatial = require('../repositories/spatial.repository');
const geo = require('../utils/geo');
const logger = require('../config/logger');

/** How far beyond the boundary counts as genuinely outside. */
const EXIT_BUFFER_METRES = 150;

/** How long a rider must remain outside before an exit is reported. */
const MIN_DWELL_MS = 90 * 1000;

/** Minimum gap between two alerts for the same rider. */
const ALERT_COOLDOWN_MS = 10 * 60 * 1000;

/**
 * Per-rider state.
 *
 * In memory deliberately: this is a debounce window measured in minutes, not a
 * record. Losing it on restart means at worst one duplicate alert, which is a
 * far better trade than a Redis round trip on every location ping. The map is
 * pruned so a long-running process does not accumulate every rider who ever
 * connected.
 */
const riders = new Map();

const PRUNE_AFTER_MS = 60 * 60 * 1000;
let lastPrune = Date.now();

function prune(now) {
  if (now - lastPrune < PRUNE_AFTER_MS) return;
  lastPrune = now;
  for (const [id, state] of riders) {
    if (now - state.lastSeenAt > PRUNE_AFTER_MS) riders.delete(id);
  }
}

function stateFor(riderId) {
  let state = riders.get(riderId);
  if (!state) {
    state = {
      status: 'unknown',      // inside | outside | unknown
      outsideSince: null,
      lastAlertAt: 0,
      lastSeenAt: Date.now(),
      lastTerritoryId: null,
    };
    riders.set(riderId, state);
  }
  return state;
}

/** Forgets a rider — used when they go off shift, and by the tests. */
function reset(riderId = null) {
  if (riderId) riders.delete(riderId);
  else riders.clear();
}

/**
 * Whether a point is outside an assigned territory by more than the buffer.
 *
 * Returns `{ outside, marginMetres }`, or `{ outside: null }` when it cannot
 * tell — no verified boundary, unparseable geometry. Null is not "outside":
 * accusing a rider of leaving a zone whose shape nobody has verified would be
 * an alert generated entirely by missing data.
 */
async function outsideAssigned(territoryId, lat, lng) {
  // Verified boundaries only, and the repository enforces that: a territory
  // whose polygon is one of the quarantined fabricated circles returns no
  // containment answer, so no alert can be generated from it.
  const row = await queryOne(
    `SELECT id, name, pincode, boundary_geojson
       FROM territories
      WHERE id = $1 AND COALESCE(boundary_verified, 0) = 1`,
    [territoryId]
  );

  if (!row || !row.boundary_geojson) return { outside: null, marginMetres: null };

  const inside = await spatial.territoryContainsPoint(territoryId, lat, lng);

  const marginKm = spatial.distanceToBoundaryKm(row, lat, lng);
  const marginMetres = marginKm === null ? null : marginKm * 1000;

  if (marginMetres === null) return { outside: null, marginMetres: null };

  // Inside, or outside but still within the buffer band: not a crossing either
  // way. The band is where the GPS jitter lives.
  if (inside) return { outside: false, marginMetres };
  return { outside: marginMetres > EXIT_BUFFER_METRES, marginMetres };
}

/**
 * Processes one location ping.
 *
 * Returns an event to emit, or null when nothing has happened — which is the
 * overwhelmingly common case and the reason this is worth having.
 */
async function observe({
  riderId,
  assignedTerritoryId,
  lat,
  lng,
  mocked = false,
  now = Date.now(),
}) {
  if (!riderId || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  prune(now);
  const state = stateFor(riderId);
  state.lastSeenAt = now;

  if (mocked) {
    // Neither raises nor clears. Treating a spoofed fix as evidence of being
    // back inside would make a GPS spoofer the documented way to silence the
    // alert.
    return null;
  }

  if (!assignedTerritoryId) return null;

  let verdict;
  try {
    verdict = await outsideAssigned(assignedTerritoryId, lat, lng);
  } catch (err) {
    logger.warn(`Boundary monitor could not evaluate rider ${riderId}: ${err.message}`);
    return null;
  }

  // Cannot tell. Hold the existing state rather than inventing a transition.
  if (verdict.outside === null) return null;

  state.lastTerritoryId = assignedTerritoryId;

  if (verdict.outside) {
    if (state.status !== 'outside') {
      state.status = 'outside';
      state.outsideSince = now;
      return null; // dwell not yet satisfied
    }

    if (now - state.outsideSince < MIN_DWELL_MS) return null;
    if (now - state.lastAlertAt < ALERT_COOLDOWN_MS) return null;

    state.lastAlertAt = now;

    return {
      type: 'BOUNDARY_EXIT',
      rider_id: riderId,
      territory_id: assignedTerritoryId,
      lat,
      lng,
      metres_outside: Math.round(verdict.marginMetres),
      outside_for_seconds: Math.round((now - state.outsideSince) / 1000),
      at: new Date(now).toISOString(),
    };
  }

  // Back inside.
  const wasOutside = state.status === 'outside';
  const hadAlerted = wasOutside && state.outsideSince !== null
    && (now - state.outsideSince) >= MIN_DWELL_MS
    && state.lastAlertAt > 0;

  state.status = 'inside';
  state.outsideSince = null;

  // Only worth announcing a return if a departure was announced. Otherwise the
  // dashboard shows re-entries for exits nobody was told about.
  if (!hadAlerted) return null;

  return {
    type: 'BOUNDARY_RETURN',
    rider_id: riderId,
    territory_id: assignedTerritoryId,
    lat,
    lng,
    at: new Date(now).toISOString(),
  };
}

/** Distance between two pings, for callers that want to throttle by movement. */
function movedMetres(a, b) {
  return geo.distanceMetres(a.lat, a.lng, b.lat, b.lng);
}

module.exports = {
  observe,
  outsideAssigned,
  reset,
  movedMetres,
  EXIT_BUFFER_METRES,
  MIN_DWELL_MS,
  ALERT_COOLDOWN_MS,
};

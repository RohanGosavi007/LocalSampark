/**
 * Geodesic helpers — one implementation, used everywhere.
 *
 * This file exists because the same great-circle distance had been written out
 * eight times across shops, marketplace, campaigns, delivery, carpool,
 * recommendations, the ML ranker and advanced services. They agreed
 * mathematically — the `asin` and `atan2` forms of the haversine are the same
 * formula — but they did not agree on their guards, and a guard is where this
 * kind of duplication actually bites:
 *
 *   shop.routes.js: `if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;`
 *
 * That rejects a coordinate of exactly 0 as missing. India sits between roughly
 * 8°N and 37°N so it never fires here today, but it is the kind of guard that
 * is correct until the day the platform crosses the equator or the prime
 * meridian, and then is wrong silently — every shop at longitude 0 becomes
 * infinitely far from everything and drops out of every proximity search.
 *
 * The version below distinguishes "absent" from "zero" explicitly.
 *
 * ── On bounding boxes ──────────────────────────────────────────────────────
 *
 * Several callers pre-filter with `latitude BETWEEN $1 AND $2` before measuring
 * exactly. That is the right shape: the box is indexable and the haversine is
 * not, so the box cheaply discards almost everything and the exact measure runs
 * on what survives. `boundingBox` below computes that envelope correctly,
 * including the longitude degrees-per-km widening with latitude, which a
 * hand-rolled box usually forgets.
 */

const EARTH_RADIUS_KM = 6371;

const toRad = (deg) => (deg * Math.PI) / 180;

/** Whether a value is a usable coordinate component. Zero is usable. */
function isCoord(value) {
  return value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));
}

/**
 * Great-circle distance between two points, in kilometres.
 *
 * Returns `Infinity` when either point is incomplete, so a caller sorting by
 * distance puts unusable rows last instead of first — which is what returning
 * 0 or null would do.
 */
function distanceKm(lat1, lng1, lat2, lng2) {
  if (!isCoord(lat1) || !isCoord(lng1) || !isCoord(lat2) || !isCoord(lng2)) {
    return Infinity;
  }

  const φ1 = toRad(Number(lat1));
  const φ2 = toRad(Number(lat2));
  const dφ = toRad(Number(lat2) - Number(lat1));
  const dλ = toRad(Number(lng2) - Number(lng1));

  const h =
    Math.sin(dφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(dλ / 2) ** 2;

  // asin form: numerically better behaved than atan2 for the very short
  // distances this platform mostly deals in (metres between a user and a shop).
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Metres, for the boundary-proximity checks that think in metres. */
function distanceMetres(lat1, lng1, lat2, lng2) {
  const km = distanceKm(lat1, lng1, lat2, lng2);
  return km === Infinity ? Infinity : km * 1000;
}

/**
 * The lat/lng envelope containing every point within `radiusKm`.
 *
 * Meant as the indexable pre-filter in front of an exact distance measure, not
 * as an answer on its own: a box is not a circle, so it admits points in the
 * corners that are up to √2 times the radius away. Callers must still measure.
 *
 * Longitude degrees shrink as latitude rises, so the longitude span is divided
 * by cos(latitude). Omitting that — the common shortcut — makes the box too
 * narrow and silently drops real results at higher latitudes.
 */
function boundingBox(lat, lng, radiusKm) {
  const latDelta = radiusKm / 111.32;
  const cos = Math.cos(toRad(Number(lat)));
  // Guard the poles, where the division explodes and the box should be the
  // whole circle of longitude.
  const lngDelta = Math.abs(cos) < 1e-6 ? 180 : radiusKm / (111.32 * Math.abs(cos));

  return {
    minLat: Number(lat) - latDelta,
    maxLat: Number(lat) + latDelta,
    minLng: Number(lng) - lngDelta,
    maxLng: Number(lng) + lngDelta,
  };
}

/** Whether two points are within `metres` of each other. */
function isWithinMetres(lat1, lng1, lat2, lng2, metres) {
  return distanceMetres(lat1, lng1, lat2, lng2) <= metres;
}

module.exports = {
  EARTH_RADIUS_KM,
  isCoord,
  distanceKm,
  distanceMetres,
  boundingBox,
  isWithinMetres,
  toRad,
};

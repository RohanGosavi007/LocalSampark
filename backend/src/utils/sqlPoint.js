/**
 * A geographic point as SQL, from latitude and longitude that came off a request.
 *
 * The spatial columns here are written as ST_GeomFromText('POINT(lng lat)',
 * 4326): PostGIS evaluates it, and the SQLite driver rewrites exactly that
 * literal form into the text it stores. The driver's rewrite matches the
 * literal, not a bound parameter, so the two numbers have to appear in the
 * statement itself — which makes this the one place where request values are
 * spliced into SQL, and so the one place that must be certain they are numbers.
 *
 * Returns the SQL for the point, or the string NULL when either value is
 * missing, not a finite number, or outside the range of a coordinate. Longitude
 * comes first in WKT; the arguments are in the order people say them.
 */
function pointSql(latitude, longitude) {
  const missing = (v) => v === null || v === undefined || v === '';
  if (missing(latitude) || missing(longitude)) return 'NULL';

  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return 'NULL';
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return 'NULL';

  return `ST_GeomFromText('POINT(${lng} ${lat})', 4326)`;
}

module.exports = { pointSql };

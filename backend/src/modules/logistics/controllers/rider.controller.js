const { query, queryOne, queryMany } = require('../../../config/database');
const crypto = require('crypto');

// Statuses the rider app is allowed to set. The column is a bare TEXT with no
// CHECK constraint, so without this any string could be written and the
// dispatch engine's `status = 'available'` filters would silently stop matching.
const RIDER_STATUSES = ['offline', 'available', 'on_delivery'];

const ADMIN_ROLES = new Set(['admin', 'super_admin', 'territory_admin', 'moderator']);

function isAdmin(user) {
  return ADMIN_ROLES.has(String(user?.role || '').toLowerCase());
}

/**
 * Load the rider named in the URL and confirm the caller is allowed to act as
 * them.
 *
 * delivery_riders.id is a 'RIDER-<hex>' value and users.id is a UUID, so the
 * two cannot be compared directly. Migration 089 adds delivery_riders.user_id
 * and backfills it by phone number; that column is the link.
 *
 * Deliberately fails closed when user_id is NULL. An unlinked rider row cannot
 * be attributed to anyone, and treating "unknown owner" as "anyone may act"
 * is the hole this is meant to close. The error names the fix so an operator
 * hitting it knows to run the migration or link the account.
 *
 * @returns the rider row, or null after having sent a response
 */
async function loadOwnedRider(req, res) {
  const riderId = req.params.id;
  const rider = await queryOne('SELECT * FROM delivery_riders WHERE id = $1', [riderId]);

  if (!rider) {
    res.status(404).json({ success: false, message: 'Rider not found' });
    return null;
  }

  if (isAdmin(req.user)) return rider;

  if (!rider.user_id) {
    console.warn(`[riders] ${riderId} has no user_id; refusing to act on an unlinked rider.`);
    res.status(403).json({
      success: false,
      message: 'This rider account is not linked to a user. Contact support to link it.',
    });
    return null;
  }

  if (String(rider.user_id) !== String(req.user?.id)) {
    res.status(403).json({ success: false, message: 'You may only update your own rider profile.' });
    return null;
  }

  return rider;
}

// Get Rider Details
async function getRiderProfile(req, res, next) {
  try {
    // req.params.id, not req.user.id: delivery_riders.id is a RIDER-<hex>
    // value from a different id space than users.id, so preferring the user
    // id (as this did) would match zero rows and still report success once
    // the route required authentication.
    const riderId = req.params.id;
    const rider = await queryOne('SELECT * FROM delivery_riders WHERE id = $1', [riderId]);
    if (!rider) return res.status(404).json({ success: false, message: 'Rider not found' });
    res.json({ success: true, rider });
  } catch (error) { next(error); }
}

// Update Rider Status (Online/Offline)
async function updateRiderStatus(req, res, next) {
  try {
    const { status } = req.body;

    if (!RIDER_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${RIDER_STATUSES.join(', ')}`,
      });
    }

    const rider = await loadOwnedRider(req, res);
    if (!rider) return;

    // Keyed on rider.id. This was `req.user?.id || req.params.id`, and once the
    // route required authentication req.user.id was always set — so the UPDATE
    // matched zero rows on every call and still replied "Status updated".
    await query('UPDATE delivery_riders SET status = $1 WHERE id = $2', [status, rider.id]);
    res.json({ success: true, message: 'Status updated' });
  } catch (error) { next(error); }
}

// Update Location
async function updateLocation(req, res, next) {
  try {
    const { latitude, longitude, order_id } = req.body;

    const lat = Number(latitude);
    const lng = Number(longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      return res.status(400).json({ success: false, message: 'Valid latitude and longitude are required' });
    }

    const rider = await loadOwnedRider(req, res);
    if (!rider) return;

    // Same id-space bug as updateRiderStatus: rows were written against the
    // caller's user id, so live_tracking accumulated points for a rider_id that
    // matched no rider and the tracking map stayed empty.
    await query(
      'INSERT INTO live_tracking (rider_id, order_id, latitude, longitude) VALUES ($1, $2, $3, $4)',
      [rider.id, order_id || null, lat, lng]
    );

    // Broadcast live location to the order room via socket.io
    const io = req.app.get('io');
    if (io && order_id) {
      io.to(`order_${order_id}`).emit('RIDER_LOCATION_UPDATE', { latitude: lat, longitude: lng });
    }

    res.json({ success: true });
  } catch (error) { next(error); }
}

// Rider self-registration. Public by design — this is the onboarding entry
// point — but it takes an unverified name and phone, so it is rate-limited at
// the route and should be tied to a verified OTP before launch (GO-LIVE.md §7).
async function registerRider(req, res, next) {
  try {
    const { name, phone, vehicle_type, vehicle_number } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ success: false, message: 'name and phone are required' });
    }

    const id = `RIDER-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    // Link to the signed-in user when there is one, so riders onboarded from
    // inside the app are owned from the start and do not depend on the phone
    // backfill in migration 089.
    const userId = req.user?.id || null;

    await query(
      'INSERT INTO delivery_riders (id, name, phone, vehicle_type, vehicle_number, status, user_id) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [id, name, phone, vehicle_type || 'bike', vehicle_number || 'N/A', 'offline', userId]
    );
    res.json({ success: true, rider: { id, name, phone } });
  } catch (error) { next(error); }
}

module.exports = {
  getRiderProfile,
  updateRiderStatus,
  updateLocation,
  registerRider,
  // Exported for tests.
  RIDER_STATUSES,
};

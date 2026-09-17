/**
 * Real-time territory events.
 *
 * Two audiences, deliberately separated:
 *
 *   - **The franchise dashboard** subscribes to its own territory rooms and
 *     sees a rider leave its zone. The room name is derived from the partner's
 *     verified assignments on the server, never from what the client asks for —
 *     otherwise any authenticated socket could join `territory:<someone else's>`
 *     and watch a competitor's fleet, which is the same cross-franchise leak
 *     the HTTP routes were scoped to close and would reopen over a socket.
 *
 *   - **The rider** gets a warning on their own private room, because being
 *     told you have left your zone is useful and being told where every other
 *     rider is is not.
 */

const { query, queryOne } = require('../config/database');
const boundaryMonitor = require('../services/boundaryMonitor.service');
const logger = require('../config/logger');

const UNSCOPED_ROLES = ['super_admin', 'admin', 'territory_admin'];

const territoryRoom = (territoryId) => `territory:${territoryId}`;
const riderRoom = (riderId) => `rider:${riderId}`;

/**
 * The territory rooms a socket is actually entitled to.
 *
 * Administrators may watch everything. A franchise partner may watch only the
 * territories they hold, resolved from the database rather than taken from the
 * request.
 */
async function permittedRooms(socket) {
  const user = socket.user || {};
  if (user.isGuest) return [];

  const role = String(user.role || '').toLowerCase();
  if (UNSCOPED_ROLES.includes(role)) return ['territory:all'];

  try {
    const partner = await queryOne(
      'SELECT id FROM franchise_partners WHERE user_id = $1 LIMIT 1',
      [user.id || user.userId]
    );
    if (!partner) return [];

    const rows = await query(
      `SELECT territory_id FROM franchise_territories
        WHERE franchise_partner_id = $1 AND status = 'ACTIVE'`,
      [partner.id]
    );

    return (rows.rows || rows).map((r) => territoryRoom(r.territory_id));
  } catch (err) {
    logger.warn('Territory socket could not resolve permitted rooms: ' + err.message);
    return [];
  }
}

/**
 * Broadcasts a boundary event to the people entitled to see it.
 *
 * Exported so the HTTP location-update path can emit too — a rider's app may
 * be posting locations over REST rather than holding a socket open, and the
 * dashboard should not care which.
 */
function emitBoundaryEvent(io, event) {
  if (!io || !event) return;

  io.to(territoryRoom(event.territory_id)).emit('territory:boundary_event', event);
  io.to('territory:all').emit('territory:boundary_event', event);

  // The rider hears about their own crossing only.
  io.to(riderRoom(event.rider_id)).emit('territory:you_left_zone', {
    type: event.type,
    territory_id: event.territory_id,
    metres_outside: event.metres_outside,
    at: event.at,
  });
}

module.exports = (io, socket) => {
  /**
   * A dashboard asking to watch its territories.
   *
   * Takes no arguments on purpose. An earlier shape of this — `join_territory`
   * with an id — is precisely the leak described above.
   */
  socket.on('territory:watch', async () => {
    const rooms = await permittedRooms(socket);
    rooms.forEach((room) => socket.join(room));
    socket.emit('territory:watching', { rooms });
  });

  /** A rider subscribing to their own warnings. */
  socket.on('territory:rider_register', () => {
    const user = socket.user || {};
    if (user.isGuest || !user.id) return;
    socket.join(riderRoom(user.id));
  });

  /**
   * A location ping from a rider's device.
   *
   * The assigned territory is resolved server-side from the rider's identity;
   * accepting it from the payload would let a rider declare whichever zone
   * happens to contain them and never trigger an alert.
   */
  socket.on('territory:location', async (payload = {}) => {
    const user = socket.user || {};
    if (user.isGuest || !user.id) return;

    const lat = Number(payload.lat);
    const lng = Number(payload.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    try {
      const assignment = await queryOne(
        `SELECT ft.territory_id
           FROM franchise_territories ft
           JOIN franchise_partners fp ON fp.id = ft.franchise_partner_id
          WHERE fp.user_id = $1 AND ft.status = 'ACTIVE'
          LIMIT 1`,
        [user.id]
      );

      if (!assignment) return;

      const event = await boundaryMonitor.observe({
        riderId: user.id,
        assignedTerritoryId: assignment.territory_id,
        lat,
        lng,
        mocked: payload.mocked === true,
      });

      if (event) emitBoundaryEvent(io, event);
    } catch (err) {
      logger.warn('Territory location ping failed: ' + err.message);
    }
  });

  socket.on('territory:rider_offline', () => {
    const user = socket.user || {};
    if (user.id) boundaryMonitor.reset(user.id);
  });
};

module.exports.emitBoundaryEvent = emitBoundaryEvent;
module.exports.permittedRooms = permittedRooms;
module.exports.territoryRoom = territoryRoom;
module.exports.riderRoom = riderRoom;

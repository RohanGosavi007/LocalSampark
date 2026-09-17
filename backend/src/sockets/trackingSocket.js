const { canActAsShop, refuse } = require('./socketAuth');

/**
 * Fleet location and kitchen progress.
 *
 * Both handlers took `shopId` from the payload and acted on it with no check at
 * all, and the handshake degrades an unknown token to a guest rather than
 * refusing the connection — so any client could paint a fake rider onto any
 * shop's dashboard, or drive any order's kitchen progress bar.
 *
 * The KDS handler also used a bare `io.emit`, which delivers to every connected
 * socket on the platform. Putting the order id in the event *name* looks like
 * addressing, but it is not: socket.io hands the event to everyone, and any
 * client calling `socket.onAny` observes every order's progress across every
 * shop. Rooms are the actual addressing mechanism.
 */
module.exports = (io, socket) => {
  // Fleet asset location updates, from the shop that owns the asset.
  socket.on('fleet_location_update', async (payload = {}) => {
    const { shopId, assetId, lat, lng } = payload;

    if (!(await canActAsShop(socket, shopId))) {
      return refuse(socket, 'fleet_location_update');
    }

    if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) {
      return refuse(socket, 'fleet_location_update', 'invalid_coordinates');
    }

    io.to(`shop_${shopId}`).emit(`asset_location_${assetId}`, {
      lat: Number(lat),
      lng: Number(lng),
    });
  });

  // Kitchen display progress, from the kitchen.
  socket.on('kds_progress_update', async (payload = {}) => {
    const { shopId, orderId, progressPct } = payload;

    if (!(await canActAsShop(socket, shopId))) {
      return refuse(socket, 'kds_progress_update');
    }

    const pct = Number(progressPct);
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
      return refuse(socket, 'kds_progress_update', 'invalid_progress');
    }

    // To the customer tracking this order and to the shop's own dashboards —
    // not to the whole platform.
    io.to(`order_${orderId}`).to(`order:${orderId}`).emit(`order_progress_${orderId}`, { progressPct: pct });
    io.to(`shop_${shopId}`).emit('kds_progress', { orderId, progressPct: pct });
  });
};

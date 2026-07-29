const H3FleetService = require('./h3.fleet');

/**
 * 10x WebSocket Live Location Tracking Gateway
 * Real-time driver location broadcast engine for active customer orders.
 */
class TrackingGateway {
  /**
   * Broadcast location update from driver
   */
  static async handleLocationUpdate(io, driverId, orderId, lat, lng) {
    // 1. Update memory spatial index
    const locationData = await H3FleetService.updateDriverLocation(driverId, lat, lng);

    // 2. Broadcast to specific Order Room via Socket.io
    if (io && orderId) {
      io.to(`order_${orderId}`).emit('driver_location_update', {
        driverId,
        orderId,
        lat,
        lng,
        timestamp: locationData.updatedAt
      });
    }

    return locationData;
  }
}

module.exports = TrackingGateway;

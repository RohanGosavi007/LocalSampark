/**
 * Real-Time Order & Delivery Tracking Gateway
 * Handles WebSocket driver location streaming & customer tracking subscriptions
 */
class TrackingGateway {
  constructor(server) {
    this.connections = new Map();
    this.driverLocations = new Map();
  }

  /**
   * Broadcast driver GPS location update to active order tracking rooms
   */
  broadcastDriverLocation(orderId, locationData) {
    const payload = {
      orderId,
      lat: locationData.lat,
      lng: locationData.lng,
      heading: locationData.heading || 0,
      speed: locationData.speed || 0,
      timestamp: new Date().toISOString()
    };

    this.driverLocations.set(orderId, payload);

    console.log(`[TrackingGateway] Broadcast location for order ${orderId}: (${locationData.lat}, ${locationData.lng})`);
    return payload;
  }

  /**
   * Get latest active location for an order
   */
  getLatestLocation(orderId) {
    return this.driverLocations.get(orderId) || null;
  }
}

module.exports = TrackingGateway;

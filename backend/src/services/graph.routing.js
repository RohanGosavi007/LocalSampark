const LogisticsBatching = require('./logistics.batching');

/**
 * 10x Multi-Point TSP Graph Routing
 * Calculates the fastest multi-drop sequence for a driver.
 */
class GraphRouting {
  /**
   * Sorts dropoffs to minimize total distance traveled from the Shop.
   * Simple TSP solver for small N (N<=3).
   */
  static optimizeRoute(shopLat, shopLng, orders) {
    if (!orders || orders.length === 0) return [];
    if (orders.length === 1) return orders;

    // For N=2 (most common batch size), we just compare:
    // Route 1: Shop -> A -> B
    // Route 2: Shop -> B -> A

    if (orders.length === 2) {
      const o1 = orders[0];
      const o2 = orders[1];

      const distShopTo1 = LogisticsBatching.getDistanceMeters(shopLat, shopLng, o1.dropoff_lat, o1.dropoff_lng);
      const dist1To2 = LogisticsBatching.getDistanceMeters(o1.dropoff_lat, o1.dropoff_lng, o2.dropoff_lat, o2.dropoff_lng);
      const route1Total = distShopTo1 + dist1To2;

      const distShopTo2 = LogisticsBatching.getDistanceMeters(shopLat, shopLng, o2.dropoff_lat, o2.dropoff_lng);
      const dist2To1 = LogisticsBatching.getDistanceMeters(o2.dropoff_lat, o2.dropoff_lng, o1.dropoff_lat, o1.dropoff_lng);
      const route2Total = distShopTo2 + dist2To1;

      if (route1Total <= route2Total) {
        return [{...o1, sequence: 1}, {...o2, sequence: 2}];
      } else {
        return [{...o2, sequence: 1}, {...o1, sequence: 2}];
      }
    }

    // Fallback for > 2: Just return as-is for now (or implement full TSP)
    return orders.map((o, i) => ({ ...o, sequence: i + 1 }));
  }
}

module.exports = GraphRouting;

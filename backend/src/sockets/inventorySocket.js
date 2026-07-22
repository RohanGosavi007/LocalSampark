/**
 * Real-Time Inventory Socket Handler
 * Handles real-time stock updates for local shop inventory to prevent overselling.
 */

module.exports = (io, socket) => {
  // Allow clients to subscribe to a specific shop's inventory updates
  socket.on('subscribe_inventory', (shopId) => {
    if (shopId) {
      socket.join(`shop_${shopId}`);
      console.log(`[InventorySocket] Client ${socket.id} subscribed to inventory for shop_${shopId}`);
    }
  });

  // Allow clients to unsubscribe
  socket.on('unsubscribe_inventory', (shopId) => {
    if (shopId) {
      socket.leave(`shop_${shopId}`);
      console.log(`[InventorySocket] Client ${socket.id} unsubscribed from inventory for shop_${shopId}`);
    }
  });
};

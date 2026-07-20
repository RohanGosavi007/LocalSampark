module.exports = (io, socket) => {
  // Listen for new orders placed by a visitor
  socket.on('visitor_place_order', (payload) => {
    const { shopId, order } = payload;
    // Broadcast to the merchant's room
    io.to(`shop_${shopId}`).emit('merchant_new_order', order);
  });

  // Listen for merchant updating order status (e.g. Kanban drag-and-drop)
  socket.on('merchant_update_order_status', (payload) => {
    const { shopId, orderId, status } = payload;
    // Broadcast to the specific visitor tracking the order
    io.emit(`order_status_${orderId}`, { status });
  });
};

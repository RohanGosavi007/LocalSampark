const { canActAsShop, canActOnOrder, refuse } = require('./socketAuth');

/**
 * Order placement and status broadcasting.
 *
 * Neither handler checked anything. `visitor_place_order` let any client inject
 * a fabricated order into any merchant's dashboard, and
 * `merchant_update_order_status` let any client tell any customer that their
 * order had been delivered — both with a shop id taken from the payload.
 *
 * `merchant_update_order_status` also used a bare `io.emit`, which reaches
 * every connected socket. The order id in the event name is not addressing:
 * any client calling `socket.onAny` saw every order status change on the
 * platform. Rooms do the addressing now.
 *
 * Note that these handlers notify; they do not persist. The HTTP routes remain
 * the place a status actually changes, which is why the authorisation here
 * mirrors theirs rather than replacing it.
 */
module.exports = (io, socket) => {
  socket.on('visitor_place_order', async (payload = {}) => {
    const { shopId, order } = payload;
    if (!shopId || !order) return refuse(socket, 'visitor_place_order', 'missing_fields');

    // The customer who placed it may announce it; so may the shop. An
    // unauthenticated socket may not, which is what stopped a stranger
    // injecting fabricated tickets into a merchant's dashboard.
    const permitted = (await canActOnOrder(socket, order.id)) || (await canActAsShop(socket, shopId));
    if (!permitted) return refuse(socket, 'visitor_place_order');

    io.to(`shop_${shopId}`).to(`shop:${shopId}`).to(`room:shop:${shopId}`).emit('merchant_new_order', order);
  });

  socket.on('merchant_update_order_status', async (payload = {}) => {
    const { shopId, orderId, status } = payload;
    if (!orderId || !status) return refuse(socket, 'merchant_update_order_status', 'missing_fields');

    if (!(await canActAsShop(socket, shopId))) {
      return refuse(socket, 'merchant_update_order_status');
    }

    io.to(`order_${orderId}`).to(`order:${orderId}`).emit('order_status_update', { orderId, status });
    io.to(`order_${orderId}`).to(`order:${orderId}`).emit(`order_status_${orderId}`, { orderId, status });
    io.to(`shop_${shopId}`).emit('shop_order_status', { orderId, status });
  });
};

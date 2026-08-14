module.exports = (io, socket) => {
  // Listen for merchant calling the next token
  socket.on('merchant_call_next_token', (payload) => {
    const { shopId, currentToken } = payload;
    // Broadcast the new current token to all visitors in the shop's queue room
    io.to(`shop_${shopId}`).to(`shop:${shopId}`).to(`room:shop:${shopId}`).emit('queue_updated', { currentToken, shopId });
  });

  // Listen for visitor joining a queue
  socket.on('visitor_join_queue', (payload) => {
    const { shopId, myToken } = payload;
    io.to(`shop_${shopId}`).to(`shop:${shopId}`).to(`room:shop:${shopId}`).emit('queue_visitor_joined', { newVisitorToken: myToken, shopId });
  });
};

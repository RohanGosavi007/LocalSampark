module.exports = (io, socket) => {
  // Listen for fleet asset location updates
  socket.on('fleet_location_update', (payload) => {
    const { shopId, assetId, lat, lng } = payload;
    // Broadcast location to the merchant's dashboard
    io.to(`shop_${shopId}`).emit(`asset_location_${assetId}`, { lat, lng });
  });

  // Listen for kitchen KDS progress
  socket.on('kds_progress_update', (payload) => {
    const { shopId, orderId, progressPct } = payload;
    io.emit(`order_progress_${orderId}`, { progressPct });
  });
};

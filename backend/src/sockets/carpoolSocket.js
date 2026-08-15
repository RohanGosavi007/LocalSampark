// Carpool Real-Time Socket Handler
// Powers: Live map tracking, bid updates, SOS broadcast, ride chat

module.exports = function carpoolSocket(io, socket) {
  // ═══ LIVE LOCATION TRACKING ═══
  // Driver broadcasts location every 10s during active ride
  socket.on('carpool:location_update', (data) => {
    const { ride_id, latitude, longitude, speed, heading } = data;
    if (!ride_id || !latitude || !longitude) return;

    // Broadcast to all passengers watching this ride
    io.to(`ride_${ride_id}`).emit('carpool:driver_location', {
      ride_id,
      latitude,
      longitude,
      speed: speed || 0,
      heading: heading || 0,
      timestamp: Date.now(),
      user_id: socket.user?.id
    });

    // Store in DB asynchronously (fire-and-forget)
    try {
      const { query } = require('../../config/database');
      query(
        `INSERT INTO carpool_live_locations (ride_id, user_id, latitude, longitude, speed, heading) VALUES ($1, $2, $3, $4, $5, $6)`,
        [ride_id, socket.user?.id, latitude, longitude, speed || 0, heading || 0]
      ).catch(() => {});
    } catch (e) {}
  });

  // Join ride tracking room
  socket.on('carpool:join_ride', (data) => {
    const { ride_id } = data;
    if (!ride_id) return;
    socket.join(`ride_${ride_id}`);
    console.log(`[Carpool] ${socket.user?.id || socket.id} joined ride_${ride_id}`);
    socket.emit('carpool:joined', { ride_id, status: 'tracking' });
  });

  // Leave ride tracking room
  socket.on('carpool:leave_ride', (data) => {
    const { ride_id } = data;
    if (ride_id) socket.leave(`ride_${ride_id}`);
  });

  // ═══ REAL-TIME BID UPDATES ═══
  socket.on('carpool:new_bid', (data) => {
    const { ride_id, bid_amount, bidder_name, seats_requested } = data;
    // Notify the ride driver
    io.to(`ride_${ride_id}`).emit('carpool:bid_received', {
      ride_id,
      bid_amount,
      bidder_name: bidder_name || 'Passenger',
      bidder_id: socket.user?.id,
      seats_requested: seats_requested || 1,
      timestamp: Date.now()
    });
  });

  // Driver responds to bid
  socket.on('carpool:bid_response', (data) => {
    const { ride_id, bid_id, status, counter_amount } = data;
    io.to(`ride_${ride_id}`).emit('carpool:bid_updated', {
      ride_id, bid_id, status, counter_amount,
      responder_id: socket.user?.id,
      timestamp: Date.now()
    });
  });

  // ═══ SOS BROADCAST ═══
  socket.on('carpool:sos', (data) => {
    const { ride_id, latitude, longitude, message } = data;
    // Broadcast to all ride participants + admin channel
    io.to(`ride_${ride_id}`).emit('carpool:sos_alert', {
      ride_id,
      sender_id: socket.user?.id,
      latitude, longitude,
      message: message || 'Emergency SOS triggered!',
      timestamp: Date.now()
    });
    // Also emit to admin SOS monitoring channel
    io.to('admin_sos').emit('carpool:sos_alert', {
      ride_id, sender_id: socket.user?.id,
      latitude, longitude, message,
      timestamp: Date.now()
    });
  });

  // ═══ IN-RIDE CHAT ═══
  socket.on('carpool:chat_message', (data) => {
    const { ride_id, message, message_type } = data;
    if (!ride_id || !message) return;
    const payload = {
      ride_id,
      sender_id: socket.user?.id,
      sender_name: socket.user?.full_name || 'User',
      message,
      message_type: message_type || 'text',
      timestamp: Date.now()
    };
    io.to(`ride_${ride_id}`).emit('carpool:new_message', payload);

    // Persist to DB
    try {
      const { query } = require('../../config/database');
      const crypto = require('crypto');
      query(
        `INSERT INTO carpool_chat_messages (id, ride_id, sender_id, message, message_type) VALUES ($1, $2, $3, $4, $5)`,
        [crypto.randomUUID(), ride_id, socket.user?.id, message, message_type || 'text']
      ).catch(() => {});
    } catch (e) {}
  });

  // ═══ RIDE STATUS UPDATES ═══
  socket.on('carpool:ride_status', (data) => {
    const { ride_id, status } = data;
    io.to(`ride_${ride_id}`).emit('carpool:status_changed', {
      ride_id, status,
      changed_by: socket.user?.id,
      timestamp: Date.now()
    });
  });

  // Join admin SOS monitoring
  socket.on('carpool:join_admin_sos', () => {
    socket.join('admin_sos');
  });
};

// Marketplace Real-Time Socket Handler
// Powers: Auction countdown, live bids, chat, price drop alerts

module.exports = function marketplaceSocket(io, socket) {
  // ═══ AUCTION REAL-TIME ═══
  socket.on('marketplace:join_auction', (data) => {
    const { auction_id, listing_id } = data;
    const room = `auction_${auction_id || listing_id}`;
    socket.join(room);
    socket.emit('marketplace:auction_joined', { room });
  });

  socket.on('marketplace:place_bid', (data) => {
    const { auction_id, listing_id, bid_amount, bidder_name } = data;
    const room = `auction_${auction_id || listing_id}`;
    io.to(room).emit('marketplace:bid_placed', {
      auction_id, listing_id, bid_amount,
      bidder_id: socket.user?.id,
      bidder_name: bidder_name || 'Buyer',
      timestamp: Date.now()
    });
  });

  socket.on('marketplace:auction_ending', (data) => {
    const { auction_id, listing_id, seconds_remaining } = data;
    const room = `auction_${auction_id || listing_id}`;
    io.to(room).emit('marketplace:countdown', {
      auction_id, seconds_remaining, timestamp: Date.now()
    });
  });

  // ═══ SELLER-BUYER CHAT ═══
  socket.on('marketplace:join_chat', (data) => {
    const { listing_id, chat_room_id } = data;
    const room = `mkt_chat_${chat_room_id || listing_id}`;
    socket.join(room);
  });

  socket.on('marketplace:send_message', (data) => {
    const { listing_id, chat_room_id, message, message_type } = data;
    const room = `mkt_chat_${chat_room_id || listing_id}`;
    const payload = {
      listing_id, sender_id: socket.user?.id,
      sender_name: socket.user?.full_name || 'User',
      message, message_type: message_type || 'text',
      timestamp: Date.now()
    };
    io.to(room).emit('marketplace:new_message', payload);

    // Persist
    try {
      const { query } = require('../../config/database');
      const crypto = require('crypto');
      query(
        `INSERT INTO marketplace_chat_messages (id, listing_id, sender_id, message, message_type) VALUES ($1, $2, $3, $4, $5)`,
        [crypto.randomUUID(), listing_id, socket.user?.id, message, message_type || 'text']
      ).catch(() => {});
    } catch (e) {}
  });

  // ═══ OFFER NEGOTIATION REAL-TIME ═══
  socket.on('marketplace:offer_update', (data) => {
    const { listing_id, offer_id, status, counter_amount } = data;
    io.to(`mkt_chat_${listing_id}`).emit('marketplace:offer_changed', {
      listing_id, offer_id, status, counter_amount,
      by: socket.user?.id, timestamp: Date.now()
    });
  });

  // ═══ PRICE DROP NOTIFICATION ═══
  socket.on('marketplace:watch_price', (data) => {
    const { listing_id } = data;
    socket.join(`mkt_price_${listing_id}`);
  });
};

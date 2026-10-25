// Marketplace Real-Time Socket Handler
// Powers: Auction countdown, live bids, chat, price drop alerts

const crypto = require('crypto');
const { query, queryOne } = require('../config/database');

/**
 * The conversation a socket may speak in, or null.
 *
 * A marketplace chat is between one buyer and the listing's seller, and
 * marketplace_chats records exactly that. Which conversation an event belongs
 * to is therefore something to look up, not something to take from the event:
 *
 *   - `chatRoomId`, if the user is the buyer or the seller of that chat;
 *   - otherwise the user's own conversation about `listingId`, as its buyer;
 *   - otherwise, with `create`, a new conversation — but only for someone who
 *     is not the seller. A seller has one conversation per buyer and has to say
 *     which; only a buyer's first message can open one.
 *
 * Guests have no account to be a party with and never resolve.
 */
async function resolveChat(user, { chatRoomId, listingId }, { create = false, firstMessage = null } = {}) {
  if (!user || !user.id || user.isGuest) return null;
  const userId = String(user.id);

  if (chatRoomId) {
    const chat = await queryOne(
      'SELECT id, listing_id, buyer_id, seller_id FROM marketplace_chats WHERE id = $1',
      [chatRoomId]
    );
    if (chat && [String(chat.buyer_id), String(chat.seller_id)].includes(userId)) return chat;
    // A chat id the user is not in falls through to the listing, never to the chat.
  }

  if (!listingId) return null;

  const own = await queryOne(
    'SELECT id, listing_id, buyer_id, seller_id FROM marketplace_chats WHERE listing_id = $1 AND buyer_id = $2',
    [listingId, user.id]
  );
  if (own) return own;
  if (!create) return null;

  const listing = await queryOne('SELECT seller_id FROM marketplace_listings WHERE id = $1', [listingId]);
  if (!listing || String(listing.seller_id) === userId) return null;

  const id = crypto.randomUUID();
  await query(
    `INSERT INTO marketplace_chats (id, listing_id, buyer_id, seller_id, last_message, last_message_at)
     VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
    [id, listingId, user.id, listing.seller_id, firstMessage]
  );
  return { id, listing_id: listingId, buyer_id: user.id, seller_id: listing.seller_id, created: true };
}

const chatRoom = (chatId) => `mkt_chat_${chatId}`;

module.exports = function marketplaceSocket(io, socket) {
  // ═══ AUCTION REAL-TIME ═══
  socket.on('marketplace:join_auction', (data) => {
    const { auction_id, listing_id } = data;
    const room = `auction_${auction_id || listing_id}`;
    socket.join(room);
    socket.emit('marketplace:auction_joined', { room });
  });

    // Two handlers stood here that re-broadcast whatever a client sent:
  // 'marketplace:place_bid' announced a bid of any amount to everyone watching
  // an auction without recording it, and 'marketplace:auction_ending' sent
  // any countdown. Any connection — a guest's included — could fake a bidding
  // war or an auction about to close. No app sent either. Bids are placed with
  // POST /marketplace/auctions/:id/bid, which records the bid and then emits
  // 'marketplace:bid_placed' to the room itself; the time left comes from
  // GET /marketplace/auctions/:id.

  // ═══ SELLER-BUYER CHAT ═══
  //
  // A room is one conversation, and a socket is only ever put in a room it has
  // been checked into.
  //
  // The room used to be `mkt_chat_<chat_room_id || listing_id>` taken straight
  // from the event, with no check on either handler. Joining needed nothing but
  // an id, so anyone — a guest connection included — could sit in another
  // pair's conversation and read it, or send into it under their own name. And
  // because the fallback room was the listing's, every buyer asking about the
  // same item shared one room and saw each other's messages to the seller.
  socket.on('marketplace:join_chat', async (data) => {
    try {
      const { listing_id, chat_room_id } = data || {};
      const chat = await resolveChat(socket.user, { chatRoomId: chat_room_id, listingId: listing_id });
      // No conversation yet is not an error: a buyer's first message opens one
      // and joins them to it.
      if (chat) socket.join(chatRoom(chat.id));
      socket.emit('marketplace:chat_joined', { listing_id, chat_room_id: chat ? chat.id : null });
    } catch (e) {
      console.error('Failed to join marketplace chat:', e.message);
    }
  });

  socket.on('marketplace:send_message', async (data) => {
    try {
      const { listing_id, chat_room_id, message, message_type } = data || {};
      if (!message || !String(message).trim()) return;

      const chat = await resolveChat(
        socket.user,
        { chatRoomId: chat_room_id, listingId: listing_id },
        { create: true, firstMessage: message }
      );
      if (!chat) {
        socket.emit('marketplace:chat_error', { listing_id, error: 'You are not part of this conversation.' });
        return;
      }

      // Stored before it is announced, so nobody is shown a message that a
      // reload would not bring back. It used to go out first and then fail to
      // save: the module path was wrong, then the column was, then chat_id —
      // which is NOT NULL — was missing, and each failure was swallowed.
      const messageId = crypto.randomUUID();
      await query(
        `INSERT INTO marketplace_chat_messages (id, chat_id, listing_id, sender_id, message, message_type)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [messageId, chat.id, chat.listing_id || listing_id || null, socket.user.id, message, message_type || 'text']
      );
      if (!chat.created) {
        await query(
          'UPDATE marketplace_chats SET last_message = $1, last_message_at = CURRENT_TIMESTAMP WHERE id = $2',
          [message, chat.id]
        );
      }

      socket.join(chatRoom(chat.id));
      io.to(chatRoom(chat.id)).emit('marketplace:new_message', {
        id: messageId,
        chat_room_id: chat.id,
        listing_id: chat.listing_id || listing_id,
        sender_id: socket.user.id,
        sender_name: socket.user.full_name || 'User',
        message,
        message_type: message_type || 'text',
        timestamp: Date.now()
      });
    } catch (e) {
      console.error('Failed to send marketplace chat message:', e.message);
      socket.emit('marketplace:chat_error', { error: 'Message could not be sent.' });
    }
  });

  // ═══ OFFER NEGOTIATION REAL-TIME ═══
  // To the conversation's two parties, and only from one of them. This went to
  // the listing-wide room from whoever sent it, so any connection could tell
  // every interested buyer that an offer had been accepted.
  socket.on('marketplace:offer_update', async (data) => {
    try {
      const { listing_id, chat_room_id, offer_id, status, counter_amount } = data || {};
      const chat = await resolveChat(socket.user, { chatRoomId: chat_room_id, listingId: listing_id });
      if (!chat) return;
      io.to(chatRoom(chat.id)).emit('marketplace:offer_changed', {
        listing_id: chat.listing_id || listing_id, chat_room_id: chat.id, offer_id, status, counter_amount,
        by: socket.user.id, timestamp: Date.now()
      });
    } catch (e) {
      console.error('Failed to relay marketplace offer update:', e.message);
    }
  });

  // ═══ PRICE DROP NOTIFICATION ═══
  socket.on('marketplace:watch_price', (data) => {
    const { listing_id } = data;
    socket.join(`mkt_price_${listing_id}`);
  });
};

module.exports.resolveChat = resolveChat;

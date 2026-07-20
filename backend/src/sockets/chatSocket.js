/**
 * CHAT SOCKET — Real-time shop ↔ visitor messaging
 */
const logger = require('../config/logger');

function register(io, socket) {
  // ── Send message ──
  socket.on('chat:send', (data) => {
    const { shopId, message, senderType } = data;
    const senderId = socket.user?.id;

    const payload = {
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      shopId,
      senderId,
      senderType: senderType || (socket.user?.shopId ? 'merchant' : 'visitor'),
      message,
      timestamp: new Date().toISOString(),
      read: false,
    };

    // Broadcast to the shop room (both merchant and visitor see it)
    io.to(`shop:${shopId}`).emit('chat:message', payload);

    logger.info(`💬 Chat in shop ${shopId}: ${senderType} sent message`);
  });

  // ── Typing indicator ──
  socket.on('chat:typing', (data) => {
    const { shopId, isTyping } = data;
    socket.to(`shop:${shopId}`).emit('chat:typing', {
      userId: socket.user?.id,
      senderType: socket.user?.shopId ? 'merchant' : 'visitor',
      isTyping,
    });
  });

  // ── Mark messages as read ──
  socket.on('chat:read', (data) => {
    const { shopId, messageIds } = data;
    io.to(`shop:${shopId}`).emit('chat:read_receipt', {
      readBy: socket.user?.id,
      messageIds,
      timestamp: new Date().toISOString(),
    });
  });
}

module.exports = { register };

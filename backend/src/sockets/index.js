const socketIo = require('socket.io');
const orderSocket = require('./orderSocket');
const tokenQueueSocket = require('./tokenQueueSocket');
const trackingSocket = require('./trackingSocket');
const chatSocket = require('./chatSocket');
const inventorySocket = require('./inventorySocket');

let io;

const initSockets = (server) => {
  io = socketIo(server, {
    cors: {
      origin: '*', // Adjust for production
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    console.log(`[Socket.io] Client connected: ${socket.id}`);

    // Allow clients to join shop-specific rooms for private broadcast
    socket.on('join_shop_room', (shopId) => {
      socket.join(`shop_${shopId}`);
      socket.join(`shop:${shopId}`); 
      socket.join(`room:shop:${shopId}`);
      console.log(`[Socket.io] Client joined room:shop:${shopId}`);
    });

    orderSocket(io, socket);
    tokenQueueSocket(io, socket);
    trackingSocket(io, socket);
    chatSocket.register(io, socket);
    inventorySocket(io, socket);

    socket.on('disconnect', () => {
      console.log(`[Socket.io] Client disconnected: ${socket.id}`);
    });
  });

  return io;
};

const getIo = () => {
  if (!io) throw new Error("Socket.io not initialized");
  return io;
};

module.exports = { initSocketIO: initSockets, getIo };

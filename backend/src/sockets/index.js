const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const orderSocket = require('./orderSocket');
const tokenQueueSocket = require('./tokenQueueSocket');
const trackingSocket = require('./trackingSocket');
const chatSocket = require('./chatSocket');
const inventorySocket = require('./inventorySocket');
const carpoolSocket = require('./carpoolSocket');
const marketplaceSocket = require('./marketplaceSocket');
const jobsSocket = require('./jobsSocket');

let io;

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:5000',
  process.env.CLIENT_URL,
  process.env.ADMIN_URL
].filter(Boolean);

const initSockets = (server) => {
  io = socketIo(server, {
    cors: {
      origin: process.env.NODE_ENV === 'production' ? allowedOrigins : '*',
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  // Authentication Middleware (Optional Auth: supports authenticated users and guest trackers)
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
      if (!token) {
        socket.user = { isGuest: true, id: `guest_${socket.id.substring(0, 8)}` };
        return next();
      }
      
      const secret = process.env.JWT_SECRET || 'localsampark_jwt_secret_dev';
      const decoded = jwt.verify(token, secret);
      socket.user = decoded;
      next();
    } catch (error) {
      // Degrade gracefully to guest session instead of killing socket connection
      socket.user = { isGuest: true, id: `guest_${socket.id.substring(0, 8)}` };
      next();
    }
  });

  io.on('connection', (socket) => {
    console.log(`[Socket.io] Authenticated Client connected: ${socket.id} (User: ${socket.user?.id})`);

    // Allow clients to join shop-specific rooms for private broadcast
    socket.on('join_shop_room', (shopId) => {
      socket.join(`shop_${shopId}`);
      socket.join(`shop:${shopId}`); 
      socket.join(`room:shop:${shopId}`);
      console.log(`[Socket.io] Client joined room:shop:${shopId}`);
    });

    // Phase 9: Resident Intercom Rooms
    socket.on('join_flat_room', ({ societyId, flatNo }) => {
      const room = `flat_${societyId}_${flatNo}`;
      socket.join(room);
      console.log(`[Socket.io] Resident joined ${room}`);
    });

    socket.on('join_gatekeeper_room', ({ gateId }) => {
      socket.join(`gatekeeper_${gateId}`);
      console.log(`[Socket.io] Gatekeeper joined gatekeeper_${gateId}`);
    });

    socket.on('VISITOR_RESPONSE', (data) => {
      // Forward the resident's response back to the gatekeeper
      // data should contain { visitorId, status, gateId (optional) }
      io.to('gatekeeper_GATE-1').emit('VISITOR_RESPONSE', data);
    });

    orderSocket(io, socket);
    tokenQueueSocket(io, socket);
    trackingSocket(io, socket);
    chatSocket.register(io, socket);
    inventorySocket(io, socket);
    carpoolSocket(io, socket);
    marketplaceSocket(io, socket);
    jobsSocket(io, socket);

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

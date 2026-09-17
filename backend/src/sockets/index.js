const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const { getJwtSecret } = require('../config/secrets');
const orderSocket = require('./orderSocket');
const tokenQueueSocket = require('./tokenQueueSocket');
const trackingSocket = require('./trackingSocket');
const chatSocket = require('./chatSocket');
const inventorySocket = require('./inventorySocket');
const carpoolSocket = require('./carpoolSocket');
const marketplaceSocket = require('./marketplaceSocket');
const jobsSocket = require('./jobsSocket');
const territorySocket = require('./territorySocket');
const societyCaps = require('../modules/community/middleware/society-capability');

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
      
      // config/secrets centralises this and fails closed in production. Reading
      // process.env directly with a literal fallback — the pattern that used to
      // be here — meant this socket handshake would verify tokens against
      // 'localsampark_jwt_secret_dev', a key published in this repository, on
      // any deploy where JWT_SECRET was missing. It also disagreed with the
      // dev fallback the rest of the app uses, so locally issued tokens failed
      // to verify here for reasons that looked like a socket bug.
      const decoded = jwt.verify(token, getJwtSecret());
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

    /**
     * Resident intercom rooms.
     *
     * These three handlers took the society, the flat and the gate straight
     * from the payload and joined the room. The handshake degrades an
     * unrecognised token to a guest rather than refusing, so any client at all
     * could join `flat_<any society>_<any flat>` and watch every visitor alert
     * and intercom call for a flat that was not theirs — a live feed of who
     * calls on whom, across every society on the platform.
     *
     * Membership is now verified server-side before the join. A resident
     * reaches their own flat; a guard or society admin reaches the society's
     * gate. Nobody reaches a society they do not belong to.
     */
    socket.on('join_flat_room', async ({ societyId, flatNo } = {}) => {
      if (!societyId || !flatNo) return;

      const membership = await societyCaps.membershipOf(socket.user?.id, societyId);
      const isResidentOfFlat = societyCaps.membershipIsActive(membership)
        && String(membership.flat_number || '').trim().toLowerCase() === String(flatNo).trim().toLowerCase();

      // A society admin may listen on a flat while covering the desk; a guard
      // may not — the gate announces visitors, it does not listen to flats.
      const isSocietyStaff = await societyCaps.hasSocietyCapability(
        { user: socket.user }, societyId, societyCaps.CAPABILITIES.MANAGE_SOCIETY
      );

      if (!isResidentOfFlat && !isSocietyStaff) {
        return socket.emit('socket_error', { event: 'join_flat_room', reason: 'not_authorised' });
      }

      socket.join(`flat_${societyId}_${flatNo}`);
      socket.emit('joined_flat_room', { societyId, flatNo });
    });

    socket.on('join_gatekeeper_room', async ({ societyId, gateId } = {}) => {
      if (!societyId) return;

      const permitted = await societyCaps.hasSocietyCapability(
        { user: socket.user }, societyId, societyCaps.CAPABILITIES.LOG_GATE_ENTRY
      );
      if (!permitted) {
        return socket.emit('socket_error', { event: 'join_gatekeeper_room', reason: 'not_authorised' });
      }

      // Namespaced by society. The gate id alone is not unique across
      // societies, and every deployment's first gate is called GATE-1.
      socket.join(`gatekeeper_${societyId}_${gateId || 'default'}`);
      socket.emit('joined_gatekeeper_room', { societyId, gateId: gateId || 'default' });
    });

    socket.on('VISITOR_RESPONSE', async (data = {}) => {
      const { societyId, gateId, visitorId, status } = data;
      if (!societyId || !visitorId) return;

      // The resident answering must actually belong to the society. This
      // previously forwarded anything to a hardcoded `gatekeeper_GATE-1`, so
      // every society's approvals landed in one global room — the wrong gate,
      // and readable by anyone who had joined it.
      const membership = await societyCaps.membershipOf(socket.user?.id, societyId);
      if (!societyCaps.membershipIsActive(membership)) {
        return socket.emit('socket_error', { event: 'VISITOR_RESPONSE', reason: 'not_authorised' });
      }

      io.to(`gatekeeper_${societyId}_${gateId || 'default'}`).emit('VISITOR_RESPONSE', {
        visitorId,
        status,
        respondedBy: socket.user?.id,
        at: new Date().toISOString(),
      });
    });

    orderSocket(io, socket);
    tokenQueueSocket(io, socket);
    trackingSocket(io, socket);
    chatSocket.register(io, socket);
    inventorySocket(io, socket);
    carpoolSocket(io, socket);
    marketplaceSocket(io, socket);
    jobsSocket(io, socket);
    territorySocket(io, socket);

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

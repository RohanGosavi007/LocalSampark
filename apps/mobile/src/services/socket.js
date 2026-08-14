/**
 * Socket.io Service — Real-time communication with the backend
 * Handles: live order updates, new order alerts, delivery tracking, chat
 */
import { API_URL } from '../lib/api';

let io = null;
try {
  io = require('socket.io-client').io;
} catch (e) {
  console.warn('[Socket] socket.io-client not available:', e.message);
}

// Extract base URL (remove /api/v1 suffix for socket connection)
const SOCKET_URL = API_URL ? API_URL.replace(/\/api\/v\d+\/?$/, '') : 'http://localhost:5000';

class SocketService {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.listeners = new Map();
  }

  connect(shopId) {
    if (!io) {
      console.warn('[Socket] socket.io-client not installed, skipping connection');
      return;
    }

    if (this.socket) {
      if (this.socket.connected) {
        if (shopId) this.joinShop(shopId);
        return;
      }
      this.socket.connect();
    } else {
      this.socket = io(SOCKET_URL, {
        transports: ['websocket'],
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 3000,
      });

      this.socket.on('connect', () => {
        this.connected = true;
        console.log('[Socket.io] Connected on Mobile to', SOCKET_URL);
        if (shopId) {
          this.joinShop(shopId);
        }
      });

      this.socket.on('disconnect', (reason) => {
        this.connected = false;
        console.log('[Socket.io] Disconnected on Mobile:', reason);
      });

      this.socket.on('connect_error', (error) => {
        console.warn('[Socket.io] Connection error:', error.message);
      });
    }
  }

  joinShop(shopId) {
    if (this.socket && this.connected) {
      this.socket.emit('join_shop_room', shopId);
    }
  }

  joinUser(userId) {
    if (this.socket && this.connected) {
      this.socket.emit('join_user_room', userId);
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.connected = false;
    }
  }

  on(event, callback) {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  emit(event, data) {
    if (this.socket && this.connected) {
      this.socket.emit(event, data);
    }
  }
}

export const socketService = new SocketService();

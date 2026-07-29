// Crash-safe socket.io import — socket.io-client is not in package.json
let io = null;
let API_URL = '';
try {
  io = require('socket.io-client').io;
} catch (e) {
  console.warn('[Socket] socket.io-client not available:', e.message);
}
try {
  API_URL = require('../lib/api').API_URL;
} catch (e) {
  console.warn('[Socket] api module not available:', e.message);
}

class SocketService {
  constructor() {
    this.socket = null;
    this.connected = false;
  }

  connect(shopId) {
    if (!io) {
      console.warn('[Socket] socket.io-client not installed, skipping connection');
      return;
    }

    if (this.socket) {
      if (this.socket.connected) return;
      this.socket.connect();
    } else {
      this.socket = io(API_URL || 'http://localhost:5000', {
        transports: ['websocket'],
        autoConnect: true,
      });

      this.socket.on('connect', () => {
        this.connected = true;
        console.log('[Socket.io] Connected on Mobile');
        if (shopId) {
          this.joinShop(shopId);
        }
      });

      this.socket.on('disconnect', () => {
        this.connected = false;
        console.log('[Socket.io] Disconnected on Mobile');
      });
    }
  }

  joinShop(shopId) {
    if (this.socket && this.connected) {
      this.socket.emit('join_shop_room', shopId);
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
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
}

export const socketService = new SocketService();

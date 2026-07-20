import { io } from 'socket.io-client';
import { API_URL } from '../lib/api';

class SocketService {
  constructor() {
    this.socket = null;
    this.connected = false;
  }

  connect(shopId) {
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

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
    this.token = null;
  }

  /**
   * @param {string|null} shopId  optional room to join on connect
   * @param {string|null} token   JWT for the handshake
   *
   * The token matters. backend/src/sockets/index.js authenticates the
   * handshake and *degrades an unrecognised token to a guest session* rather
   * than refusing, so connecting without one appeared to work while silently
   * failing every authorisation check — a resident would never receive their
   * own flat's visitor alerts, with no error to explain it.
   */
  connect(shopId, token = null) {
    if (!io) {
      console.warn('[Socket] socket.io-client not installed, skipping connection');
      return;
    }

    if (token) this.token = token;

    if (this.socket) {
      if (this.socket.connected) {
        if (shopId) this.joinShop(shopId);
        return;
      }
      this.socket.connect();
    } else {
      this.socket = io(SOCKET_URL, {
        // Both transports, not websocket alone: a websocket upgrade is the
        // first thing a captive portal or corporate proxy blocks, and with a
        // single transport the client then never connects at all.
        transports: ['websocket', 'polling'],
        auth: this.token ? { token: this.token } : undefined,
        extraHeaders: this.token ? { Authorization: `Bearer ${this.token}` } : undefined,
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 2000,
        reconnectionDelayMax: 15000,
        timeout: 10000,
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

  /**
   * Order tracking room.
   *
   * orderSocket.js broadcasts to both `order_<id>` and `order:<id>`, and emits
   * both a generic `order_status_update` and a per-order
   * `order_status_<id>` — so a screen can listen for its own order without
   * filtering the firehose.
   */
  joinOrder(orderId) {
    if (this.socket && this.connected && orderId) {
      this.socket.emit('join_order_room', orderId);
      this.socket.emit('order:track', orderId);
    }
  }

  /**
   * Force a fresh connection. Android suspends a socket held across a long
   * background and the client does not reliably notice, so the app reconnects
   * on foreground rather than showing data that quietly stopped updating.
   */
  reconnect() {
    if (!this.socket) return;
    if (!this.socket.connected) this.socket.connect();
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

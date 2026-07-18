import { io } from 'socket.io-client';
import { API_URL } from './api';

// Extract the base URL without the /api/v1 path
const socketUrl = API_URL.replace('/api/v1', '');

class SocketService {
  constructor() {
    this.socket = null;
    this.userId = null;
  }

  connect(userId, roles = []) {
    if (this.socket?.connected) {
      if (this.userId === userId) return;
      this.disconnect();
    }

    this.userId = userId;

    this.socket = io(socketUrl, {
      transports: ['websocket'],
      query: { userId, roles: roles.join(',') },
    });

    this.socket.on('connect', () => {
      console.log(`Mobile Socket connected with ID: ${this.socket.id}`);
    });

    this.socket.on('disconnect', () => {
      console.log('Mobile Socket disconnected');
    });

    this.socket.on('connect_error', (err) => {
      console.error('Mobile Socket connection error:', err.message);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.userId = null;
    }
  }

  subscribe(event, callback) {
    if (!this.socket) return;
    this.socket.on(event, callback);
  }

  unsubscribe(event, callback) {
    if (!this.socket) return;
    this.socket.off(event, callback);
  }

  emit(event, data) {
    if (!this.socket) return;
    this.socket.emit(event, data);
  }
}

const socketService = new SocketService();
export default socketService;

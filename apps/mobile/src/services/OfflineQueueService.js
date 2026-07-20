import NetInfo from '@react-native-community/netinfo';
import { database } from '../database';
import { getAuthHeaders, API_BASE } from '../lib/api';

export const OfflineQueueService = {
  isOnline: true,

  init() {
    NetInfo.addEventListener(state => {
      const wasOffline = !this.isOnline;
      this.isOnline = !!state.isConnected && !!state.isInternetReachable;
      
      if (wasOffline && this.isOnline) {
        console.log('[OfflineQueue] Back online. Processing queue...');
        this.processQueue();
      }
    });
  },

  async enqueue(url, method, body = null) {
    console.log(`[OfflineQueue] Enqueuing ${method} ${url}`);
    
    const headers = await getAuthHeaders();
    
    await database.write(async () => {
      await database.get('offline_queue').create(item => {
        item.url = url;
        item.method = method;
        item.body = body ? JSON.stringify(body) : null;
        item.headers = JSON.stringify(headers);
        item.createdAt = new Date();
      });
    });
  },

  async processQueue() {
    const queueCollection = database.get('offline_queue');
    const items = await queueCollection.query().fetch();
    
    if (items.length === 0) return;
    
    for (const item of items) {
      if (!this.isOnline) break; // Network dropped during processing
      
      try {
        const fullUrl = item.url.startsWith('http') ? item.url : `${API_BASE}${item.url}`;
        const response = await fetch(fullUrl, {
          method: item.method,
          headers: JSON.parse(item.headers),
          body: item.body,
        });
        
        if (response.ok || response.status >= 400) {
          // If successful OR permanent client/server error, remove from queue
          // (We don't retry 400 Bad Request endlessly)
          await database.write(async () => {
            await item.destroyPermanently();
          });
        }
      } catch (err) {
        console.warn(`[OfflineQueue] Failed to process queued request to ${item.url}:`, err);
        // Keep in queue if it's a network error
      }
    }
  }
};

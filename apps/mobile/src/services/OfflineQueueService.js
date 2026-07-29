import NetInfo from '@react-native-community/netinfo';

// Lazy-import database and API helpers so a missing native module
// never prevents the rest of the app from booting.
let database = null;
let getAuthHeaders = null;
let API_BASE = '';

try {
  const dbModule = require('../database');
  database = dbModule.database;
} catch (e) {
  console.warn('[OfflineQueue] database module unavailable:', e.message);
}

try {
  const apiModule = require('../lib/api');
  getAuthHeaders = apiModule.getAuthHeaders;
  API_BASE = apiModule.API_BASE;
} catch (e) {
  console.warn('[OfflineQueue] api module unavailable:', e.message);
}

export const OfflineQueueService = {
  isOnline: true,
  _initialized: false,

  init() {
    if (this._initialized) return;
    this._initialized = true;

    try {
      NetInfo.addEventListener(state => {
        const wasOffline = !this.isOnline;
        this.isOnline = !!state.isConnected && !!state.isInternetReachable;
        
        if (wasOffline && this.isOnline) {
          console.log('[OfflineQueue] Back online. Processing queue...');
          this.processQueue().catch(err => {
            console.warn('[OfflineQueue] processQueue error:', err.message);
          });
        }
      });
    } catch (err) {
      console.warn('[OfflineQueue] NetInfo listener setup failed:', err.message);
    }
  },

  async enqueue(url, method, body = null) {
    if (!database || !getAuthHeaders) {
      console.warn('[OfflineQueue] Cannot enqueue — database or API not available');
      return;
    }

    console.log(`[OfflineQueue] Enqueuing ${method} ${url}`);
    
    try {
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
    } catch (err) {
      console.warn('[OfflineQueue] enqueue failed:', err.message);
    }
  },

  async processQueue() {
    if (!database) {
      console.warn('[OfflineQueue] Cannot process queue — database not available');
      return;
    }

    try {
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
            await database.write(async () => {
              await item.destroyPermanently();
            });
          }
        } catch (err) {
          console.warn(`[OfflineQueue] Failed to process queued request to ${item.url}:`, err);
        }
      }
    } catch (err) {
      console.warn('[OfflineQueue] processQueue failed:', err.message);
    }
  }
};

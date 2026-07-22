import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
// Fallback to fetch if axios isn't used
const httpClient = global.fetch;

const QUEUE_KEY = '@localsampark_offline_mutations';

/**
 * Offline Sync Queue Architecture (Optimistic UI & LWW Conflict Resolution)
 * 
 * Flow:
 * 1. Network interceptor detects offline status during a POST/PUT/DELETE
 * 2. Mutation is serialized and pushed to AsyncStorage
 * 3. App registers a NetInfo listener for reconnection
 * 4. Background Sync loop replays pending mutations
 */

export const getQueue = async () => {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Failed to read offline queue', e);
    return [];
  }
};

export const enqueueMutation = async (method, url, payload, headers) => {
  const queue = await getQueue();
  const mutation = {
    id: Date.now().toString(),
    method,
    url,
    payload,
    headers,
    timestamp: Date.now(),
    retryCount: 0
  };
  queue.push(mutation);
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  console.log(`[Offline Sync] Queued ${method} ${url}`);
};

export const processQueue = async () => {
  const state = await NetInfo.fetch();
  if (!state.isConnected) return; // Still offline

  let queue = await getQueue();
  if (queue.length === 0) return;

  console.log(`[Offline Sync] Processing ${queue.length} mutations...`);

  // Process sequentially to maintain Last-Write-Wins (LWW) order
  const pending = [];
  
  for (const item of queue) {
    try {
      const response = await httpClient(item.url, {
        method: item.method,
        headers: {
          'Content-Type': 'application/json',
          ...item.headers,
        },
        body: item.payload ? JSON.stringify(item.payload) : undefined
      });

      if (!response.ok) {
        if (response.status === 409) {
          // Conflict Resolution (Server Wins or LWW) - log and drop, or send to dead-letter
          console.warn(`[Offline Sync] Conflict on ${item.url}. Dropping mutation.`);
        } else if (response.status >= 500) {
          // Server error, keep in queue for retry
          item.retryCount += 1;
          if (item.retryCount < 3) pending.push(item);
        }
      } else {
        console.log(`[Offline Sync] Successfully synced ${item.url}`);
      }
    } catch (e) {
      // Network error during sync, keep in queue
      item.retryCount += 1;
      if (item.retryCount < 3) pending.push(item);
    }
  }

  // Update queue with only pending items
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(pending));
};

// Initialize listener
export const initOfflineSync = () => {
  NetInfo.addEventListener(state => {
    if (state.isConnected) {
      processQueue();
    }
  });
};

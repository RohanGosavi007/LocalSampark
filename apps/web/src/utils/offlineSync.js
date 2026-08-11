// A basic offline sync queue utility using LocalStorage

export const QUEUE_KEY = 'localsampark_offline_queue';

export function saveToSyncQueue(endpoint, method, payload) {
  const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
  queue.push({
    id: Date.now(),
    endpoint,
    method,
    payload,
    timestamp: new Date().toISOString()
  });
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function getSyncQueue() {
  if (typeof window === 'undefined') return [];
  return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
}

export function clearSyncQueue() {
  localStorage.removeItem(QUEUE_KEY);
}

export async function flushSyncQueue() {
  if (typeof window === 'undefined') return;
  const queue = getSyncQueue();
  if (queue.length === 0) return true;

  console.log(`[Offline Sync] Flushing ${queue.length} items to backend...`);
  
  let successCount = 0;
  
  for (const item of queue) {
    try {
      const res = await fetch(item.endpoint, {
        method: item.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item.payload)
      });
      if (res.ok) {
        successCount++;
      }
    } catch (e) {
      console.warn(`[Offline Sync] Failed to sync item ${item.id}`, e);
    }
  }

  // If all succeeded, clear queue. In robust production, remove only succeeded items.
  if (successCount === queue.length) {
    clearSyncQueue();
    return true;
  }
  return false;
}

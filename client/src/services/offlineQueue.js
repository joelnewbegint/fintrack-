/**
 * IndexedDB Offline Sync Queue for VK BANKER'S & FINANCE
 * Ensures zero data loss when devices are offline or network drops.
 * Mutations are safely stored in IndexedDB and automatically replayed
 * in FIFO order when network connectivity is restored.
 */

const DB_NAME = 'vk_bankers_offline_db';
const DB_VERSION = 1;
const STORE_NAME = 'sync_queue';

let dbPromise = null;

const getDB = () => {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.resolve(null);
  }

  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };

      request.onsuccess = (event) => {
        resolve(event.target.result);
      };

      request.onerror = (event) => {
        console.warn('IndexedDB open error:', event.target.error);
        resolve(null);
      };
    });
  }

  return dbPromise;
};

/**
 * Add a pending mutation to the offline IndexedDB queue
 */
export const addToSyncQueue = async (item) => {
  try {
    const db = await getDB();
    if (!db) return null;

    const entry = {
      id: item.id || `queue_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      timestamp: Date.now(),
      endpoint: item.endpoint,
      method: item.method || 'POST',
      data: item.data || {},
      clientId: item.clientId || item.data?.clientId || item.data?._id || item.data?.id || '',
      type: item.type || 'MUTATION',
    };

    return new Promise((resolve) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const req = store.put(entry);

      req.onsuccess = () => {
        broadcastQueueCount();
        resolve(entry);
      };

      req.onerror = () => {
        console.warn('Failed to add item to offline queue');
        resolve(null);
      };
    });
  } catch (err) {
    console.warn('addToSyncQueue error:', err);
    return null;
  }
};

/**
 * Get all queued pending offline items sorted by timestamp
 */
export const getSyncQueue = async () => {
  try {
    const db = await getDB();
    if (!db) return [];

    return new Promise((resolve) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('timestamp');
      const req = index.getAll();

      req.onsuccess = () => {
        resolve(req.result || []);
      };

      req.onerror = () => {
        resolve([]);
      };
    });
  } catch {
    return [];
  }
};

/**
 * Remove an item from the sync queue after successful upload
 */
export const removeFromSyncQueue = async (id) => {
  try {
    const db = await getDB();
    if (!db) return;

    return new Promise((resolve) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const req = store.delete(id);

      req.onsuccess = () => {
        broadcastQueueCount();
        resolve(true);
      };

      req.onerror = () => {
        resolve(false);
      };
    });
  } catch {
    return false;
  }
};

/**
 * Update retry counter for an item in the queue
 */
export const updateQueueItemRetry = async (id, retryCount = 1) => {
  try {
    const db = await getDB();
    if (!db) return;

    return new Promise((resolve) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const getReq = store.get(id);

      getReq.onsuccess = () => {
        const item = getReq.result;
        if (!item) return resolve(false);
        item.retryCount = retryCount;
        item.lastAttemptAt = Date.now();
        const putReq = store.put(item);
        putReq.onsuccess = () => resolve(true);
        putReq.onerror = () => resolve(false);
      };
      getReq.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
};

/**
 * Clear all items in the offline sync queue
 */
export const clearSyncQueue = async () => {
  try {
    const db = await getDB();
    if (!db) return false;

    return new Promise((resolve) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const req = store.clear();

      req.onsuccess = () => {
        broadcastQueueCount();
        resolve(true);
      };

      req.onerror = () => {
        resolve(false);
      };
    });
  } catch {
    return false;
  }
};

/**
 * Prune stale queue items older than maxAgeMs or exceeding max retries
 */
export const pruneStaleQueueItems = async (maxAgeMs = 48 * 60 * 60 * 1000) => {
  try {
    const db = await getDB();
    if (!db) return 0;
    const now = Date.now();
    const queue = await getSyncQueue();
    let prunedCount = 0;

    for (const item of queue) {
      const age = now - (item.timestamp || 0);
      const retries = item.retryCount || 0;
      if (age > maxAgeMs || retries >= 4) {
        await removeFromSyncQueue(item.id);
        prunedCount++;
      }
    }
    if (prunedCount > 0) {
      broadcastQueueCount();
    }
    return prunedCount;
  } catch {
    return 0;
  }
};

/**
 * Get count of pending mutations in offline queue
 */
export const getQueueCount = async () => {
  try {
    const db = await getDB();
    if (!db) return 0;

    return new Promise((resolve) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const req = store.count();

      req.onsuccess = () => {
        resolve(req.result || 0);
      };

      req.onerror = () => {
        resolve(0);
      };
    });
  } catch {
    return 0;
  }
};

const broadcastQueueCount = async () => {
  if (typeof window === 'undefined') return;
  const count = await getQueueCount();
  window.dispatchEvent(
    new CustomEvent('fintrack:queue-count', {
      detail: { pendingCount: count },
    })
  );
};


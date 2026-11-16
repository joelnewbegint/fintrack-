/**
 * Real-Time Multi-Device Sync Manager for VK BANKER'S & FINANCE
 * - Polls backend every 5 seconds to synchronize changes across all devices.
 * - Auto-uploads pending IndexedDB mutations when online.
 * - Broadcasts status ('synced' | 'syncing' | 'offline') for top bar indicator.
 */

import { getSyncQueue, removeFromSyncQueue, getQueueCount } from './offlineQueue';

let syncInterval = null;
let isSyncingQueue = false;
let currentStatus = 'synced'; // 'synced' | 'syncing' | 'offline'
let pendingCount = 0;
let lastServerCheck = 0;

export const getSyncStatus = () => ({
  status: currentStatus,
  pendingCount,
  lastServerCheck,
});

const notifyStatus = (status, count = pendingCount) => {
  currentStatus = status;
  pendingCount = count;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('fintrack:sync-status', {
        detail: { status, pendingCount: count, timestamp: Date.now() },
      })
    );
  }
};

/**
 * Flush all offline queued mutations to the backend server
 */
export const flushOfflineQueue = async (safeFetchJson, getHeaders) => {
  if (isSyncingQueue) return;
  const queue = await getSyncQueue();
  if (!queue || queue.length === 0) {
    notifyStatus('synced', 0);
    return;
  }

  isSyncingQueue = true;
  notifyStatus('syncing', queue.length);

  for (const item of queue) {
    try {
      const res = await safeFetchJson(item.endpoint, {
        method: item.method || 'POST',
        headers: getHeaders(),
        body: JSON.stringify(item.data),
      });

      if (res.ok) {
        await removeFromSyncQueue(item.id);
      } else if (res.status === 400 || res.status === 404 || res.status === 422) {
        // Bad request or conflict; drop item to prevent endless blocking
        await removeFromSyncQueue(item.id);
      } else {
        // Server still unreachable or erroring; pause queue flush
        break;
      }
    } catch {
      break;
    }
  }

  isSyncingQueue = false;
  const remaining = await getQueueCount();
  notifyStatus(remaining > 0 ? 'offline' : 'synced', remaining);
};

/**
 * Initialize 5-second polling loop and network listeners
 */
export const initSyncManager = ({ checkBackendHealth, safeFetchJson, getHeaders, onDataRefreshed }) => {
  if (typeof window === 'undefined') return;

  const runSyncCycle = async () => {
    try {
      const queueRemaining = await getQueueCount();
      pendingCount = queueRemaining;

      // Check server health
      const health = await checkBackendHealth();
      lastServerCheck = Date.now();

      if (!health || !health.online) {
        notifyStatus('offline', queueRemaining);
        return;
      }

      // If there are pending mutations, flush them first
      if (queueRemaining > 0) {
        await flushOfflineQueue(safeFetchJson, getHeaders);
      } else {
        notifyStatus('synced', 0);
      }

      // Trigger data sync notification so active screens re-fetch data
      if (onDataRefreshed) {
        onDataRefreshed();
      }
      window.dispatchEvent(new CustomEvent('fintrack:data-updated'));
    } catch {
      notifyStatus('offline', pendingCount);
    }
  };

  // Immediate cycle
  setTimeout(runSyncCycle, 1000);

  // Poll every 5 seconds for cross-device sync
  if (syncInterval) clearInterval(syncInterval);
  syncInterval = setInterval(runSyncCycle, 5000);

  // Event listeners for connection changes
  window.addEventListener('online', () => {
    notifyStatus('syncing');
    runSyncCycle();
  });

  window.addEventListener('offline', () => {
    notifyStatus('offline');
  });

  window.addEventListener('fintrack:queue-count', (e) => {
    if (e.detail && typeof e.detail.pendingCount === 'number') {
      pendingCount = e.detail.pendingCount;
      if (pendingCount > 0 && currentStatus === 'synced') {
        notifyStatus('syncing', pendingCount);
      }
    }
  });

  return () => {
    if (syncInterval) clearInterval(syncInterval);
  };
};

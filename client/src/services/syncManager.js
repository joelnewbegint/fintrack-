/**
 * Real-Time Multi-Device Sync Manager for VK BANKER'S & FINANCE
 * - Polls backend every 5 seconds to synchronize changes across all devices.
 * - Auto-uploads pending IndexedDB mutations when online.
 * - Self-heals: auto-drops conflict/stale mutations to prevent stuck queue ('Offline (X)').
 * - Broadcasts status ('synced' | 'syncing' | 'offline') for top bar indicator.
 */

import {
  getSyncQueue,
  removeFromSyncQueue,
  getQueueCount,
  updateQueueItemRetry,
  clearSyncQueue,
  pruneStaleQueueItems,
} from './offlineQueue';

let syncInterval = null;
let isSyncingQueue = false;
let currentStatus = 'synced'; // 'synced' | 'syncing' | 'offline'
let pendingCount = 0;
let lastServerCheck = 0;
let isServerOnline = true;

export const getSyncStatus = () => ({
  status: currentStatus,
  pendingCount,
  lastServerCheck,
  isServerOnline,
});

export const notifyStatus = (status, count = pendingCount) => {
  const hasChanged = currentStatus !== status || pendingCount !== count;
  currentStatus = status;
  pendingCount = count;
  if (hasChanged && typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('fintrack:sync-status', {
        detail: { status, pendingCount: count, timestamp: Date.now(), isServerOnline },
      })
    );
  }
};

/**
 * Flush all offline queued mutations to the backend server.
 * Uses intelligent retries, token-refresh on 401, and auto-drops
 * invalid/duplicate mutations to guarantee the queue never stays permanently stuck.
 */
export const flushOfflineQueue = async (safeFetchJson, getHeaders, forceClear = false) => {
  if (forceClear) {
    await clearSyncQueue();
    notifyStatus(isServerOnline ? 'synced' : 'offline', 0);
    return { success: true, count: 0 };
  }

  if (isSyncingQueue) return { success: false, inProgress: true };

  // First prune any entries older than 48 hours or corrupted
  await pruneStaleQueueItems(48 * 60 * 60 * 1000);

  const queue = await getSyncQueue();
  if (!queue || queue.length === 0) {
    notifyStatus(isServerOnline ? 'synced' : 'offline', 0);
    return { success: true, count: 0 };
  }

  isSyncingQueue = true;
  notifyStatus('syncing', queue.length);

  for (const item of queue) {
    const currentRetries = (item.retryCount || 0) + 1;

    try {
      const res = await safeFetchJson(item.endpoint, {
        method: item.method || 'POST',
        headers: getHeaders ? getHeaders() : {},
        body: JSON.stringify(item.data),
      });

      if (res.ok) {
        // Mutation successfully pushed to backend
        await removeFromSyncQueue(item.id);
      } else if (
        res.status === 400 ||
        res.status === 404 ||
        res.status === 409 ||
        res.status === 422 ||
        (res.error && res.error.toLowerCase().includes('duplicate'))
      ) {
        // Bad request, conflict, or duplicate entry already in database:
        // Safely remove from sync queue to prevent endless stalling
        console.warn(`[SyncManager] Dropping non-retryable item ${item.id} (${res.status}):`, res.error);
        await removeFromSyncQueue(item.id);
      } else if (res.status === 401 || res.status === 403) {
        // Auth issue: if retried twice with auth failure, drop to unblock app
        if (currentRetries >= 2) {
          console.warn(`[SyncManager] Dropping unauthorized item ${item.id} after ${currentRetries} tries.`);
          await removeFromSyncQueue(item.id);
        } else {
          await updateQueueItemRetry(item.id, currentRetries);
          break;
        }
      } else {
        // Server offline, 500, or temporary network blip
        if (currentRetries >= 3) {
          console.warn(`[SyncManager] Item ${item.id} exceeded max retries (3), discarding to unblock queue.`);
          await removeFromSyncQueue(item.id);
        } else {
          await updateQueueItemRetry(item.id, currentRetries);
          break;
        }
      }
    } catch (err) {
      if (currentRetries >= 3) {
        await removeFromSyncQueue(item.id);
      } else {
        await updateQueueItemRetry(item.id, currentRetries);
      }
      break;
    }
  }

  isSyncingQueue = false;
  const remaining = await getQueueCount();

  if (remaining === 0) {
    notifyStatus('synced', 0);
  } else if (!isServerOnline) {
    notifyStatus('offline', remaining);
  } else {
    // Backend is online, but some items still processing or waiting retry
    notifyStatus('synced', remaining);
  }

  return { success: true, remaining };
};

/**
 * Force clear all stuck queue items and reset status to synced
 */
export const clearStuckSyncQueue = async () => {
  await clearSyncQueue();
  notifyStatus('synced', 0);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('fintrack:data-updated'));
  }
  return true;
};

/**
 * Initialize background sync manager and network listeners
 */
export const initSyncManager = ({ checkBackendHealth, safeFetchJson, getHeaders, onDataRefreshed }) => {
  if (typeof window === 'undefined') return;

  const runSyncCycle = async () => {
    // Only run if tab is visible to avoid unnecessary background battery & network drain
    if (typeof document !== 'undefined' && document.hidden) return;

    try {
      const queueRemaining = await getQueueCount();
      pendingCount = queueRemaining;

      // Check server health
      const health = await checkBackendHealth();
      lastServerCheck = Date.now();
      isServerOnline = !!(health && health.online);

      if (!isServerOnline) {
        notifyStatus('offline', queueRemaining);
        return;
      }

      // If there are pending mutations, flush them to the server
      let hadMutationsToFlush = queueRemaining > 0;
      if (hadMutationsToFlush) {
        const flushRes = await flushOfflineQueue(safeFetchJson, getHeaders);
        const remainingAfterFlush = flushRes?.remaining ?? (await getQueueCount());
        // Only trigger screen refresh if mutations were actually pushed to backend
        if (remainingAfterFlush < queueRemaining) {
          if (onDataRefreshed) onDataRefreshed();
          window.dispatchEvent(new CustomEvent('fintrack:data-updated'));
        }
      } else {
        notifyStatus('synced', 0);
      }
    } catch {
      notifyStatus(isServerOnline ? 'synced' : 'offline', pendingCount);
    }
  };

  // Immediate initial check after startup
  setTimeout(runSyncCycle, 1500);

  // Poll server every 15 seconds (prevents 5s jitter/flicker)
  if (syncInterval) clearInterval(syncInterval);
  syncInterval = setInterval(runSyncCycle, 15000);

  // Resume immediately when tab becomes visible again
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      runSyncCycle();
    }
  });

  // Event listeners for connection changes
  window.addEventListener('online', () => {
    isServerOnline = true;
    notifyStatus('syncing');
    runSyncCycle();
  });

  window.addEventListener('offline', () => {
    isServerOnline = false;
    notifyStatus('offline');
  });

  // When user successfully authenticates, immediately trigger queue flush with fresh token
  window.addEventListener('fintrack:auth-success', () => {
    setTimeout(() => {
      flushOfflineQueue(safeFetchJson, getHeaders);
    }, 500);
  });

  window.addEventListener('fintrack:force-sync', () => {
    runSyncCycle();
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

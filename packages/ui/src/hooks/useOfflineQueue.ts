/**
 * useOfflineQueue — React hook for offline-first mutation queueing.
 *
 * Per FrontEnd.md §6 — Background Sync.
 *
 * Wraps fetch mutations (POST/PUT/PATCH/DELETE). When the network is
 * unavailable the request is stored in IndexedDB (same schema as sw.ts)
 * and a Background Sync is requested. When connectivity returns, the
 * service worker flushes the queue automatically.
 *
 * @example
 * ```tsx
 * const { enqueue, pending, isOnline } = useOfflineQueue();
 *
 * const handleSubmit = async (data: PlantData) => {
 *   try {
 *     await enqueue('/api/v1/plants', 'POST', data);
 *     message.success('Saved (or queued for sync)');
 *   } catch (err) {
 *     message.error('Failed to queue request');
 *   }
 * };
 * ```
 */

import { useCallback, useEffect, useRef, useState } from 'react';

// ---------------------------------------------------------------------------
// IDB constants — must match sw.ts
// ---------------------------------------------------------------------------

const DB_NAME = 'ncts-offline';
const DB_VERSION = 1;
const STORE_NAME = 'pending-requests';
const SYNC_TAG = 'ncts-offline-queue';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface QueuedRequest {
  id?: number;
  method: string;
  url: string;
  body: unknown;
  createdAt: string;
}

export interface OfflineQueueResult {
  /** Enqueue a mutation. Resolves with the server response if online, or the IDB id if queued. */
  enqueue: <T = unknown>(url: string, method: string, body?: unknown) => Promise<T | number>;
  /** Number of requests currently pending in the offline queue. */
  pending: number;
  /** Whether the browser currently reports network connectivity. */
  isOnline: boolean;
  /** Manually flush the queue (useful for retry buttons). */
  flush: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// IDB helpers (window-side, mirrors sw.ts)
// ---------------------------------------------------------------------------

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function addToQueue(entry: Omit<QueuedRequest, 'id'>): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.add(entry);
    req.onsuccess = () => {
      db.close();
      resolve(req.result as number);
    };
    req.onerror = () => {
      db.close();
      reject(req.error);
    };
  });
}

async function countPending(): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.count();
    req.onsuccess = () => {
      db.close();
      resolve(req.result);
    };
    req.onerror = () => {
      db.close();
      reject(req.error);
    };
  });
}

async function getAllPending(): Promise<QueuedRequest[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => {
      db.close();
      resolve(req.result as QueuedRequest[]);
    };
    req.onerror = () => {
      db.close();
      reject(req.error);
    };
  });
}

async function removeFromQueue(id: number): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(id);
    req.onsuccess = () => {
      db.close();
      resolve();
    };
    req.onerror = () => {
      db.close();
      reject(req.error);
    };
  });
}

async function requestBackgroundSync(): Promise<void> {
  if (!('serviceWorker' in navigator) || !('SyncManager' in window)) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    await (reg as ServiceWorkerRegistration & { sync: { register(tag: string): Promise<void> } })
      .sync.register(SYNC_TAG);
  } catch {
    // Background Sync not supported or permission denied — silent fallback
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useOfflineQueue(): OfflineQueueResult {
  const [pending, setPending] = useState(0);
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );
  const mountedRef = useRef(true);

  // Track online/offline status
  useEffect(() => {
    mountedRef.current = true;

    const goOnline = () => {
      if (mountedRef.current) setIsOnline(true);
    };
    const goOffline = () => {
      if (mountedRef.current) setIsOnline(false);
    };

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);

    // Refresh pending count on mount and when coming back online
    const refreshCount = () => {
      countPending()
        .then((n) => { if (mountedRef.current) setPending(n); })
        .catch(() => {/* IDB unavailable */});
    };
    refreshCount();
    window.addEventListener('online', refreshCount);

    return () => {
      mountedRef.current = false;
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', refreshCount);
    };
  }, []);

  // Refresh pending count
  const refreshPending = useCallback(async () => {
    try {
      const n = await countPending();
      if (mountedRef.current) setPending(n);
    } catch {/* ignore */}
  }, []);

  /**
   * Enqueue a mutation. If online, attempts the fetch directly. If it
   * fails due to a network error (or the browser reports offline), the
   * request is stored in IDB and a Background Sync is requested.
   */
  const enqueue = useCallback(async <T = unknown>(
    url: string,
    method: string,
    body?: unknown,
  ): Promise<T | number> => {
    // If browser thinks we're online, try the request
    if (navigator.onLine) {
      try {
        const response = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: body != null ? JSON.stringify(body) : undefined,
        });
        if (response.ok) {
          if (response.status === 204) return undefined as T;
          return response.json() as Promise<T>;
        }
        // Non-network errors (4xx, 5xx) should NOT be queued — re-throw
        throw new Error(`HTTP ${response.status}`);
      } catch (err) {
        // Network failure while "online" — fall through to queue
        if (err instanceof TypeError && err.message.includes('fetch')) {
          // This is a genuine network error — queue it
        } else {
          throw err; // Not a network issue (e.g. 400/500) — propagate
        }
      }
    }

    // Offline or network failure: queue in IDB
    const id = await addToQueue({
      method,
      url,
      body,
      createdAt: new Date().toISOString(),
    });

    await requestBackgroundSync();
    await refreshPending();

    return id;
  }, [refreshPending]);

  /**
   * Manually flush the offline queue. Useful for a "Retry" button
   * when the user regains connectivity but Background Sync hasn't fired.
   */
  const flush = useCallback(async () => {
    const entries = await getAllPending();

    for (const entry of entries) {
      try {
        const response = await fetch(entry.url, {
          method: entry.method,
          headers: { 'Content-Type': 'application/json' },
          body: entry.body != null ? JSON.stringify(entry.body) : undefined,
        });
        if (response.ok && entry.id != null) {
          await removeFromQueue(entry.id);
        }
      } catch {
        // Still offline — stop flushing
        break;
      }
    }

    await refreshPending();
  }, [refreshPending]);

  return { enqueue, pending, isOnline, flush };
}

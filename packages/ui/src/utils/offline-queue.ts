/**
 * Offline Write Queue — IndexedDB-backed mutation queue for NCTS.
 *
 * When the app is offline, failed write requests (POST / PUT / PATCH / DELETE)
 * are stored in an IndexedDB object store. When connectivity resumes the queue
 * is flushed automatically (via the `online` event) or manually via `flushQueue()`.
 */

// ─── Constants ───────────────────────────────────────────────────────────────

const DB_NAME = 'ncts-offline';
const DB_VERSION = 1;
const STORE_NAME = 'pending-requests';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface QueuedRequest {
  id?: number;
  method: string;
  url: string;
  body: unknown;
  createdAt: string;
}

// ─── Database Helper ─────────────────────────────────────────────────────────

/**
 * Open (or create) the `ncts-offline` IndexedDB database.
 * The object store uses an auto-incrementing key so every queued request
 * receives a unique id.
 */
export function openDB(): Promise<IDBDatabase> {
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

// ─── Enqueue ─────────────────────────────────────────────────────────────────

/**
 * Store a failed mutation in the offline queue.
 *
 * @param method  HTTP method (e.g. `POST`, `PUT`, `PATCH`, `DELETE`)
 * @param url     The full request URL
 * @param body    The request payload (will be serialised as-is)
 */
export async function enqueueRequest(
  method: string,
  url: string,
  body: unknown,
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    const entry: QueuedRequest = {
      method,
      url,
      body,
      createdAt: new Date().toISOString(),
    };

    const req = store.add(entry);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

// ─── Flush ───────────────────────────────────────────────────────────────────

/**
 * Replay every queued request in FIFO order.
 *
 * Successfully replayed requests are removed from the store. Requests that
 * fail (e.g. server error) are left in the queue for the next flush attempt so
 * data is never silently lost.
 */
export async function flushQueue(): Promise<void> {
  const db = await openDB();

  const entries = await new Promise<QueuedRequest[]>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result as QueuedRequest[]);
    req.onerror = () => reject(req.error);
  });

  for (const entry of entries) {
    try {
      await fetch(entry.url, {
        method: entry.method,
        headers: { 'Content-Type': 'application/json' },
        body: entry.body != null ? JSON.stringify(entry.body) : undefined,
      });

      // Remove the successfully replayed request.
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(entry.id!);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
        tx.oncomplete = () => db.close();
      });
    } catch {
      // Network still unavailable or server error — leave the entry for the
      // next flush attempt.
      console.warn(`[offline-queue] Failed to replay ${entry.method} ${entry.url}`);
    }
  }

  db.close();
}

// ─── Queue Size ──────────────────────────────────────────────────────────────

/**
 * Returns the number of pending mutations in the offline queue.
 */
export async function getQueueSize(): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.count();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

// ─── Auto-flush on reconnect ─────────────────────────────────────────────────
// When the browser regains connectivity, automatically attempt to replay the
// queue. This listener is safe to call in both window and service-worker scopes.

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    flushQueue().catch((err) =>
      console.error('[offline-queue] Auto-flush failed:', err),
    );
  });
}

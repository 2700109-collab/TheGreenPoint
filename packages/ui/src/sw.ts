/**
 * NCTS Service Worker — PWA offline support & Background Sync.
 *
 * Per FrontEnd.md §6.1 — Service Worker.
 *
 * Key responsibilities:
 * 1. Cache static assets (app shell) for offline fallback.
 * 2. Register a BackgroundSync tag so that queued mutations are flushed
 *    even if the user closes the tab before connectivity returns.
 * 3. Provide a basic offline HTML fallback for navigation requests.
 */

/// <reference lib="webworker" />
declare const self: ServiceWorkerGlobalScope;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CACHE_NAME = 'ncts-v1';

/**
 * Minimal shell to cache for offline navigation.
 * In production these paths are generated at build time.
 */
const APP_SHELL = [
  '/',
  '/index.html',
];

// Background sync tag that the app registers from the window context.
const SYNC_TAG = 'ncts-offline-queue';

// ---------------------------------------------------------------------------
// Install — pre-cache app shell
// ---------------------------------------------------------------------------

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  );
});

// ---------------------------------------------------------------------------
// Activate — clean old caches
// ---------------------------------------------------------------------------

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// ---------------------------------------------------------------------------
// Fetch — stale-while-revalidate for static, network-first for API
// ---------------------------------------------------------------------------

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET, non-same-origin
  if (request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  // API requests — network-only (mutations go through offline queue)
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // Static / navigation — cache-first with network fallback
  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request)
        .then((response) => {
          // Update the cache with the fresh response
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => {
          // If network fails and no cache, return an offline page for navigations
          if (request.mode === 'navigate') {
            return caches.match('/index.html') as Promise<Response>;
          }
          return new Response('Offline', { status: 503 });
        });

      return cached || fetchPromise;
    }),
  );
});

// ---------------------------------------------------------------------------
// Background Sync — flush offline mutation queue
// ---------------------------------------------------------------------------

/**
 * Import flushQueue from the offline-queue module.
 * In the service worker scope `importScripts` isn't available for ES modules,
 * so we inline a minimal IDB-based flush. In production this can be compiled
 * into the SW via a bundler (e.g. Vite PWA plugin).
 */

const DB_NAME = 'ncts-offline';
const DB_VERSION = 1;
const STORE_NAME = 'pending-requests';

interface QueuedRequest {
  id?: number;
  method: string;
  url: string;
  body: unknown;
  createdAt: string;
}

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

async function flushQueue(): Promise<void> {
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
      const response = await fetch(entry.url, {
        method: entry.method,
        headers: { 'Content-Type': 'application/json' },
        body: entry.body != null ? JSON.stringify(entry.body) : undefined,
      });

      if (response.ok) {
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          const req = store.delete(entry.id!);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        });
      }
    } catch {
      console.warn(`[sw] Failed to replay ${entry.method} ${entry.url}`);
    }
  }

  db.close();
}

// SyncEvent is not in the standard TypeScript lib yet.
interface SyncEvent extends ExtendableEvent {
  readonly tag: string;
  readonly lastChance: boolean;
}

(self as unknown as { addEventListener(type: 'sync', listener: (event: SyncEvent) => void): void })
  .addEventListener('sync', (event: SyncEvent) => {
  if (event.tag === SYNC_TAG) {
    event.waitUntil(
      flushQueue().catch((err) =>
        console.error('[sw] Background sync flush failed:', err),
      ),
    );
  }
});

// ---------------------------------------------------------------------------
// Registration helper (exported for use in window context)
// ---------------------------------------------------------------------------

/**
 * Call this from the main app to register the service worker and request
 * a background sync whenever a request is enqueued.
 *
 * @example
 * ```ts
 * import { registerSW } from '@ncts/ui/sw';
 * registerSW();
 * ```
 */
export async function registerSW(): Promise<ServiceWorkerRegistration | undefined> {
  if (!('serviceWorker' in navigator)) return undefined;

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });
    console.info('[sw] Service worker registered:', registration.scope);
    return registration;
  } catch (err) {
    console.error('[sw] Registration failed:', err);
    return undefined;
  }
}

/**
 * Request a one-shot background sync. Should be called after enqueuing
 * a request to the offline queue.
 */
export async function requestSync(): Promise<void> {
  if (!('serviceWorker' in navigator) || !('SyncManager' in window)) return;

  const reg = await navigator.serviceWorker.ready;
  await (reg as ServiceWorkerRegistration & { sync: { register(tag: string): Promise<void> } })
    .sync.register(SYNC_TAG);
}

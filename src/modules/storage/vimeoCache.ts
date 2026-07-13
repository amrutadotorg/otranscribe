/**
 * vimeoCache.ts — IndexedDB cache for downloaded Vimeo files
 *
 * Stores File objects keyed by videoId.
 * Mirrors original vimeo-file-cache.js.
 * See PLAN.md section 1.2 Table E, Risk R6
 */

import { VIMEO_DB_NAME, VIMEO_STORE_NAME } from './storageKeys';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(VIMEO_DB_NAME, 2);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (db.objectStoreNames.contains(VIMEO_STORE_NAME)) {
        db.deleteObjectStore(VIMEO_STORE_NAME);
      }
      db.createObjectStore(VIMEO_STORE_NAME, { keyPath: 'videoId' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Cache a Vimeo File object by videoId */
export async function cacheVimeoFile(
  videoId: string,
  file: File,
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(VIMEO_STORE_NAME, 'readwrite');
    const store = tx.objectStore(VIMEO_STORE_NAME);
    store.put({ videoId, file });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Retrieve a cached Vimeo File by videoId. Returns null if not found. */
export async function getCachedVimeoFile(
  videoId: string,
): Promise<File | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(VIMEO_STORE_NAME, 'readonly');
    const store = tx.objectStore(VIMEO_STORE_NAME);
    const req = store.get(videoId);
    req.onsuccess = () => {
      const result = req.result as { videoId: string; file: File } | undefined;
      resolve(result?.file ?? null);
    };
    req.onerror = () => reject(req.error);
  });
}

/** Delete a cached file by videoId */
export async function deleteCachedVimeoFile(videoId: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(VIMEO_STORE_NAME, 'readwrite');
    tx.objectStore(VIMEO_STORE_NAME).delete(videoId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Clear all cached Vimeo files */
export async function clearVimeoCache(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(VIMEO_STORE_NAME, 'readwrite');
    tx.objectStore(VIMEO_STORE_NAME).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Extract Vimeo video ID from URL */
export function extractVimeoId(url: string): string | null {
  const patterns = [
    /vimeo\.com\/(\d+)(?:\/\S*)?$/,
    /player\.vimeo\.com\/video\/(\d+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

/**
 * Download a Vimeo video via the server proxy and cache it.
 * Returns a File object ready for the player.
 * Pass an AbortSignal to support cancellation (ESC key).
 */
export async function downloadAndCacheVimeo(
  vimeoUrl: string,
  onProgress?: (loaded: number, total: number) => void,
  signal?: AbortSignal,
  t?: (key: string, vars?: Record<string, string | number>) => string,
): Promise<{ file: File; videoId: string; name: string }> {
  const videoId = extractVimeoId(vimeoUrl);
  if (!videoId)
    throw new Error(
      t ? t('error-vimeo-id') : 'Could not extract Vimeo video ID',
    );

  // Check cache first
  const cached = await getCachedVimeoFile(videoId);
  if (cached) {
    return { file: cached, videoId, name: cached.name };
  }

  // Download via server proxy
  let res: Response;
  try {
    res = await fetch(
      `/api/vimeo/download?url=${encodeURIComponent(vimeoUrl)}`,
      { signal },
    );
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') throw err;
    throw new Error(t ? t('error-vimeo-download') : 'Vimeo download failed');
  }

  if (!res.ok) {
    if (res.status === 401) {
      try {
        const data = await res.json();
        if (data.loginUrl) {
          window.location.href = data.loginUrl;
          return { file: new File([], ''), videoId, name: '' }; // unreachable
        }
      } catch {
        /* ignore */
      }
    }
    throw new Error(t ? t('error-vimeo-download') : 'Vimeo download failed');
  }

  const contentLength = res.headers.get('content-length');
  const total = contentLength ? parseInt(contentLength, 10) : 0;
  const contentDisposition = res.headers.get('content-disposition') ?? '';
  const filenameMatch = contentDisposition.match(/filename="([^"]+)"/);
  const filename = filenameMatch?.[1] ?? `${videoId}.mp4`;

  // Stream response with progress
  const chunks: Blob[] = [];
  let loaded = 0;
  const reader = res.body!.getReader();
  while (true) {
    if (signal?.aborted) {
      await reader.cancel();
      throw new DOMException('Aborted', 'AbortError');
    }
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(new Blob([value]));
    loaded += value.length;
    onProgress?.(loaded, total);
  }

  const blob = new Blob(chunks, { type: 'video/mp4' });
  const file = new File([blob], decodeURIComponent(filename), {
    type: 'video/mp4',
  });

  await cacheVimeoFile(videoId, file);
  return { file, videoId, name: file.name };
}

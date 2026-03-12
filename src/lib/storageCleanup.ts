/**
 * Storage Cleanup Utility
 * Monitors storage quota and evicts old caches when usage exceeds threshold.
 */

const MAX_STORAGE_MB = 50;
const MAX_STORAGE_BYTES = MAX_STORAGE_MB * 1024 * 1024;

export async function checkAndCleanStorage(): Promise<void> {
  try {
    if (!navigator.storage?.estimate) return;

    const { usage = 0, quota = 0 } = await navigator.storage.estimate();
    const usageMB = Math.round(usage / (1024 * 1024));

    if (usage > MAX_STORAGE_BYTES) {
      console.log(`[StorageCleanup] Usage ${usageMB}MB exceeds ${MAX_STORAGE_MB}MB threshold. Cleaning...`);

      // 1. Clear service worker caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        for (const name of cacheNames) {
          await caches.delete(name);
        }
        console.log(`[StorageCleanup] Cleared ${cacheNames.length} cache(s)`);
      }

      // 2. Clear old IndexedDB downloads (keep last 20)
      try {
        const { getDownloads, deleteDownload } = await import('./indexedDB');
        const downloads = await getDownloads();
        if (downloads.length > 20) {
          const toDelete = downloads.slice(20);
          for (const dl of toDelete) {
            if (dl.id) await deleteDownload(dl.id);
          }
          console.log(`[StorageCleanup] Evicted ${toDelete.length} old downloads`);
        }
      } catch {
        // IndexedDB may not be available
      }

      // 3. Clear stale localStorage keys
      const keysToCheck = Object.keys(localStorage);
      for (const key of keysToCheck) {
        // Remove old signed URL caches and stale data
        if (key.startsWith('sb-') && key.endsWith('-auth-token')) continue; // keep auth
        if (key === 'sg_session_token' || key === 'sg_session_id') continue; // keep session
        if (key === 'install-banner-dismissed') continue;
        if (key === 'theme') continue;
        if (key.startsWith('cached_') || key.startsWith('temp_')) {
          localStorage.removeItem(key);
        }
      }
    }
  } catch (err) {
    console.warn('[StorageCleanup] Error during cleanup:', err);
  }
}

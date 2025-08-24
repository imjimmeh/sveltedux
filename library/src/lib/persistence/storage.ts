import type { StorageKind, StorageLike } from "./types.js";

/**
 * SSR-safe web storage factory. Returns an in-memory fallback when window storage is unavailable.
 */
export function createWebStorage(kind: StorageKind = "local"): StorageLike {
  try {
    if (typeof window !== "undefined") {
      const storage =
        kind === "local" ? window.localStorage : window.sessionStorage;
      // Test write/remove to ensure availability
      const testKey = "__persist_test__";
      storage.setItem(testKey, "1");
      storage.removeItem(testKey);
      return {
        getItem: (k: string) => storage.getItem(k),
        setItem: (k: string, v: string) => storage.setItem(k, v),
        removeItem: (k: string) => storage.removeItem(k),
      };
    }
  } catch {
    // fall through to memory
  }

  // In-memory fallback
  const mem = new Map<string, string>();
  return {
    getItem: (k) => (mem.has(k) ? mem.get(k)! : null),
    setItem: (k, v) => {
      mem.set(k, v);
    },
    removeItem: (k) => {
      mem.delete(k);
    },
  };
}

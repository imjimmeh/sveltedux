import type { StorageLike } from "./types.js";
import { createWebStorage } from "./storage.js";

/**
 * Controller registry enabling middleware to coordinate with enhancer by key.
 */
export type Controller = {
  pause(): void;
  resume(): void;
  isPaused(): boolean;
  flush(): void;
  purge(): void;
  setFlusher(fn: () => void): void;
};
export type ControllerInternal = Controller & {
  _paused: boolean;
  _flusher: (() => void) | null;
  _key: string;
  _storage: StorageLike;
};

const controllers = new Map<string, ControllerInternal>();

export function getOrCreateController(
  key: string,
  storage: StorageLike
): ControllerInternal {
  let c = controllers.get(key);
  if (!c) {
    c = {
      _paused: false,
      _flusher: null,
      _key: key,
      _storage: storage,
      pause() {
        this._paused = true;
      },
      resume() {
        this._paused = false;
      },
      isPaused() {
        return this._paused;
      },
      flush() {
        this._flusher?.();
      },
      purge() {
        try {
          this._storage.removeItem(this._key);
        } catch {
          // ignore
        }
      },
      setFlusher(fn: () => void) {
        this._flusher = fn;
      },
    };
    controllers.set(key, c);
  } else {
    // Update storage reference if changed
    (c as any)._storage = storage;
  }
  return c;
}

/**
 * Small debounce helper (trailing edge).
 */
export function createDebouncer(fn: () => void, wait: number) {
  let t: any = null;
  return {
    trigger() {
      if (t) clearTimeout(t);
      t = setTimeout(() => {
        t = null;
        fn();
      }, wait);
    },
    cancel() {
      if (t) {
        clearTimeout(t);
        t = null;
      }
    },
    pending() {
      return t != null;
    },
  };
}

/**
 * Util to purge a persisted state by key and storage.
 */
export function purgePersistedState(
  key: string,
  storage: StorageLike = createWebStorage("local")
) {
  try {
    storage.removeItem(key);
  } catch {
    // ignore
  }
}

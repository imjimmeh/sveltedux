import type { Dispatch, StoreEnhancer } from "../types.js";
import type { PersistedRecord, PersistOptions, StorageLike } from "./types.js";
import { PERSIST_REHYDRATE } from "./types.js";
import { createWebStorage } from "./storage.js";
import { createDebouncer, getOrCreateController } from "./utils.js";

/**
 * Store enhancer that rehydrates state at creation and persists updates with debounced writes.
 */
export function createPersistEnhancer<TState = unknown>(
  options: PersistOptions<TState> = {}
): StoreEnhancer<TState> {
  const {
    key = "my-app",
    storage = createWebStorage(options.storageKind ?? "local"),
    serialize = JSON.stringify,
    deserialize = JSON.parse,
    partialize,
    whitelist,
    blacklist,
    throttle = 250,
    version = 2,
    migrate,
    rehydrateStrategy = "replace",
  } = options;

  // Helper to apply whitelist/blacklist if provided
  const applyFilter = (state: any) => {
    if (partialize) return partialize(state);
    if (whitelist && whitelist.length) {
      const out: any = {};
      for (const k of whitelist) {
        if (k in state) out[k] = (state as any)[k];
      }
      return out;
    }
    if (blacklist && blacklist.length) {
      const out: any = { ...(state as any) };
      for (const k of blacklist) delete out[k];
      return out;
    }
    return state;
  };

  return (createStore) => (reducer, preloadedState) => {
    const controller = getOrCreateController(key, storage);

    // Rehydrate
    let rehydrated: TState | undefined = undefined;
    let didMigrate = false;
    try {
      const raw = storage.getItem(key);
      if (raw) {
        const parsed = deserialize(raw);
        // Accept both wrapped and raw persisted shape
        let persistedState: any;
        let fromVersion: number;
        if (parsed && typeof parsed === "object" && "state" in parsed) {
          persistedState = (parsed as PersistedRecord<any>).state;
          fromVersion = (parsed as PersistedRecord<any>).version ?? 0;
        } else {
          persistedState = parsed;
          fromVersion = 0;
        }

        if (migrate && fromVersion !== version) {
          try {
            persistedState = migrate(persistedState, fromVersion);
            didMigrate = true;
            // Write back upgraded immediately
            const upgraded: PersistedRecord = {
              version,
              state: persistedState,
            };
            storage.setItem(key, serialize(upgraded));
          } catch {
            // If migration fails, fall back to parsed state
          }
        }

        // Only rehydrate when we did NOT migrate in this run.
        // On migration, we upgrade storage but leave runtime state as provided by reducer/preloadedState.
        if (!didMigrate) {
          if (rehydrateStrategy === "replace") {
            rehydrated = persistedState as TState;
          } else {
            // shallow merge
            const base = (preloadedState ?? {}) as any;
            rehydrated = { ...base, ...(persistedState as any) } as TState;
          }
        }
      }
    } catch {
      // ignore storage/parse errors during rehydrate
    }

    const store = createStore(reducer, rehydrated ?? preloadedState);

    // Dispatch a rehydrate notification for observability
    try {
      (store.dispatch as Dispatch)({
        type: PERSIST_REHYDRATE,
        payload: rehydrated,
        meta: { key, version },
      });
    } catch {
      // ignore
    }

    // Setup persistence subscription
    const writeNow = () => {
      if (controller.isPaused()) return;
      try {
        const state = (store as any).getState() as TState;
        const selected = applyFilter(state);
        const record: PersistedRecord = { version, state: selected };
        storage.setItem(key, serialize(record));
      } catch {
        // ignore write errors
      }
    };

    const debouncer = createDebouncer(writeNow, throttle);
    controller.setFlusher(() => {
      debouncer.cancel();
      writeNow();
    });

    store.subscribe(() => {
      if (controller.isPaused()) return;
      debouncer.trigger();
    });

    return store;
  };
}

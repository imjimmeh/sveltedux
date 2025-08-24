import type { Action, Middleware } from "../types.js";
import type { StorageKind, StorageLike } from "./types.js";
import {
  PERSIST_FLUSH,
  PERSIST_PAUSE,
  PERSIST_PURGE,
  PERSIST_RESUME,
} from "./types.js";
import { createWebStorage } from "./storage.js";
import { getOrCreateController } from "./utils.js";

/**
 * Middleware that can control persistence behavior via actions and optional gating.
 */
export function createPersistMiddleware<TState = any>(options?: {
  key?: string;
  storage?: StorageLike;
  storageKind?: StorageKind;
  /**
   * When provided, only actions that match filter/types will be flushed, others are executed while paused.
   */
  actionFilter?: (action: Action) => boolean;
  types?: string[];
  gateWrites?: boolean; // default true when filter/types set
}) {
  const key = options?.key ?? "my-app";
  const storage =
    options?.storage ?? createWebStorage(options?.storageKind ?? "local");
  const filter = options?.actionFilter;
  const types = options?.types;
  const gateWrites =
    typeof options?.gateWrites === "boolean"
      ? options!.gateWrites
      : Boolean(filter || (types && types.length));

  const controller = getOrCreateController(key, storage);

  const middleware: Middleware<TState> = () => (next) => (action) => {
    const type = ((action as any) && (action as any).type) || "";

    // Management actions
    if (type === PERSIST_PAUSE) {
      controller.pause();
      return next(action);
    }
    if (type === PERSIST_RESUME) {
      controller.resume();
      return next(action);
    }
    if (type === PERSIST_PURGE) {
      const result = next(action);
      controller.purge();
      return result;
    }
    if (type === PERSIST_FLUSH) {
      const result = next(action);
      controller.flush();
      return result;
    }

    // Optional gating
    if (!gateWrites) {
      return next(action);
    }

    const allow =
      (filter ? filter(action) : undefined) ??
      (types ? types.includes(type) : true);

    if (allow) {
      // Let it pass and then flush to persist immediately
      const result = next(action);
      controller.flush();
      return result;
    } else {
      // Pause writes during this action
      controller.pause();
      try {
        return next(action);
      } finally {
        controller.resume();
      }
    }
  };

  return middleware;
}

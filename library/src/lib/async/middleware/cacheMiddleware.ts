import type { Middleware, Action } from "../../types.js";
import { isPending, isFulfilled } from "../thunks.js";

const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
const DEFAULT_MAX_SIZE = 100;
const PENDING_SUFFIX = "/pending";
const FULFILLED_SUFFIX = "/fulfilled";
const CACHED_META_KEY = "cached";

interface CacheOptions {
  ttl?: number;
  maxSize?: number;
  keyGenerator?: (action: Action) => string;
}

interface CacheEntry {
  data: unknown;
  timestamp: number;
}

interface ActionWithMeta {
  type: string;
  meta?: { requestId?: string; arg?: unknown; cached?: boolean };
  payload?: unknown;
}

class CacheManager {
  private readonly cache = new Map<string, CacheEntry>();

  constructor(
    private readonly ttl: number,
    private readonly maxSize: number,
    private readonly keyGenerator: (action: Action) => string
  ) {}

  get(action: Action): CacheEntry | undefined {
    const key = this.keyGenerator(action);
    const entry = this.cache.get(key);

    if (entry && this.isEntryValid(entry)) {
      return entry;
    }

    if (entry) {
      this.cache.delete(key);
    }

    return undefined;
  }

  set(action: Action, data: unknown): void {
    const key = this.keyGenerator(action);
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });

    this.cleanup();
  }

  private isEntryValid(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp < this.ttl;
  }

  private cleanup(): void {
    this.cleanExpiredEntries();
    this.enforceMaxSize();
  }

  private cleanExpiredEntries(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttl) {
        this.cache.delete(key);
      }
    }
  }

  private enforceMaxSize(): void {
    if (this.cache.size > this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      }
    }
  }
}

function createDefaultKeyGenerator(): (action: Action) => string {
  return (action: Action) => {
    const actionWithType = action as { type?: string };
    const type = actionWithType?.type ?? "";
    const typePrefix =
      typeof type === "string"
        ? type.replace(/\/(pending|fulfilled|rejected)$/, "")
        : "";
    return typePrefix;
  };
}

function createFulfilledActionType(pendingType: string): string {
  return pendingType.replace(PENDING_SUFFIX, FULFILLED_SUFFIX);
}

function createFulfilledAction(
  originalAction: ActionWithMeta,
  cachedData: unknown
): ActionWithMeta {
  return {
    type: createFulfilledActionType(originalAction.type),
    payload: cachedData,
    meta: {
      ...originalAction.meta,
      [CACHED_META_KEY]: true,
    },
  };
}

function isCachedAction(action: ActionWithMeta): boolean {
  return action.meta?.[CACHED_META_KEY] === true;
}

export function createCacheMiddleware<TState = unknown>(
  options: CacheOptions = {}
): Middleware<TState> {
  const {
    ttl = DEFAULT_TTL,
    maxSize = DEFAULT_MAX_SIZE,
    keyGenerator = createDefaultKeyGenerator(),
  } = options;

  const cacheManager = new CacheManager(ttl, maxSize, keyGenerator);

  const handlePendingAction = (
    action: Action,
    dispatch: (action: Action) => unknown
  ): Action => {
    const cached = cacheManager.get(action);

    if (cached) {
      const actionWithMeta = action as ActionWithMeta;
      const fulfilledAction = createFulfilledAction(
        actionWithMeta,
        cached.data
      );
      dispatch(fulfilledAction);
    }

    return action;
  };

  const handleFulfilledAction = (action: Action): void => {
    const actionWithMeta = action as ActionWithMeta;

    if (!isCachedAction(actionWithMeta)) {
      cacheManager.set(action, actionWithMeta.payload);
    }
  };

  return ({ dispatch }) =>
    (next) =>
    (action) => {
      if (isPending(action)) {
        handlePendingAction(action, dispatch);
      }

      if (isFulfilled(action)) {
        handleFulfilledAction(action);
      }

      return next(action);
    };
}

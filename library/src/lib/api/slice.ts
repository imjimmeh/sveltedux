import type { PayloadAction } from "../types.js";
import { createSlice } from "../reducers.js";
import { createAsyncState } from "../async.js";
import type { ApiState, CacheEntry, TagDescription } from "./types.js";
import { normalizeTags, createTagKey } from "./utils.js";

// Create the initial API state
export function createInitialApiState(): ApiState {
  return {
    queries: {},
    mutations: {},
    provided: {},
    subscriptions: {},
  };
}

// Action payload types
interface QueryStartPayload {
  cacheKey: string;
  endpointName: string;
}

interface QuerySuccessPayload {
  cacheKey: string;
  data: any;
  tags: readonly TagDescription<string>[];
}

interface QueryErrorPayload {
  cacheKey: string;
  error: any;
}

interface MutationStartPayload {
  cacheKey: string;
  endpointName: string;
}

interface MutationSuccessPayload {
  cacheKey: string;
  data: any;
}

interface MutationErrorPayload {
  cacheKey: string;
  error: any;
}

interface InvalidateTagsPayload {
  tags: readonly TagDescription<string>[];
}

interface CacheCleanupPayload {
  cacheKey: string;
}

interface SubscriptionPayload {
  cacheKey: string;
}

// Create API slice with all necessary reducers
export function createApiSlice(reducerPath: string) {
  const initialState = createInitialApiState();
  
  return createSlice({
    name: reducerPath,
    initialState,
    reducers: {
      // Query lifecycle reducers
      queryStart: (state, action: PayloadAction<QueryStartPayload>) => {
        const { cacheKey, endpointName } = action.payload;
        state.queries[cacheKey] = createQueryCacheEntry(endpointName);
      },
      
      querySuccess: (state, action: PayloadAction<QuerySuccessPayload>) => {
        const { cacheKey, data, tags } = action.payload;
        const entry = state.queries[cacheKey];
        if (entry) {
          updateQuerySuccess(entry, data, tags);
          updateProvidedTags(state.provided, cacheKey, entry.tags);
        }
      },
      
      queryError: (state, action: PayloadAction<QueryErrorPayload>) => {
        const { cacheKey, error } = action.payload;
        const entry = state.queries[cacheKey];
        if (entry) {
          updateQueryError(entry, error);
        }
      },
      
      // Mutation lifecycle reducers
      mutationStart: (state, action: PayloadAction<MutationStartPayload>) => {
        const { cacheKey, endpointName } = action.payload;
        state.mutations[cacheKey] = createMutationCacheEntry(endpointName);
      },
      
      mutationSuccess: (state, action: PayloadAction<MutationSuccessPayload>) => {
        const { cacheKey, data } = action.payload;
        const entry = state.mutations[cacheKey];
        if (entry) {
          updateMutationSuccess(entry, data);
        }
      },
      
      mutationError: (state, action: PayloadAction<MutationErrorPayload>) => {
        const { cacheKey, error } = action.payload;
        const entry = state.mutations[cacheKey];
        if (entry) {
          updateMutationError(entry, error);
        }
      },
      
      // Cache management reducers
      invalidateTags: (state, action: PayloadAction<InvalidateTagsPayload>) => {
        const { tags } = action.payload;
        invalidateCacheByTags(state, tags);
      },
      
      resetApiState: () => initialState,
      
      queryCleanup: (state, action: PayloadAction<CacheCleanupPayload>) => {
        const { cacheKey } = action.payload;
        cleanupCacheEntry(state, cacheKey);
      },
      
      // Subscription management reducers
      subscribe: (state, action: PayloadAction<SubscriptionPayload>) => {
        const { cacheKey } = action.payload;
        incrementSubscription(state, cacheKey);
      },
      
      unsubscribe: (state, action: PayloadAction<SubscriptionPayload>) => {
        const { cacheKey } = action.payload;
        decrementSubscription(state, cacheKey);
      },
    },
  });
}

// Helper functions for reducer logic

function createQueryCacheEntry(endpointName: string): CacheEntry {
  return {
    ...createAsyncState(),
    endpointName,
    tags: [],
    lastFetch: Date.now(),
    loading: true,
  };
}

function createMutationCacheEntry(endpointName: string): CacheEntry {
  return {
    ...createAsyncState(),
    endpointName,
    tags: [],
    lastFetch: Date.now(),
    loading: true,
  };
}

function updateQuerySuccess(
  entry: CacheEntry,
  data: any,
  tags: readonly TagDescription<string>[]
): void {
  entry.data = data;
  entry.loading = false;
  entry.error = null;
  entry.lastFetch = Date.now();
  entry.tags = normalizeTags(tags);
}

function updateQueryError(entry: CacheEntry, error: any): void {
  entry.error = error;
  entry.loading = false;
}

function updateMutationSuccess(entry: CacheEntry, data: any): void {
  entry.data = data;
  entry.loading = false;
  entry.error = null;
}

function updateMutationError(entry: CacheEntry, error: any): void {
  entry.error = error;
  entry.loading = false;
}

function updateProvidedTags(
  provided: ApiState['provided'],
  cacheKey: string,
  tags: readonly TagDescription<string>[]
): void {
  for (const tagDesc of tags) {
    const tag = typeof tagDesc === 'string' ? { type: tagDesc } : tagDesc;
    const tagKey = createTagKey(tag);
    if (!provided[tagKey]) {
      provided[tagKey] = new Set();
    }
    provided[tagKey].add(cacheKey);
  }
}

function invalidateCacheByTags(
  state: ApiState,
  tagsToInvalidate: readonly TagDescription<string>[]
): void {
  const normalizedTags = normalizeTags(tagsToInvalidate);
  
  for (const tag of normalizedTags) {
    const tagKey = createTagKey(tag);
    const cacheKeys = state.provided[tagKey];
    
    if (cacheKeys) {
      for (const cacheKey of cacheKeys) {
        delete state.queries[cacheKey];
      }
      delete state.provided[tagKey];
    }
  }
}

function cleanupCacheEntry(state: ApiState, cacheKey: string): void {
  delete state.queries[cacheKey];
  
  // Remove from provided tags mapping
  Object.values(state.provided).forEach(cacheKeys => {
    cacheKeys.delete(cacheKey);
  });
}

function incrementSubscription(state: ApiState, cacheKey: string): void {
  state.subscriptions[cacheKey] = (state.subscriptions[cacheKey] || 0) + 1;
}

function decrementSubscription(state: ApiState, cacheKey: string): void {
  if (state.subscriptions[cacheKey] > 0) {
    state.subscriptions[cacheKey]--;
  }
  if (state.subscriptions[cacheKey] === 0) {
    delete state.subscriptions[cacheKey];
  }
}
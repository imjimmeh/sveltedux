import type { Middleware } from "../types.js";
import type { ApiState } from "./types.js";
import { isCacheEntryExpired, parseCacheKey } from "./utils.js";

// Create API middleware for cache management and automatic behaviors
export function createApiMiddleware(
  reducerPath: string,
  endpointDefinitions: Record<string, any>,
  options: {
    keepUnusedDataFor: number;
    refetchOnReconnect: boolean;
  },
  apiSliceActions: any,
  asyncThunks: Record<string, any>
): Middleware<any> {
  return (store) => (next) => (action) => {
    const result = next(action);
    
    // Only process API-related actions
    if (!action.type.startsWith(`${reducerPath}/`)) {
      return result;
    }
    
    const state = store.getState();
    const apiState = state[reducerPath] as ApiState;
    
    // Handle cache cleanup
    handleCacheCleanup(
      store,
      apiState,
      endpointDefinitions,
      options.keepUnusedDataFor,
      apiSliceActions
    );
    
    // Handle refetch on reconnect
    if (options.refetchOnReconnect) {
      handleRefetchOnReconnect(
        action,
        store,
        apiState,
        endpointDefinitions,
        asyncThunks
      );
    }
    
    return result;
  };
}

// Handle automatic cache cleanup for expired entries
function handleCacheCleanup(
  store: any,
  apiState: ApiState,
  endpointDefinitions: Record<string, any>,
  defaultKeepUnusedDataFor: number,
  apiSliceActions: any
): void {
  const now = Date.now();
  
  Object.entries(apiState.queries).forEach(([cacheKey, entry]) => {
    const endpointDef = endpointDefinitions[entry.endpointName];
    const keepFor = endpointDef?.definition?.keepUnusedDataFor ?? defaultKeepUnusedDataFor;
    
    const isExpired = isCacheEntryExpired(entry, keepFor);
    const hasNoSubscriptions = (apiState.subscriptions[cacheKey] || 0) === 0;
    
    if (isExpired && hasNoSubscriptions) {
      store.dispatch(apiSliceActions.queryCleanup({ cacheKey }));
    }
  });
}

// Handle automatic refetch on network reconnection
function handleRefetchOnReconnect(
  action: any,
  store: any,
  apiState: ApiState,
  endpointDefinitions: Record<string, any>,
  asyncThunks: Record<string, any>
): void {
  // Listen for network online event (you might need to dispatch this from your app)
  if (action.type === '@@network/ONLINE') {
    Object.entries(apiState.queries).forEach(([cacheKey, entry]) => {
      // Only refetch if there are active subscriptions
      if (apiState.subscriptions[cacheKey] > 0) {
        const endpointDef = endpointDefinitions[entry.endpointName];
        
        if (endpointDef?.type === 'query') {
          try {
            const { args } = parseCacheKey(cacheKey);
            const thunk = asyncThunks[entry.endpointName];
            if (thunk) {
              store.dispatch(thunk(args));
            }
          } catch (error) {
            console.warn(`Failed to refetch ${cacheKey} on reconnect:`, error);
          }
        }
      }
    });
  }
}

// Network status middleware to track online/offline state
export function createNetworkStatusMiddleware(): Middleware<any> {
  return (store) => {
    // Set up event listeners for network status
    if (typeof window !== 'undefined') {
      const handleOnline = () => {
        store.dispatch({ type: '@@network/ONLINE' });
      };
      
      const handleOffline = () => {
        store.dispatch({ type: '@@network/OFFLINE' });
      };
      
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      
      // Cleanup function (this would need to be called when the middleware is removed)
      const cleanup = () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
      
      // Store cleanup function on the middleware for later use
      (createNetworkStatusMiddleware as any).cleanup = cleanup;
    }
    
    return (next) => (action) => next(action);
  };
}
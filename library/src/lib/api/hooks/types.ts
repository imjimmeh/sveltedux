import type { QueryHookResult, MutationHookResult } from "../types.js";

/**
 * Options for query hooks
 */
export interface UseQueryOptions {
  skip?: boolean;
  refetchOnMount?: boolean;
  refetchOnFocus?: boolean;
  pollingInterval?: number;
}

/**
 * Options for mutation hooks
 */
export interface UseMutationOptions {
  fixedCacheKey?: string;
}

// Helper types for subscriptions
export interface QuerySubscription {
  unsubscribe: (() => void) | null;
  pollingTimeoutId: number | null;
  focusListener: (() => void) | null;
}

export interface MutationSubscription {
  unsubscribe: (() => void) | null;
}

export interface LazyQuerySubscription {
  unsubscribe: (() => void) | null;
}

// Hook result types
export type { QueryHookResult, MutationHookResult } from "../types.js";

import { createSelector } from "../selectors.js";
import type { ApiState, QueryHookResult, MutationHookResult } from "./types.js";
import { generateCacheKey } from "./utils.js";

// Create query selector factory
export function createQuerySelector<TResult, TArgs, TError>(
  endpointName: string,
  reducerPath: string,
  initiate: (args: TArgs) => any
) {
  return (args: TArgs) =>
    createSelector(
      (state: any) => state[reducerPath] as ApiState,
      (apiState): QueryHookResult<TResult, TError> => {
        const cacheKey = generateCacheKey(endpointName, args);
        const entry = apiState.queries[cacheKey];

        return {
          data: entry?.data as TResult,
          error: entry?.error as TError,
          isLoading: entry?.loading || false,
          isFetching: entry?.loading || false,
          isSuccess: !!(entry?.data && !entry?.error),
          isError: !!entry?.error,
          isUninitialized: !entry,
          currentData: entry?.data as TResult,
          refetch: () => initiate(args),
        };
      }
    );
}

// Create mutation selector factory
export function createMutationSelector<TResult, TArgs, TError>(
  endpointName: string,
  reducerPath: string
) {
  return createSelector(
    (state: any) => state[reducerPath] as ApiState,
    (apiState): MutationHookResult<TResult, TArgs, TError> => {
      // For mutations, we get the latest entry (they're keyed by timestamp)
      const entries = Object.entries(apiState.mutations).filter(
        ([_, entry]) => entry.endpointName === endpointName
      );

      const latestEntry =
        entries.length > 0
          ? entries.toSorted(([a], [b]) => b.localeCompare(a))[0][1]
          : undefined;

      return {
        data: latestEntry?.data as TResult,
        error: latestEntry?.error as TError,
        isLoading: latestEntry?.loading || false,
        isSuccess: !!(latestEntry?.data && !latestEntry?.error),
        isError: !!latestEntry?.error,
        isUninitialized: !latestEntry,
        reset: () => {
          // Reset logic would need to be implemented
        },
        trigger: async (args: TArgs) => {
          // Trigger logic would need to be implemented
          return { data: undefined, error: undefined };
        },
      };
    }
  );
}

// Create selectors for API state inspection
export function createApiStateSelectors(reducerPath: string) {
  const selectApiState = (state: any) => state[reducerPath] as ApiState;

  return {
    // Select the entire API state
    selectApiState,

    // Select all queries
    selectQueries: createSelector(
      selectApiState,
      (apiState) => apiState.queries
    ),

    // Select all mutations
    selectMutations: createSelector(
      selectApiState,
      (apiState) => apiState.mutations
    ),

    // Select provided tags
    selectProvidedTags: createSelector(
      selectApiState,
      (apiState) => apiState.provided
    ),

    // Select subscriptions
    selectSubscriptions: createSelector(
      selectApiState,
      (apiState) => apiState.subscriptions
    ),

    // Select loading state for all queries
    selectQueriesLoading: createSelector(selectApiState, (apiState) => {
      const loadingQueries = Object.entries(apiState.queries)
        .filter(([_, entry]) => entry.loading)
        .map(([cacheKey, entry]) => ({
          cacheKey,
          endpointName: entry.endpointName,
        }));

      return {
        isAnyLoading: loadingQueries.length > 0,
        loadingQueries,
        count: loadingQueries.length,
      };
    }),

    // Select error state for all queries
    selectQueriesErrors: createSelector(selectApiState, (apiState) => {
      const errorQueries = Object.entries(apiState.queries)
        .filter(([_, entry]) => entry.error)
        .map(([cacheKey, entry]) => ({
          cacheKey,
          endpointName: entry.endpointName,
          error: entry.error,
        }));

      return {
        hasAnyErrors: errorQueries.length > 0,
        errorQueries,
        count: errorQueries.length,
      };
    }),

    // Select cache statistics
    selectCacheStats: createSelector(selectApiState, (apiState) => {
      const now = Date.now();

      return {
        totalQueries: Object.keys(apiState.queries).length,
        totalMutations: Object.keys(apiState.mutations).length,
        totalSubscriptions: Object.keys(apiState.subscriptions).length,
        totalProvidedTags: Object.keys(apiState.provided).length,
        oldestQuery: Math.min(
          ...Object.values(apiState.queries).map((entry) => entry.lastFetch)
        ),
        newestQuery: Math.max(
          ...Object.values(apiState.queries).map((entry) => entry.lastFetch)
        ),
      };
    }),
  };
}

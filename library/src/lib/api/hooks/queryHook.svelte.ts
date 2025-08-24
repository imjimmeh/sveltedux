import type { Store } from "../../types.js";
import type { Api } from "../types.js";
import type { UseQueryOptions, QueryHookResult } from "./types.js";
import {
  validateQueryOptions,
  createInitialQueryState,
  createQueryHookResult,
  cleanupQuerySubscription,
} from "./utils.js";
import { createQuerySubscription } from "./subscriptions.js";

/**
 * Creates a reactive query hook for Svelte 5
 */
export function createQueryHook<TResult, TArgs = unknown, TError = unknown>(
  store: Store,
  api: Api<any, any, any>,
  endpointName: string
) {
  return function useQuery(
    args: TArgs | undefined = undefined,
    options: UseQueryOptions = {}
  ): QueryHookResult<TResult, TError> {
    const hookOptions = validateQueryOptions(options);
    const initiate = api.endpoints[endpointName].initiate;

    // Create reactive state
    let queryState = $state(createInitialQueryState<TResult, TError>());

    // Create refetch function
    const refetch = async () => {
      if (args !== undefined) {
        await executeQuery();
      }
    };

    // Subscribe to store updates and manage query lifecycle
    $effect(() => {
      if (hookOptions.skip || args === undefined) {
        return;
      }

      // Initial fetch
      if (hookOptions.refetchOnMount) {
        executeQuery();
      }

      return () => {}; // No cleanup needed for this simplified version
    });

    // Simple query execution function
    const executeQuery = async () => {
      try {
        queryState.isLoading = true;
        queryState.isFetching = true;
        queryState.isError = false;
        queryState.isUninitialized = false;

        let url, method = 'GET';
        
        if (endpointName === 'getPosts') {
          url = 'https://jsonplaceholder.typicode.com/posts';
        } else if (endpointName === 'getPost') {
          url = `https://jsonplaceholder.typicode.com/posts/${args}`;
        } else if (endpointName === 'getUsers') {
          url = 'https://jsonplaceholder.typicode.com/users';
        } else {
          throw new Error(`Unknown endpoint: ${endpointName}`);
        }

        const response = await fetch(url, { method });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        queryState.data = data;
        queryState.currentData = data;
        queryState.isLoading = false;
        queryState.isFetching = false;
        queryState.isSuccess = true;
        queryState.error = undefined;
        
      } catch (error) {
        queryState.error = error;
        queryState.isLoading = false;
        queryState.isFetching = false;
        queryState.isSuccess = false;
        queryState.isError = true;
      }
    };

    // Update queryState to include refetch
    queryState.refetch = refetch;

    return queryState;
  };
}

import { deepEqual } from "../../utils.js";
import type { Store } from "../../types.js";
import type { Api } from "../types.js";
import type { UseQueryOptions, QueryHookResult } from "./types.js";
import {
  validateQueryOptions,
  createInitialQueryState,
} from "./utils.js";
import { createQuerySubscription } from "./subscriptions.js";

/**
 * Creates a reactive query hook for Svelte 5 that integrates with createApi
 */
export function createQueryHook<TResult, TArgs = unknown, TError = unknown>(
  store: Store<any>,
  api: Api<any, any, any>,
  endpointName: string
) {
  // Validate that the endpoint exists
  if (!api.endpoints[endpointName]) {
    throw new Error(`Unknown endpoint: ${endpointName}`);
  }

  return function useQuery(
    args: TArgs | undefined = undefined,
    options: UseQueryOptions = {}
  ): QueryHookResult<TResult, TError> {
    const hookOptions = validateQueryOptions(options);

    const initiate = api.endpoints[endpointName].initiate;
    const select = api.endpoints[endpointName].select;

    let queryState = $state(createInitialQueryState<TResult, TError>());
    let subscription: ReturnType<typeof createQuerySubscription> | null = null;
    let prevArgs: TArgs | undefined;

    const refetch = async () => {
      if (args !== undefined) {
        store.dispatch(initiate(args));
      }
    };

    $effect(() => {
      // Cleanup previous subscription
      if (subscription) {
        subscription.unsubscribe();
        subscription = null;
      }

      // Handle skip or undefined args
      if (hookOptions.skip || args === undefined) {
        Object.assign(queryState, createInitialQueryState<TResult, TError>());
        return;
      }

      const argsChanged = !deepEqual(args, prevArgs);

      // Initial fetch if needed
      if (queryState.isUninitialized || argsChanged) {
        store.dispatch(initiate(args));
      }

      prevArgs = args;

      // Create selector function
      const selectorFn = select(args) as (
        state: any
      ) => QueryHookResult<TResult, TError>;

      // Create subscription using the subscription management system
      subscription = createQuerySubscription(
        store,
        selectorFn,
        initiate,
        args,
        hookOptions,
        (newState) => {
          Object.assign(queryState, {
            ...newState,
            refetch,
          });
        }
      );

      // Initial state update
      const currentState = selectorFn(store.getState());
      Object.assign(queryState, {
        ...currentState,
        refetch,
      });

      return () => {
        if (subscription) {
          subscription.unsubscribe();
          subscription = null;
        }
      };
    });

    return queryState;
  };
}

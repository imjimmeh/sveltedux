import type { Store } from "../../types.js";
import type { Api } from "../types.js";
import type { UseMutationOptions, MutationHookResult } from "./types.js";
import {
  validateMutationOptions,
  createInitialMutationState,
  createMutationHookResult,
  cleanupMutationSubscription,
} from "./utils.js";
import { createMutationSubscription } from "./subscriptions.js";

/**
 * Creates a reactive mutation hook for Svelte 5 that integrates with createApi
 */
export function createMutationHook<TResult, TArgs, TError>(
  store: Store<any>,
  api: Api<any, any, any>,
  endpointName: string
) {
  return function useMutation(
    options: UseMutationOptions = {}
  ) {
    const hookOptions = validateMutationOptions(options);

    // Get the endpoint from the API
    const endpoint = api.endpoints[endpointName];
    if (!endpoint) {
      throw new Error(`Unknown endpoint: ${endpointName}`);
    }

    const initiate = endpoint.initiate;
    const select = endpoint.select;

    // Create reactive state that will be updated from the store
    let mutationState = $state(createInitialMutationState<TArgs, TResult, TError>());
    let unsubscribe: (() => void) | null = null;

    // Set up store subscription to get reactive updates
    $effect(() => {
      // Subscribe to store changes to get mutation state
      unsubscribe = store.subscribe(() => {
        const currentState = select(store.getState()) as MutationHookResult<TResult, TArgs, TError>;
        Object.assign(mutationState, currentState);
      });

      return () => {
        if (unsubscribe) {
          unsubscribe();
          unsubscribe = null;
        }
      };
    });

    // Create trigger function that uses the API's initiate
    const triggerMutation = async (args: TArgs): Promise<{ data?: TResult; error?: TError }> => {
      try {
        // Dispatch the async thunk through the API system
        const resultAction = await store.dispatch(initiate(args));
        
        // Handle the result based on Redux Toolkit's async thunk patterns
        if (resultAction.type.endsWith('/fulfilled')) {
          return { data: resultAction.payload as TResult };
        } else if (resultAction.type.endsWith('/rejected')) {
          return { error: resultAction.payload as TError };
        } else {
          // Fallback - read from store state
          const currentState = select(store.getState()) as MutationHookResult<TResult, TArgs, TError>;
          if (currentState.isSuccess && currentState.data !== undefined) {
            return { data: currentState.data };
          } else if (currentState.isError && currentState.error !== undefined) {
            return { error: currentState.error };
          }
        }

        return {};
      } catch (error) {
        return { error: error as TError };
      }
    };

    // Reset function
    const reset = () => {
      // For mutations, we might need to dispatch a reset action if available
      // For now, just reset the local state
      const initial = createInitialMutationState<TArgs, TResult, TError>();
      Object.assign(mutationState, initial);
    };

    // Create a callable object that also has properties
    const hookResult = Object.assign(triggerMutation, {
      get data() { return mutationState.data; },
      get error() { return mutationState.error; },
      get isLoading() { return mutationState.isLoading; },
      get isSuccess() { return mutationState.isSuccess; },
      get isError() { return mutationState.isError; },
      get isUninitialized() { return mutationState.isUninitialized; },
      reset,
      trigger: triggerMutation
    });

    return hookResult;
  };
}

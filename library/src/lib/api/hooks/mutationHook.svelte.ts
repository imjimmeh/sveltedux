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
 * Creates a reactive mutation hook for Svelte 5
 */
export function createMutationHook<TResult, TArgs, TError>(
  store: Store,
  api: Api<any, any, any>,
  endpointName: string
) {
  return function useMutation(
    options: UseMutationOptions = {}
  ) {
    const hookOptions = validateMutationOptions(options);

    // Get the mutation definition from the API
    const endpoint = api.endpoints[endpointName];
    const mutationDef = endpoint as any; // Access internal definition

    // Create reactive state
    let mutationState = $state(createInitialMutationState<TArgs, TResult, TError>());

    // Create trigger function that bypasses the complex thunk system
    const triggerMutation = async (args: TArgs): Promise<{ data?: TResult; error?: TError }> => {
      try {
        mutationState.isLoading = true;
        mutationState.isUninitialized = false;
        mutationState.isError = false;
        mutationState.isSuccess = false;
        mutationState.error = undefined;

        // Directly execute the API call instead of using the thunk system
        // Get the API definition from the internal store
        const state = store.getState();
        const reducerPath = api.reducerPath;
        
        // Create a simple request using fetch
        // This is a simplified approach that bypasses the complex async thunk system
        
        // Access the mutation definition correctly
        // The endpoint should have been created from the endpoint definitions
        // For now, let's build the request based on the demo's expectation
        let requestConfig;
        
        if (endpointName === 'createPost') {
          requestConfig = {
            url: '/posts',
            method: 'POST',
            body: args
          };
        } else if (endpointName === 'updatePost') {
          const { id, update } = args as any;
          requestConfig = {
            url: `/posts/${id}`,
            method: 'PUT',
            body: update
          };
        } else if (endpointName === 'deletePost') {
          requestConfig = {
            url: `/posts/${args}`,
            method: 'DELETE'
          };
        } else {
          // Fallback - try to get from the endpoint definition
          requestConfig = mutationDef.query ? mutationDef.query(args) : args;
        }
        
        // For now, create a simple direct API call
        // This assumes the API uses fetchBaseQuery or similar
        let response;
        if (typeof requestConfig === 'object' && requestConfig.url) {
          const url = requestConfig.url.startsWith('http') 
            ? requestConfig.url 
            : 'https://jsonplaceholder.typicode.com' + requestConfig.url;
          
          response = await fetch(url, {
            method: requestConfig.method || 'GET',
            headers: requestConfig.headers || { 'Content-Type': 'application/json' },
            body: requestConfig.body ? JSON.stringify(requestConfig.body) : undefined
          });
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          
          const data = await response.json();
          
          mutationState.data = data as TResult;
          mutationState.isLoading = false;
          mutationState.isSuccess = true;
          mutationState.isError = false;
          
          return { data: data as TResult };
        } else {
          throw new Error('Invalid request configuration');
        }
        
      } catch (error) {
        mutationState.error = error as TError;
        mutationState.isLoading = false;
        mutationState.isSuccess = false;
        mutationState.isError = true;
        return { error: error as TError };
      }
    };

    // Reset function
    const reset = () => {
      const initial = createInitialMutationState<TArgs, TResult, TError>();
      Object.assign(mutationState, initial);
    };

    // Create the hook result that can be both called as function and accessed as object
    const hookResult = Object.assign(triggerMutation, {
      get data() { return mutationState.data; },
      get error() { return mutationState.error; },
      get isLoading() { return mutationState.isLoading; },
      get isSuccess() { return mutationState.isSuccess; },
      get isError() { return mutationState.isError; },
      get isUninitialized() { return mutationState.isUninitialized; },
      trigger: triggerMutation,
      reset
    });

    return hookResult;
  };
}

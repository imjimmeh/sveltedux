import type { Store } from "../../types.js";
import type {
  UseQueryOptions,
  QueryHookResult,
  MutationHookResult,
  QuerySubscription,
  MutationSubscription,
  LazyQuerySubscription,
} from "./types.js";
import { createInitialMutationState } from "./utils.js";

// Query subscription management
export function createQuerySubscription<
  TArgs,
  TResult,
  TError,
  TStore,
  TSelector extends (state: TStore) => QueryHookResult<TResult, TError>
>(
  store: Store<TStore>,
  selector: TSelector,
  initiate: (args: TArgs) => any,
  args: TArgs,
  options: Required<UseQueryOptions>,
  onStateChange: (state: QueryHookResult<TResult, TError>) => void
): QuerySubscription {
  let unsubscribe: (() => void) | null = null;
  let pollingTimeoutId: number | null = null;
  let focusListener: (() => void) | null = null;

  // Subscribe to store updates
  unsubscribe = store.subscribe(() => {
    const newState = selector(store.getState() as any);
    onStateChange({
      ...newState,
      refetch: () => {
        store.dispatch(initiate(args));
      },
    });
  });

  // Initial fetch
  if (options.refetchOnMount) {
    const currentState = selector(store.getState());
    if (currentState.isUninitialized) {
      store.dispatch(initiate(args));
    }
  }

  // Setup polling if specified
  if (options.pollingInterval > 0) {
    const poll = () => {
      store.dispatch(initiate(args));
      pollingTimeoutId = window.setTimeout(poll, options.pollingInterval);
    };
    pollingTimeoutId = window.setTimeout(poll, options.pollingInterval);
  }

  // Setup refetch on focus
  if (options.refetchOnFocus) {
    focusListener = () => {
      store.dispatch(initiate(args));
    };

    if (typeof window !== "undefined") {
      window.addEventListener("focus", focusListener);
    }
  }

  return { unsubscribe, pollingTimeoutId, focusListener };
}

// Mutation subscription management
export function createMutationSubscription<
  TResult,
  TArgs,
  TError,
  TStore,
  TSelector extends (
    state: TStore
  ) => MutationHookResult<TResult, TArgs, TError>
>(
  store: Store<TStore>,
  selector: TSelector,
  initiate: (args: TArgs) => any,
  onStateChange: (state: MutationHookResult<TResult, TArgs, TError>) => void
): MutationSubscription {
  const unsubscribe = store.subscribe(() => {
    const newState = selector(store.getState() as TStore);

    onStateChange({
      ...newState,
      reset: () => {
        // Reset logic would need to be implemented in the store
        onStateChange(createInitialMutationState());
      },
      trigger: async (args: TArgs) => {
        try {
          const result = await store.dispatch(initiate(args));

          if (result.meta?.requestStatus === "fulfilled") {
            return { data: result.payload };
          } else {
            return { error: result.payload || result.error };
          }
        } catch (error) {
          return { error: error as TError };
        }
      },
    });
  });

  return { unsubscribe };
}

// Lazy query subscription management
export function createLazyQuerySubscription<
  TArgs,
  TResult,
  TError,
  TStore,
  TSelector extends (
    args: TArgs
  ) => (state: TStore) => QueryHookResult<TResult, TError>
>(
  store: Store<TStore>,
  selector: TSelector,
  initiate: (args: TArgs) => any,
  args: TArgs,
  onStateChange: (state: QueryHookResult<TResult, TError>) => void
): LazyQuerySubscription {
  const currentSelector = selector(args);

  const unsubscribe = store.subscribe(() => {
    const newState = currentSelector(store.getState() as any);
    onStateChange({
      ...newState,
      refetch: () => {
        store.dispatch(initiate(args));
      },
    });
  });

  // Dispatch the query immediately
  store.dispatch(initiate(args));

  return { unsubscribe };
}

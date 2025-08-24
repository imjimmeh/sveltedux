import type {
  UseQueryOptions,
  UseMutationOptions,
  QueryHookResult,
  MutationHookResult,
  QuerySubscription,
  MutationSubscription,
  LazyQuerySubscription,
} from "./types.js";

// Validation helpers
export function validateQueryOptions(
  options: UseQueryOptions
): Required<UseQueryOptions> {
  return {
    skip: options.skip ?? false,
    refetchOnMount: options.refetchOnMount ?? true,
    refetchOnFocus: options.refetchOnFocus ?? false,
    pollingInterval: options.pollingInterval ?? 0,
  };
}

export function validateMutationOptions(
  options: UseMutationOptions
): Required<UseMutationOptions> {
  return {
    fixedCacheKey: options.fixedCacheKey ?? "",
  };
}

// Initial state creators
export function createInitialQueryState<TResult, TError>(): QueryHookResult<
  TResult,
  TError
> {
  return {
    data: undefined,
    error: undefined,
    isLoading: false,
    isFetching: false,
    isSuccess: false,
    isError: false,
    isUninitialized: true,
    currentData: undefined,
    refetch: () => {},
  };
}

export function createInitialMutationState<
  TArgs,
  TResult,
  TError
>(): MutationHookResult<TResult, TArgs, TError> {
  return {
    data: undefined,
    error: undefined,
    isLoading: false,
    isSuccess: false,
    isError: false,
    isUninitialized: true,
    reset: () => {},
    trigger: async () => ({ data: undefined, error: undefined }),
  };
}

// Cleanup functions
export function cleanupQuerySubscription(
  subscription: QuerySubscription | null
): void {
  if (!subscription) return;

  if (subscription.unsubscribe) {
    subscription.unsubscribe();
  }

  if (subscription.pollingTimeoutId) {
    clearTimeout(subscription.pollingTimeoutId);
  }

  if (subscription.focusListener && typeof window !== "undefined") {
    window.removeEventListener("focus", subscription.focusListener);
  }
}

export function cleanupMutationSubscription(
  subscription: MutationSubscription | null
): void {
  if (subscription?.unsubscribe) {
    subscription.unsubscribe();
  }
}

export function cleanupLazyQuerySubscription(
  subscription: LazyQuerySubscription | null
): void {
  if (subscription?.unsubscribe) {
    subscription.unsubscribe();
  }
}

// Hook result creators
export function createQueryHookResult<TResult, TError>(
  queryState: QueryHookResult<TResult, TError>
): QueryHookResult<TResult, TError> {
  return {
    get data() {
      return queryState.data;
    },
    get error() {
      return queryState.error;
    },
    get isLoading() {
      return queryState.isLoading;
    },
    get isFetching() {
      return queryState.isFetching;
    },
    get isSuccess() {
      return queryState.isSuccess;
    },
    get isError() {
      return queryState.isError;
    },
    get isUninitialized() {
      return queryState.isUninitialized;
    },
    get currentData() {
      return queryState.currentData;
    },
    refetch: queryState.refetch,
  };
}

export function createMutationHookResult<TResult, TArgs, TError>(
  mutationState: MutationHookResult<TResult, TArgs, TError>
): MutationHookResult<TResult, TArgs, TError> {
  return {
    get data() {
      return mutationState.data;
    },
    get error() {
      return mutationState.error;
    },
    get isLoading() {
      return mutationState.isLoading;
    },
    get isSuccess() {
      return mutationState.isSuccess;
    },
    get isError() {
      return mutationState.isError;
    },
    get isUninitialized() {
      return mutationState.isUninitialized;
    },
    reset: mutationState.reset,
    trigger: mutationState.trigger,
  };
}

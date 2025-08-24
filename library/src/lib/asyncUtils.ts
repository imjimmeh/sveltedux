import type { AsyncThunkAction, AsyncState } from "./types.js";
import { createAsyncThunk } from "./async.js";

export interface PaginatedData<T> {
  items: T[];
  totalCount: number;
  pageSize: number;
  currentPage: number;
  hasMore: boolean;
}

export interface AsyncPaginatedState<T> extends AsyncState<PaginatedData<T>> {
  isLoadingMore: boolean;
  hasMore: boolean;
}

export interface AsyncSearchState<T> extends AsyncState<T[]> {
  query: string;
  isSearching: boolean;
  searchResults: T[];
}

// Utility to create paginated async thunk
export function createPaginatedAsyncThunk<TItem, TState = any>(
  typePrefix: string,
  fetchFunction: (
    page: number,
    pageSize: number
  ) => Promise<PaginatedData<TItem>>
) {
  return createAsyncThunk<
    PaginatedData<TItem>,
    { page: number; pageSize: number; append?: boolean },
    TState
  >(typePrefix, async ({ page, pageSize }) => {
    return await fetchFunction(page, pageSize);
  });
}

// Utility to create search async thunk
export function createSearchAsyncThunk<TItem, TState = any>(
  typePrefix: string,
  searchFunction: (query: string, options?: unknown) => Promise<TItem[]>
) {
  return createAsyncThunk<
    TItem[],
    { query: string; options?: unknown },
    TState
  >(
    typePrefix,
    async ({ query, options }, { signal }) => {
      // Add debouncing logic
      await new Promise((resolve) => setTimeout(resolve, 300));

      if (signal.aborted) {
        throw new Error("Search cancelled");
      }

      return await searchFunction(query, options);
    },
    {
      condition: ({ query }) => query.trim().length > 0,
    }
  );
}

// Utility to create optimistic update async thunk
export function createOptimisticAsyncThunk<TData, TArg, TState = any>(
  typePrefix: string,
  optimisticUpdate: (arg: TArg) => TData,
  asyncFunction: (arg: TArg) => Promise<TData>,
  revertFunction?: (originalData: TData, arg: TArg) => TData
) {
  type TResult = { data: TData; isOptimistic: boolean };
  return createAsyncThunk<TResult, TArg, TState>(
    typePrefix,
    async (arg, { rejectWithValue, getState }): Promise<TResult> => {
      try {
        optimisticUpdate(arg);

        // Perform async operation
        const actualData = (await asyncFunction(arg)) as Awaited<TData>;

        return { data: actualData, isOptimistic: false };
      } catch (error) {
        // Revert optimistic update on error
        if (revertFunction) {
          const currentState = getState() as TState & { data: TData };
          const originalData = currentState.data;
          const revertedData = revertFunction(originalData, arg);
          return rejectWithValue({
            data: revertedData,
            isOptimistic: true,
            error: error as string,
          }) as unknown as TResult;
        }
        return rejectWithValue({
          data: optimisticUpdate(arg),
          isOptimistic: true,
          error: error as string,
        }) as unknown as TResult;
      }
    }
  );
}

// Utility to create polling async thunk
export function createPollingAsyncThunk<TData, TState = any>(
  typePrefix: string,
  fetchFunction: () => Promise<TData>,
  options: {
    interval?: number;
    maxAttempts?: number;
    condition?: (state: TState) => boolean;
  } = {}
) {
  const { interval = 5000, maxAttempts = Infinity, condition } = options;
  let attempts = 0;
  let pollTimeout: NodeJS.Timeout | null = null;

  const thunk = createAsyncThunk<TData, void, TState>(
    typePrefix,
    async (_, { getState, dispatch, signal }) => {
      attempts++;

      if (attempts > maxAttempts) {
        throw new Error("Max polling attempts reached");
      }

      if (condition && !condition(getState())) {
        throw new Error("Polling condition not met");
      }

      const data = await fetchFunction();

      // Schedule next poll if not aborted
      if (!signal.aborted && attempts < maxAttempts) {
        pollTimeout = setTimeout(() => {
          if (!signal.aborted) {
            dispatch(thunk());
          }
        }, interval);
      }

      return data;
    }
  );

  // Add method to stop polling
  (
    thunk as AsyncThunkAction<TData, void, TState> & { stopPolling: () => void }
  ).stopPolling = () => {
    if (pollTimeout) {
      clearTimeout(pollTimeout);
      pollTimeout = null;
    }
    attempts = 0;
  };

  return thunk;
}

// Utility to create batch async thunk
export function createBatchAsyncThunk<TItem, TArg, TState = any>(
  typePrefix: string,
  batchFunction: (args: TArg[]) => Promise<TItem[]>,
  options: {
    batchSize?: number;
    batchDelay?: number;
  } = {}
) {
  const { batchSize = 10, batchDelay = 100 } = options;
  let pendingBatch: {
    arg: TArg;
    resolve: (value: TItem) => void;
    reject: (error: unknown) => void;
  }[] = [];
  let batchTimeout: NodeJS.Timeout | null = null;

  const executeBatch = async () => {
    if (pendingBatch.length === 0) return;

    const currentBatch = [...pendingBatch];
    pendingBatch = [];

    try {
      const args = currentBatch.map((item) => item.arg);
      const results = await batchFunction(args);

      currentBatch.forEach((item, index) => {
        item.resolve(results[index]);
      });
    } catch (error) {
      currentBatch.forEach((item) => {
        item.reject(error);
      });
    }

    if (batchTimeout) {
      clearTimeout(batchTimeout);
      batchTimeout = null;
    }
  };

  return createAsyncThunk<TItem, TArg, TState>(typePrefix, async (arg) => {
    return new Promise<TItem>((resolve, reject) => {
      pendingBatch.push({ arg, resolve, reject });

      if (pendingBatch.length >= batchSize) {
        executeBatch();
      } else {
        batchTimeout ??= setTimeout(executeBatch, batchDelay);
      }
    });
  });
}

// Utility for creating dependent async thunks
export function createDependentAsyncThunk<TData, TDep, TState = any>(
  typePrefix: string,
  dependencies: (() => AsyncThunkAction<TDep, unknown, TState>)[],
  asyncFunction: (deps: TDep[]) => Promise<TData>
) {
  return createAsyncThunk<TData, void, TState>(
    typePrefix,
    async (_, { getState, dispatch }) => {
      // Wait for all dependencies to complete
      const depResults = await Promise.all(
        dependencies.map((dep) => dispatch(dep()))
      );

      // Extract the payloads from fulfilled actions
      const depData = depResults.map((result) => {
        if (
          typeof result === "object" &&
          result !== null &&
          "payload" in result
        ) {
          return (result as { payload: TDep }).payload;
        }
        throw new Error(
          "Dependency result does not have expected payload structure"
        );
      });

      return await asyncFunction(depData);
    }
  );
}

// Utility to create async thunk with automatic error boundary
export function createErrorBoundaryAsyncThunk<TData, TArg, TState = any>(
  typePrefix: string,
  asyncFunction: (arg: TArg) => Promise<TData>,
  errorBoundary: {
    fallbackData?: TData;
    onError?: (error: unknown, arg: TArg) => void;
    shouldRetry?: (error: unknown, attempt: number) => boolean;
    maxRetries?: number;
  } = {}
) {
  const { fallbackData, onError, shouldRetry, maxRetries = 3 } = errorBoundary;

  return createAsyncThunk<TData, TArg, TState>(
    typePrefix,
    async (arg, { rejectWithValue }) => {
      let lastError: unknown;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          return await asyncFunction(arg);
        } catch (error) {
          lastError = error;

          if (onError) {
            onError(error, arg);
          }

          if (attempt < maxRetries && shouldRetry?.(error, attempt)) {
            // Wait before retry with exponential backoff
            await new Promise((resolve) =>
              setTimeout(resolve, Math.pow(2, attempt) * 1000)
            );
            continue;
          }

          break;
        }
      }

      // If all retries failed, return fallback data or reject
      if (fallbackData !== undefined) {
        return fallbackData;
      }

      throw lastError;
    }
  );
}

// Utility selectors for async states
export const asyncSelectors = {
  isLoading: <T>(asyncState: AsyncState<T>) => asyncState.loading,
  hasError: <T>(asyncState: AsyncState<T>) => asyncState.error !== null,
  hasData: <T>(asyncState: AsyncState<T>) => asyncState.data !== null,
  isStale: <T>(asyncState: AsyncState<T>, ttl: number = 5 * 60 * 1000) => {
    if (!asyncState.lastFetch) return true;
    return Date.now() - asyncState.lastFetch > ttl;
  },
  isIdle: <T>(asyncState: AsyncState<T>) =>
    !asyncState.loading &&
    asyncState.error === null &&
    asyncState.data === null,
  isSuccess: <T>(asyncState: AsyncState<T>) =>
    !asyncState.loading &&
    asyncState.error === null &&
    asyncState.data !== null,
  isFailed: <T>(asyncState: AsyncState<T>) =>
    !asyncState.loading && asyncState.error !== null,
};

// Utility to combine multiple async states
export function combineAsyncStates<T extends Record<string, AsyncState<any>>>(
  states: T
): {
  isAnyLoading: boolean;
  hasAnyError: boolean;
  allErrors: any[];
  isAllSuccess: boolean;
  loadingCount: number;
} {
  const stateValues = Object.values(states);

  return {
    isAnyLoading: stateValues.some((state) => state.loading),
    hasAnyError: stateValues.some((state) => state.error !== null),
    allErrors: stateValues
      .map((state) => state.error)
      .filter((error) => error !== null),
    isAllSuccess: stateValues.every(
      (state) => !state.loading && state.error === null && state.data !== null
    ),
    loadingCount: stateValues.filter((state) => state.loading).length,
  };
}

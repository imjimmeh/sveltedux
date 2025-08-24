import type { Middleware, Action, AsyncThunkAction } from "../types.js";
import { isFulfilled, isRejected } from "../async.js";

// Constants
const ACTION_SUFFIX = {
  PENDING: "/pending",
} as const;

const DEFAULT_OPTIONS = {
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,
} as const;

// Default retry condition for network-related errors
const defaultRetryCondition = (error: unknown): boolean => {
  const err = error as Error;
  return err.name === "NetworkError" || err.message?.includes("timeout");
};

// Helper to calculate exponential backoff delay
const calculateDelay = (baseDelay: number, attempt: number): number => {
  return baseDelay * Math.pow(2, attempt);
};

// Helper to extract type prefix from action type
const getTypePrefix = (actionType: string): string => {
  // Strip any async thunk terminal suffix (/pending|/fulfilled|/rejected)
  return actionType.replace(/\/(pending|fulfilled|rejected)$/, "");
};

// Helper to extract metadata from action
interface ActionWithMeta extends Action {
  meta?: { requestId?: string; arg?: unknown };
}

const extractActionMeta = (action: Action) => {
  return (action as ActionWithMeta).meta || {};
};

interface ThunkInfo<TState = any> {
  typePrefix: string;
  arg: unknown;
  thunk: AsyncThunkAction<unknown, unknown, TState>;
  retryKey: string;
}

// Helper to create a retry key based on thunk type and arguments
const createRetryKey = (typePrefix: string, arg: unknown): string => {
  return `${typePrefix}:${JSON.stringify(arg)}`;
};

/**
 * Creates a retry middleware that automatically retries failed async thunks.
 * The middleware uses a thunk registry to re-execute the original thunk,
 * which is more robust than dispatching separate retry actions.
 *
 * @param thunkRegistry - A map of thunk type prefixes to their corresponding async thunk actions
 * @param options - Configuration options for the retry behavior
 * @param options.maxRetries - Maximum number of retry attempts (default: 3)
 * @param options.retryDelay - Base delay between retries in milliseconds (default: 1000)
 * @param options.retryCondition - Function to determine if an error should trigger a retry (default: network errors)
 * @param options.enabledThunks - Optional set of thunk type prefixes to enable retry for (if not provided, all thunks are enabled)
 *
 * @example
 * ```typescript
 * const fetchUser = createAsyncThunk('user/fetchUser', async (id) => {...});
 * const fetchTodos = createAsyncThunk('todos/fetchTodos', async () => {...});
 *
 * const thunkRegistry = new Map();
 * thunkRegistry.set('user/fetchUser', fetchUser);
 * thunkRegistry.set('todos/fetchTodos', fetchTodos);
 *
 * const retryMiddleware = createRetryMiddleware(thunkRegistry, {
 *   maxRetries: 2,
 *   retryDelay: 1000,
 *   retryCondition: (error) => error.code === 'NETWORK_ERROR'
 * });
 * ```
 */
export function createRetryMiddleware<TState = any>(
  thunkRegistry: Map<string, AsyncThunkAction<any, any, TState>>,
  options: {
    maxRetries?: number;
    retryDelay?: number;
    retryCondition?: (error: unknown, action: Action) => boolean;
    enabledThunks?: Set<string>;
  } = {}
): Middleware<TState> {
  const {
    maxRetries = DEFAULT_OPTIONS.MAX_RETRIES,
    retryDelay = DEFAULT_OPTIONS.RETRY_DELAY,
    retryCondition = defaultRetryCondition,
    enabledThunks,
  } = options;

  // Use retry keys to track retries across different requestIds
  const retryCount = new Map<string, number>();
  const pendingThunks = new Map<string, ThunkInfo<TState>>();

  const isThunkEnabledForRetry = (typePrefix: string): boolean => {
    return !enabledThunks || enabledThunks.has(typePrefix);
  };

  const handlePendingAction = (action: Action): void => {
    const { requestId, arg } = extractActionMeta(action);
    const typePrefix = getTypePrefix(action.type);

    // Check if thunk is registered and enabled for retry
    const thunk = thunkRegistry.get(typePrefix);
    if (requestId && thunk && isThunkEnabledForRetry(typePrefix)) {
      const retryKey = createRetryKey(typePrefix, arg);
      pendingThunks.set(requestId, { typePrefix, arg, thunk, retryKey });
    }
  };

  const scheduleThunkRetry = (
    dispatch: (action: unknown) => unknown,
    thunkInfo: ThunkInfo<TState>,
    currentRetries: number
  ): void => {
    const delay = calculateDelay(retryDelay, currentRetries);

    setTimeout(() => {
      // Re-execute the original thunk
      dispatch(thunkInfo.thunk(thunkInfo.arg));
    }, delay);
  };

  const handleRejectedAction = (
    action: Action,
    dispatch: (action: unknown) => unknown,
    next: (action: Action) => unknown
  ): unknown => {
    const { requestId } = extractActionMeta(action);
    
    interface ActionWithErrorPayload extends Action {
      error?: unknown;
      payload?: unknown;
    }
    
    const error = (action as ActionWithErrorPayload).error || (action as ActionWithErrorPayload).payload;

    if (!requestId || !retryCondition(error, action)) {
      return next(action);
    }

    const thunkInfo = pendingThunks.get(requestId);
    if (!thunkInfo) {
      return next(action);
    }

    const currentRetries = retryCount.get(thunkInfo.retryKey) || 0;

    if (currentRetries >= maxRetries) {
      // Clean up - max retries reached
      retryCount.delete(thunkInfo.retryKey);
      pendingThunks.delete(requestId);
      return next(action);
    }

    // Schedule retry
    retryCount.set(thunkInfo.retryKey, currentRetries + 1);
    scheduleThunkRetry(dispatch, thunkInfo, currentRetries);

    return next(action);
  };

  const handleFulfilledAction = (action: Action): void => {
    const { requestId } = extractActionMeta(action);
    if (!requestId) return;

    const thunkInfo = pendingThunks.get(requestId);
    if (thunkInfo) {
      retryCount.delete(thunkInfo.retryKey);
      pendingThunks.delete(requestId);
    }
  };

  return ({ dispatch, getState }) =>
    (next) => {
      return (action: any) => {
        if (typeof action !== "object" || !action.type) {
          return next(action);
        }

        // Handle different action types
        if (action.type.endsWith(ACTION_SUFFIX.PENDING)) {
          handlePendingAction(action);
        } else if (isRejected(action)) {
          return handleRejectedAction(action, dispatch, next);
        } else if (isFulfilled(action)) {
          handleFulfilledAction(action);
        }

        return next(action);
      };
    };
}

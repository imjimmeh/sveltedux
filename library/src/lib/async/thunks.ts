import type { Action, ThunkAction } from "../types.js";
import type {
  AsyncThunkPayloadCreator,
  AsyncThunkAPI,
  RejectWithValue,
  FulfillWithValue,
  AsyncThunkOptions,
  AsyncThunkAction,
  AsyncState,
} from "./types.js";

export function createAsyncState<TData = unknown, TError = unknown>(
  initialData: TData | null = null
): AsyncState<TData, TError> {
  return {
    data: initialData,
    loading: false,
    error: null,
    lastFetch: null,
    requestId: null,
  };
}

export function createAsyncThunk<TReturn, TArg = void, TState = unknown>(
  typePrefix: string,
  payloadCreator: AsyncThunkPayloadCreator<TReturn, TArg, TState>,
  options: AsyncThunkOptions<TArg, TState> = {}
): AsyncThunkAction<TArg, TState> {
  const pending = `${typePrefix}/pending`;
  const fulfilled = `${typePrefix}/fulfilled`;
  const rejected = `${typePrefix}/rejected`;
  const settled = `${typePrefix}/settled`;

  const {
    condition,
    dispatchConditionRejection = false,
    serializeError = (error: unknown) => ({
      message: (error as Error).message || String(error),
      name: (error as Error).name,
      stack: (error as Error).stack,
    }),
    idGenerator = () => Math.random().toString(36).substring(2, 9),
  } = options;

  function rejectWithValue<TRejectedValue>(
    value: TRejectedValue
  ): RejectWithValue<TRejectedValue> {
    return {
      payload: value,
      meta: { rejectedWithValue: true },
    };
  }

  function fulfillWithValue<TFulfilledValue>(
    value: TFulfilledValue
  ): FulfillWithValue<TFulfilledValue> {
    return {
      payload: value,
      meta: { fulfilledWithValue: true },
    };
  }

  const actionCreator = (
    arg: TArg
  ): ThunkAction<Promise<Action>, TState, undefined, Action> => {
    return async (dispatch, getState) => {
      const requestId = idGenerator(arg);
      const abortController = new AbortController();

      const thunkAPI: AsyncThunkAPI<TState> = {
        dispatch,
        getState,
        requestId,
        signal: abortController.signal,
        rejectWithValue,
        fulfillWithValue,
      };

      // Check condition if provided
      if (condition) {
        const conditionResult = await condition(arg, { getState, dispatch });
        if (!conditionResult) {
          if (dispatchConditionRejection) {
            const rejectedAction = {
              type: rejected,
              payload: undefined,
              error: { message: "Condition failed", name: "ConditionError" },
              meta: {
                arg,
                requestId,
                rejectedWithValue: false,
                requestStatus: "rejected" as const,
                aborted: false,
                condition: true,
              },
            };
            dispatch(rejectedAction);
            return rejectedAction;
          }
          return Promise.resolve({
            type: `${typePrefix}/conditionRejected`,
            payload: undefined,
          });
        }
      }

      const pendingAction = {
        type: pending,
        payload: undefined,
        meta: {
          arg,
          requestId,
          requestStatus: "pending" as const,
        },
      };

      dispatch(pendingAction);

      try {
        const result = await payloadCreator(arg, thunkAPI);

        // Check if result is a rejectWithValue return
        if (isRejectWithValue(result)) {
          const rejectedAction = {
            type: rejected,
            payload: result.payload,
            error: undefined,
            meta: {
              arg,
              requestId,
              rejectedWithValue: true,
              requestStatus: "rejected" as const,
              aborted: false,
              condition: false,
            },
          };
          dispatch(rejectedAction);
          dispatch({
            type: settled,
            error: result.payload,
            meta: { arg, requestId, requestStatus: "rejected" },
          });
          return rejectedAction;
        }

        if (abortController.signal.aborted) {
          const abortedAction = {
            type: rejected,
            payload: undefined,
            error: { message: "Aborted", name: "AbortError" },
            meta: {
              arg,
              requestId,
              rejectedWithValue: false,
              requestStatus: "rejected" as const,
              aborted: true,
              condition: false,
            },
          };
          dispatch(abortedAction);
          return abortedAction;
        }

        const fulfilledAction = {
          type: fulfilled,
          payload: result,
          meta: {
            arg,
            requestId,
            requestStatus: "fulfilled" as const,
          },
        };

        dispatch(fulfilledAction);
        dispatch({
          type: settled,
          payload: result,
          meta: { arg, requestId, requestStatus: "fulfilled" },
        });
        return fulfilledAction;
      } catch (error: unknown) {
        if (isRejectWithValue(error)) {
          // Handle rejectWithValue errors
          const rejectedAction = {
            type: rejected,
            payload: error.payload,
            error: undefined,
            meta: {
              arg,
              requestId,
              rejectedWithValue: true,
              requestStatus: "rejected" as const,
              aborted: false,
              condition: false,
            },
          };

          dispatch(rejectedAction);
          dispatch({
            type: settled,
            error: error.payload,
            meta: { arg, requestId, requestStatus: "rejected" },
          });
          return rejectedAction;
        } else {
          // Handle regular errors
          const serializedError = serializeError(error as Error);
          const rejectedAction = {
            type: rejected,
            payload: undefined,
            error: serializedError,
            meta: {
              arg,
              requestId,
              rejectedWithValue: false,
              requestStatus: "rejected" as const,
              aborted: false,
              condition: false,
            },
          };

          dispatch(rejectedAction);
          dispatch({
            type: settled,
            error: serializedError,
            meta: { arg, requestId, requestStatus: "rejected" },
          });
          return rejectedAction;
        }
      }
    };
  };

  actionCreator.pending = pending;
  actionCreator.fulfilled = fulfilled;
  actionCreator.rejected = rejected;
  actionCreator.settled = settled;
  actionCreator.typePrefix = typePrefix;
  actionCreator.requestId = idGenerator;
  actionCreator.abort = (reason?: string) => ({
    type: `${typePrefix}/abort`,
    payload: { requestId: idGenerator(undefined as TArg), reason },
  });

  return actionCreator as AsyncThunkAction<TArg, TState>;
}

export function isRejectWithValue<T>(
  value: unknown
): value is RejectWithValue<T> {
  return (
    value !== null &&
    typeof value === "object" &&
    "payload" in value &&
    "meta" in value &&
    typeof (value as RejectWithValue<T>).meta === "object" &&
    (value as RejectWithValue<T>).meta?.rejectedWithValue === true
  );
}

export function isFulfillWithValue<T>(
  value: unknown
): value is FulfillWithValue<T> {
  return (
    value !== null &&
    typeof value === "object" &&
    "payload" in value &&
    "meta" in value &&
    typeof (value as FulfillWithValue<T>).meta === "object" &&
    (value as FulfillWithValue<T>).meta?.fulfilledWithValue === true
  );
}

export function isAsyncThunkAction(action: Action): boolean {
  return (
    typeof action.type === "string" &&
    (action.type.endsWith("/pending") ||
      action.type.endsWith("/fulfilled") ||
      action.type.endsWith("/rejected"))
  );
}

export function isPending(action: Action): boolean {
  return typeof action.type === "string" && action.type.endsWith("/pending");
}

export function isFulfilled(action: Action): boolean {
  return typeof action.type === "string" && action.type.endsWith("/fulfilled");
}

export function isRejected(action: Action): boolean {
  return typeof action.type === "string" && action.type.endsWith("/rejected");
}

export function isAsyncThunkPending(
  ...asyncThunks: AsyncThunkAction<any, any>[]
): (action: Action) => boolean {
  if (asyncThunks.length === 0) {
    return isPending;
  }
  const matchers = asyncThunks.map(
    (asyncThunk) => (action: Action) => action.type === asyncThunk.pending
  );
  return (action: Action) => matchers.some((matcher) => matcher(action));
}

export function isAsyncThunkFulfilled(
  ...asyncThunks: AsyncThunkAction<any, any>[]
): (action: Action) => boolean {
  if (asyncThunks.length === 0) {
    return isFulfilled;
  }
  const matchers = asyncThunks.map(
    (asyncThunk) => (action: Action) => action.type === asyncThunk.fulfilled
  );
  return (action: Action) => matchers.some((matcher) => matcher(action));
}

export function isAsyncThunkRejected(
  ...asyncThunks: AsyncThunkAction<any, any>[]
): (action: Action) => boolean {
  if (asyncThunks.length === 0) {
    return isRejected;
  }
  const matchers = asyncThunks.map(
    (asyncThunk) => (action: Action) => action.type === asyncThunk.rejected
  );
  return (action: Action) => matchers.some((matcher) => matcher(action));
}

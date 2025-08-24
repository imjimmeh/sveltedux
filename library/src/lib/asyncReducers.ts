import type {
  Action,
  ActionCreator,
  AsyncState,
  AsyncThunkAction,
} from "./types.js";
import type { FulfilledAction, RejectedAction } from "./typedActions.js";
import { isFulfilledAction, isRejectedAction } from "./typedActions.js";

export type AsyncThunkSliceReducers<TState extends Record<string, AsyncState>> =
  {
    [K in keyof TState]: {
      pending?: (state: TState) => TState | void;
      fulfilled?: <TPayload>(
        state: TState,
        action: FulfilledAction<TPayload>
      ) => TState | void;
      rejected?: <TError>(
        state: TState,
        action: RejectedAction<TError>
      ) => TState | void;
    };
  };

export function createAsyncReducer<TData, TError = string, TArg = unknown>(
  asyncThunk: AsyncThunkAction<TData, TArg, unknown>,
  options: {
    pending?: (
      state: AsyncState<TData, TError>
    ) => AsyncState<TData, TError> | void;
    fulfilled?: (
      state: AsyncState<TData, TError>,
      action: FulfilledAction<TData>
    ) => AsyncState<TData, TError> | void;
    rejected?: (
      state: AsyncState<TData, TError>,
      action: RejectedAction<TError>
    ) => AsyncState<TData, TError> | void;
  } = {}
) {
  const {
    pending = (state) => ({ ...state, loading: true, error: null }),
    fulfilled = (state, action) => ({
      ...state,
      loading: false,
      data: action.payload,
      error: null,
      lastFetch: Date.now(),
      requestId: action.meta.requestId,
    }),
    rejected = (state, action) => ({
      ...state,
      loading: false,
      error:
        (action.meta.rejectedWithValue ? action.payload : action.error) ?? null,
      requestId: action.meta.requestId,
    }),
  } = options;

  return (
    state: AsyncState<TData, TError>,
    action: Action
  ): AsyncState<TData, TError> => {
    if (action.type === asyncThunk.pending) {
      return pending(state) ?? state;
    }
    if (
      isFulfilledAction<TData>(action) &&
      action.type === asyncThunk.fulfilled
    ) {
      return fulfilled(state, action) ?? state;
    }
    if (
      isRejectedAction<TError>(action) &&
      action.type === asyncThunk.rejected
    ) {
      return rejected(state, action) ?? state;
    }
    return state;
  };
}

export function createAsyncSlice<
  TName extends string,
  TState extends Record<string, any>,
  TAsyncStates extends Record<string, AsyncState<any, any>>,
  TReducers extends Record<
    string,
    (
      state: TState & TAsyncStates,
      action: Action
    ) => (TState & TAsyncStates) | void
  >,
  TAsyncThunks extends Record<string, AsyncThunkAction<any, any, any>>
>(config: {
  name: TName;
  initialState: TState & TAsyncStates;
  reducers?: TReducers;
  asyncThunks?: TAsyncThunks;
  extraAsyncReducers?: (
    builder: AsyncReducerBuilder<TState & TAsyncStates>
  ) => void;
}) {
  const {
    name,
    initialState,
    reducers = {},
    asyncThunks = {},
    extraAsyncReducers,
  } = config;

  const actionCreators = {} as {
    [K in keyof TReducers]: ActionCreator<
      Parameters<TReducers[K]>[1]["payload"]
    >;
  };

  const actionTypes = {} as { [K in keyof TReducers]: string };

  // Create synchronous action creators
  for (const reducerName of Object.keys(reducers) as (keyof TReducers)[]) {
    const type = `${name}/${String(reducerName)}`;
    actionTypes[reducerName] = type;
    actionCreators[reducerName] = ((
      payload: Parameters<TReducers[typeof reducerName]>[1]["payload"]
    ) => ({
      type,
      payload,
    })) as ActionCreator<
      Parameters<TReducers[typeof reducerName]>[1]["payload"]
    >;
  }

  // Create reducer with async thunk handling
  const reducer = (
    state = initialState,
    action: Action
  ): TState & TAsyncStates => {
    // Handle synchronous reducers
    for (const [reducerName, reducerFunction] of Object.entries(reducers)) {
      if (action.type === `${name}/${reducerName}`) {
        const result = (
          reducerFunction as (
            state: TState & TAsyncStates,
            action: Action
          ) => (TState & TAsyncStates) | void
        )(state, action);
        return result ?? state;
      }
    }

    // Handle async thunks
    for (const [thunkName, asyncThunk] of Object.entries(asyncThunks)) {
      const thunk = asyncThunk as {
        pending: string;
        fulfilled: string;
        rejected: string;
      };
      if (action.type === thunk.pending) {
        return {
          ...state,
          [thunkName]: {
            ...state[thunkName as keyof TAsyncStates],
            loading: true,
            error: null,
            requestId: (action as unknown as { meta: { requestId: string } })
              .meta.requestId,
          },
        };
      }

      if (action.type === thunk.fulfilled) {
        return {
          ...state,
          [thunkName]: {
            ...state[thunkName as keyof TAsyncStates],
            loading: false,
            data: (action as { payload: unknown }).payload,
            error: null,
            lastFetch: Date.now(),
            requestId: (action as unknown as { meta: { requestId: string } })
              .meta.requestId,
          },
        };
      }

      if (action.type === thunk.rejected) {
        const actionWithMeta = action as {
          type: string;
          error?: { message: string };
          payload?: unknown;
          meta: { requestId: string; rejectedWithValue?: boolean };
        };
        return {
          ...state,
          [thunkName]: {
            ...state[thunkName as keyof TAsyncStates],
            loading: false,
            error: actionWithMeta.meta.rejectedWithValue
              ? actionWithMeta.payload
              : actionWithMeta.error,
            requestId: actionWithMeta.meta.requestId,
          },
        };
      }
    }

    // Handle extra async reducers
    if (extraAsyncReducers) {
      const builder = new AsyncReducerBuilder<TState & TAsyncStates>(state);
      extraAsyncReducers(builder);
      const result = builder.build()(state, action);
      if (result !== state) {
        return result;
      }
    }

    return state;
  };

  return {
    name,
    actions: actionCreators,
    actionTypes,
    reducer,
    asyncThunks: asyncThunks as TAsyncThunks,
  };
}

export class AsyncReducerBuilder<TState> {
  private readonly matchers: Array<{
    matcher: (action: Action) => boolean;
    reducer: (state: TState, action: Action) => TState | void;
  }> = [];

  constructor(private readonly initialState: TState) {}

  addCase<TAction extends Action>(
    actionCreator: { type: string } | string,
    reducer: (state: TState, action: TAction) => TState | void
  ): this {
    const type =
      typeof actionCreator === "string" ? actionCreator : actionCreator.type;
    this.matchers.push({
      matcher: (action) => action.type === type,
      reducer: reducer as (state: TState, action: Action) => TState | void,
    });
    return this;
  }

  addMatcher<TAction extends Action>(
    matcher: (action: Action) => action is TAction,
    reducer: (state: TState, action: TAction) => TState | void
  ): this;
  addMatcher(
    matcher: (action: Action) => boolean,
    reducer: (state: TState, action: Action) => TState | void
  ): this;
  addMatcher(
    matcher: (action: Action) => boolean,
    reducer: (state: TState, action: Action) => TState | void
  ): this {
    this.matchers.push({ matcher, reducer });
    return this;
  }

  addDefaultCase(
    reducer: (state: TState, action: Action) => TState | void
  ): this {
    this.matchers.push({
      matcher: () => true,
      reducer,
    });
    return this;
  }

  build() {
    return (state: TState = this.initialState, action: Action): TState => {
      for (const { matcher, reducer } of this.matchers) {
        if (matcher(action)) {
          const result = reducer(state, action);
          return result ?? state;
        }
      }
      return state;
    };
  }
}

export function extraAsyncReducers<TState>(
  builder: AsyncReducerBuilder<TState>
): AsyncReducerBuilder<TState> {
  return builder;
}

// Utility function to get async state
export function getAsyncState<TData, TError>(
  state: Record<string, AsyncState<TData, TError>>,
  key: string
): AsyncState<TData, TError> | undefined {
  return state[key];
}

// Utility to check if any async operations are pending
export function isAnyAsyncPending(
  state: Record<string, AsyncState<unknown, unknown>>
): boolean {
  return Object.values(state).some((asyncState) => asyncState.loading);
}

// Utility to get all errors from async states
export function getAllAsyncErrors<TError = unknown>(
  state: Record<string, AsyncState<unknown, TError>>
): TError[] {
  return Object.values(state)
    .map((asyncState) => asyncState.error)
    .filter((error): error is TError => error !== null);
}

import type {
  Action,
  Reducer,
  PayloadAction,
  SliceCaseReducer,
  SliceCaseReducerNoPayload,
  ValidateSliceCaseReducers,
} from "./types.js";
import { produce, setAutoFreeze } from "immer";

setAutoFreeze(false);

export function combineReducers<TState>(reducers: {
  [K in keyof TState]: Reducer<TState[K], any>;
}): Reducer<TState> {
  const reducerKeys = Object.keys(reducers) as (keyof TState)[];
  const finalReducers: { [K in keyof TState]: Reducer<TState[K], any> } =
    {} as any;

  for (const key of reducerKeys) {
    if (typeof reducers[key] === "function") {
      finalReducers[key] = reducers[key];
    }
  }

  const finalReducerKeys = Object.keys(finalReducers) as (keyof TState)[];

  return function combination(
    state: TState | undefined,
    action: Action
  ): TState {
    let hasChanged = false;
    const nextState = {} as TState;

    for (const key of finalReducerKeys) {
      const reducer = finalReducers[key];
      const previousStateForKey = state?.[key];
      const nextStateForKey = reducer(previousStateForKey, action);

      if (typeof nextStateForKey === "undefined") {
        throw new Error(`Reducer "${String(key)}" returned undefined.`);
      }

      nextState[key] = nextStateForKey;
      hasChanged = hasChanged || nextStateForKey !== previousStateForKey;
    }

    hasChanged =
      hasChanged || finalReducerKeys.length !== Object.keys(state || {}).length;
    return hasChanged ? nextState : (state as TState);
  };
}

export function createReducer<TState>(
  initialState: TState,
  handlers: Record<string, (state: TState, action: Action) => TState | void>
): Reducer<TState> {
  return function reducer(state = initialState, action: Action): TState {
    if (Object.hasOwn(handlers, action.type)) {
      return produce(state, (draft) => {
        const result = handlers[action.type](draft as TState, action);
        // If reducer returns a value, replace the entire draft; otherwise rely on mutations
        if (result !== undefined && result !== null) {
          return result as any;
        }
        // When undefined/null is returned, Immer uses the mutated draft
      });
    }
    return state;
  };
}

export function createSlice<
  TState,
  TCaseReducers extends Record<
    string,
    SliceCaseReducer<TState, any> | SliceCaseReducerNoPayload<TState>
  >
>(config: {
  name: string;
  initialState: TState;
  reducers: ValidateSliceCaseReducers<TState, TCaseReducers>;
  extraReducers?: (builder: any) => void;
}) {
  const { name, initialState, reducers, extraReducers } = config;

  type CaseReducerActions = {
    [K in keyof TCaseReducers]: TCaseReducers[K] extends SliceCaseReducer<
      TState,
      infer TPayload
    >
      ? undefined extends TPayload
        ? {
            (): PayloadAction<undefined>;
            (payload: TPayload): PayloadAction<TPayload>;
            type: string;
          }
        : {
            (payload: TPayload): PayloadAction<TPayload>;
            type: string;
          }
      : TCaseReducers[K] extends SliceCaseReducerNoPayload<TState>
      ? {
          (): Action;
          type: string;
        }
      : never;
  };

  const actionCreators = {} as CaseReducerActions;
  const actionTypes = {} as { [K in keyof TCaseReducers]: string };

  for (const reducerName of Object.keys(reducers) as (keyof TCaseReducers)[]) {
    const type = `${name}/${String(reducerName)}`;
    actionTypes[reducerName] = type;

    const actionCreator = (payload?: any) => {
      if (payload === undefined) {
        return { type };
      }
      return { type, payload };
    };
    actionCreator.type = type;

    (actionCreators as any)[reducerName] = actionCreator;
  }

  const extraReducerHandlers: {
    [K: string]: (state: TState, action: any) => TState | void;
  } = {};
  if (extraReducers) {
    const builder = {
      addCase: (
        type: string,
        handler: (state: TState, action: any) => TState | void
      ) => {
        extraReducerHandlers[type] = handler;
        return builder;
      },
    };
    extraReducers(builder);
  }

  const reducer: Reducer<TState> = (state = initialState, action) => {
    for (const [reducerName, reducerFunction] of Object.entries(reducers)) {
      if (action.type === `${name}/${reducerName}`) {
        return produce(state, (draft) => {
          const result = reducerFunction(draft as TState, action);
          // If reducer returns a value, replace the entire draft; otherwise rely on mutations
          if (result !== undefined && result !== null) {
            return result as any;
          }
          // When undefined/null is returned, Immer uses the mutated draft
        });
      }
    }

    if (extraReducerHandlers[action.type]) {
      return produce(state, (draft) => {
        const result = extraReducerHandlers[action.type](
          draft as TState,
          action
        );
        // If reducer returns a value, replace the entire draft; otherwise rely on mutations
        if (result !== undefined && result !== null) {
          return result as any;
        }
        // When undefined/null is returned, Immer uses the mutated draft
      });
    }

    return state;
  };

  return {
    name,
    reducer,
    actions: actionCreators,
    actionTypes,
  };
}

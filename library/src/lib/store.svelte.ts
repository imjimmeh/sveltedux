import type {
  Action,
  Reducer,
  Store,
  StoreEnhancer,
  Dispatch,
  ThunkDispatch,
} from "./types.js";

export function createStore<TState>(
  reducer: Reducer<TState>,
  preloadedState?: TState,
  enhancer?: StoreEnhancer<TState>
): Store<TState> {
  if (typeof preloadedState === "function" && typeof enhancer === "undefined") {
    enhancer = preloadedState as StoreEnhancer<TState>;
    preloadedState = undefined;
  }

  if (typeof enhancer !== "undefined") {
    if (typeof enhancer !== "function") {
      throw new Error("Expected the enhancer to be a function.");
    }
    return enhancer(createStore)(reducer, preloadedState);
  }

  let currentState = $state<TState>(
    preloadedState ?? reducer(undefined, { type: "@@INIT" } as Action)
  );
  let currentReducer = reducer;
  let listeners: (() => void)[] = [];
  let isDispatching = false;

  function getState(): TState {
    if (isDispatching) {
      throw new Error(
        "You may not call store.getState() while the reducer is executing."
      );
    }
    return currentState;
  }

  function subscribe(listener: () => void): () => void {
    if (typeof listener !== "function") {
      throw new Error("Expected the listener to be a function.");
    }

    if (isDispatching) {
      throw new Error(
        "You may not call store.subscribe() while the reducer is executing."
      );
    }

    listeners.push(listener);

    return function unsubscribe() {
      if (isDispatching) {
        throw new Error(
          "You may not unsubscribe from a store listener while the reducer is executing."
        );
      }

      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }

  const dispatch: Dispatch<Action> = ((action: Action) => {
    if (typeof action?.type !== "string") {
      console.error(
        `Received action with invalid type: ${String(action?.type)}`,
        action
      );
      throw new Error("Actions must have a type property that is a string.");
    }

    if (isDispatching) {
      throw new Error("Reducers may not dispatch actions.");
    }

    try {
      isDispatching = true;
      const nextState = currentReducer(currentState, action);
      if (nextState !== currentState) {
        Object.assign(currentState, nextState);
      }
    } finally {
      isDispatching = false;
    }

    for (const listener of listeners) {
      listener();
    }

    return action;
  }) as Dispatch<Action>;

  function replaceReducer(nextReducer: Reducer<TState>): void {
    if (typeof nextReducer !== "function") {
      throw new Error("Expected the nextReducer to be a function.");
    }

    currentReducer = nextReducer;
    dispatch({ type: "@@REPLACE" } as Action);
  }

  dispatch({ type: "@@INIT" } as Action);

  return {
    get state() {
      return currentState;
    },
    dispatch: dispatch as ThunkDispatch<TState, undefined, Action>,
    subscribe,
    getState,
    replaceReducer,
  };
}

export const createSvelteStore = createStore;

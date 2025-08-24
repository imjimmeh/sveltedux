import type {
  Middleware,
  MiddlewareAPI,
  Dispatch,
  Action,
  ActionCreator,
  ThunkAction,
  ThunkDispatch,
  StoreEnhancer,
} from "./types.js";

export function applyMiddleware<TState>(
  ...middlewares: Middleware<TState>[]
): StoreEnhancer<TState> {
  return (createStore) => (reducer, preloadedState) => {
    const store = createStore(reducer, preloadedState);
    let dispatch: Dispatch = () => {
      throw new Error(
        "Dispatching while constructing your middleware is not allowed."
      );
    };

    const middlewareAPI: MiddlewareAPI<TState> = {
      getState: store.getState,
      dispatch: (action: any) => dispatch(action),
    };

    const chain = middlewares.map((middleware) => middleware(middlewareAPI));
    dispatch = compose(...chain)(store.dispatch);

    return {
      ...store,
      dispatch,
    };
  };
}

export function compose(...funcs: Array<Function>) {
  if (funcs.length === 0) {
    return (arg: any) => arg;
  }

  if (funcs.length === 1) {
    return funcs[0];
  }

  return funcs.reduce((a, b) => (arg: any) => a(b(arg)));
}

export const thunkMiddleware: Middleware =
  ({ dispatch, getState }) =>
  (next) =>
  (action) => {
    if (typeof action === "function") {
      const thunkAction = action as ThunkAction<any, any, undefined, Action>;
      return thunkAction(
        dispatch as ThunkDispatch<any, undefined, Action>,
        getState,
        undefined
      );
    }

    return next(action);
  };

export const loggerMiddleware: Middleware =
  ({ getState }) =>
  (next) =>
  (action) => {
    if (typeof action === "object" && action?.type) {
      console.group(`action ${action.type}`);
      console.log("prev state", getState());
      console.log("action", action);
      const result = next(action);
      console.log("next state", getState());
      console.groupEnd();
      return result;
    }
    return next(action);
  };

export function createListenerMiddleware<TState = any>(): {
  middleware: Middleware<TState>;
  startListening: <P = unknown>(config: {
    actionCreator?: ActionCreator<P>;
    type?: string;
    predicate?: (
      action: Action,
      currentState: TState,
      previousState: TState
    ) => boolean;
    effect: (
      action: Action,
      listenerApi: { dispatch: Dispatch; getState: () => TState }
    ) => void;
  }) => () => void;
} {
  const listeners: Array<{
    predicate: (
      action: Action,
      currentState: TState,
      previousState: TState
    ) => boolean;
    effect: (
      action: Action,
      listenerApi: { dispatch: Dispatch; getState: () => TState }
    ) => void;
  }> = [];

  const middleware: Middleware<TState> =
    ({ dispatch, getState }) =>
    (next) =>
    (action) => {
      const previousState = getState();
      const result = next(action);
      const currentState = getState();

      for (const listener of listeners) {
        if (listener.predicate(action, currentState, previousState)) {
          listener.effect(action, { dispatch, getState });
        }
      }

      return result;
    };

  const startListening = <P = unknown>(config: {
    actionCreator?: ActionCreator<P>;
    type?: string;
    predicate?: (
      action: Action,
      currentState: TState,
      previousState: TState
    ) => boolean;
    effect: (
      action: Action,
      listenerApi: { dispatch: Dispatch; getState: () => TState }
    ) => void;
  }) => {
    let predicate: (
      action: Action,
      currentState: TState,
      previousState: TState
    ) => boolean;

    if (config.predicate) {
      predicate = config.predicate;
    } else if (config.actionCreator) {
      predicate = (action) => action.type === config.actionCreator!.type;
    } else if (config.type) {
      predicate = (action) => action.type === config.type;
    } else {
      throw new Error("Must provide predicate, actionCreator, or type");
    }

    const listener = { predicate, effect: config.effect };
    listeners.push(listener);

    return () => {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  };

  return { middleware, startListening };
}

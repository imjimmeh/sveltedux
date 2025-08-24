import type { Middleware, ActionCreator, Action, Dispatch } from "../types.js";

export function createListenerMiddleware<TState = unknown>(): {
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

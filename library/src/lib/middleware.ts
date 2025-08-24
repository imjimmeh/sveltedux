/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
  Middleware,
  MiddlewareAPI,
  Dispatch,
  Action,
  ThunkAction,
  ThunkDispatch,
  StoreEnhancer,
  Store,
  Reducer,
  EnhancedDispatch,
  StoreCreator,
} from "./types.js";

export function applyMiddleware<TState>(
  ...middlewares: Middleware<TState>[]
): StoreEnhancer<TState> {
  return (createStore: StoreCreator<TState>) =>
    (reducer: Reducer<TState>, preloadedState?: TState): Store<TState> => {
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
        dispatch: dispatch as EnhancedDispatch<TState>,
      };
    };
}

type AnyFunction = (...args: any[]) => any;

export function compose(...funcs: AnyFunction[]): (...args: any[]) => any {
  if (funcs.length === 0) {
    return (arg) => arg;
  }

  if (funcs.length === 1) {
    return funcs[0];
  }

  return funcs.reduce(
    (a, b) =>
      (...args) =>
        a(b(...args))
  );
}

export const thunkMiddleware: Middleware<any> =
  <TState>({ dispatch, getState }: MiddlewareAPI<TState>) =>
  (next: Dispatch) =>
  (action: Action | ThunkAction<any, TState, undefined, Action>): any => {
    if (typeof action === "function") {
      const thunkAction = action;
      return thunkAction(
        dispatch as ThunkDispatch<TState, undefined, Action>,
        getState,
        undefined
      );
    }

    return next(action);
  };

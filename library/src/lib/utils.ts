import type { Action } from "./types.js";
import { produce, enableMapSet } from "immer";

// Enable Map and Set support in Immer
enableMapSet();

export function bindActionCreators<T extends Record<string, any>>(
  actionCreators: T,
  dispatch: (action: Action) => Action
): {
  [K in keyof T]: T[K] extends (...args: any[]) => infer R
    ? (...args: Parameters<T[K]>) => R
    : T[K];
} {
  const boundActionCreators = {} as any;

  for (const key in actionCreators) {
    const actionCreator = actionCreators[key];
    if (typeof actionCreator === "function") {
      boundActionCreators[key] = (...args: any[]) =>
        dispatch(actionCreator(...args));
    }
  }

  return boundActionCreators;
}

export function shallowEqual(objA: any, objB: any): boolean {
  if (objA === objB) {
    return true;
  }

  if (
    typeof objA !== "object" ||
    objA === null ||
    typeof objB !== "object" ||
    objB === null
  ) {
    return false;
  }

  const keysA = Object.keys(objA);
  const keysB = Object.keys(objB);

  if (keysA.length !== keysB.length) {
    return false;
  }

  for (const key of keysA) {
    if (!Object.hasOwn(objB, key) || objA[key] !== objB[key]) {
      return false;
    }
  }

  return true;
}

export function deepEqual(objA: any, objB: any): boolean {
  if (objA === objB) {
    return true;
  }

  if (objA == null || objB == null) {
    return objA === objB;
  }

  if (typeof objA !== typeof objB) {
    return false;
  }

  if (typeof objA !== "object") {
    return objA === objB;
  }

  if (Array.isArray(objA) !== Array.isArray(objB)) {
    return false;
  }

  const keysA = Object.keys(objA);
  const keysB = Object.keys(objB);

  if (keysA.length !== keysB.length) {
    return false;
  }

  for (const key of keysA) {
    if (!Object.hasOwn(objB, key)) {
      return false;
    }

    if (!deepEqual(objA[key], objB[key])) {
      return false;
    }
  }

  return true;
}

export function freeze<T>(obj: T): Readonly<T> {
  return Object.freeze(obj);
}

export { produce } from "immer";

export function createDraftSafeSelector<TState, TResult>(
  selector: (state: TState) => TResult,
  equalityFn: (a: TResult, b: TResult) => boolean = shallowEqual
) {
  let lastState: TState;
  let lastResult: TResult;

  return (state: TState): TResult => {
    if (state !== lastState) {
      const newResult = selector(state);
      if (!lastResult || !equalityFn(newResult, lastResult)) {
        lastResult = newResult;
      }
      lastState = state;
    }
    return lastResult;
  };
}

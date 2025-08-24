export function createSelector<TState, TResult>(
  selector: (state: TState) => TResult
): (state: TState) => TResult;

export function createSelector<TState, TResult, TArg1>(
  selector1: (state: TState) => TArg1,
  combiner: (arg1: TArg1) => TResult
): (state: TState) => TResult;

export function createSelector<TState, TResult, TArg1, TArg2>(
  selector1: (state: TState) => TArg1,
  selector2: (state: TState) => TArg2,
  combiner: (arg1: TArg1, arg2: TArg2) => TResult
): (state: TState) => TResult;

export function createSelector<TState, TResult, TArg1, TArg2, TArg3>(
  selector1: (state: TState) => TArg1,
  selector2: (state: TState) => TArg2,
  selector3: (state: TState) => TArg3,
  combiner: (arg1: TArg1, arg2: TArg2, arg3: TArg3) => TResult
): (state: TState) => TResult;

export function createSelector<TState, TResult>(
  ...args: any[]
): (state: TState) => TResult {
  // Single selector overload: return memoized passthrough selector
  if (args.length === 1 && typeof args[0] === "function") {
    const selector = args[0] as (state: TState) => TResult;
    let lastState: TState | undefined;
    let lastResult: TResult;
    return (state: TState) => {
      if (state === lastState) {
        return lastResult;
      }
      lastState = state;
      lastResult = selector(state);
      return lastResult;
    };
  }

  // Multiple selectors + combiner
  const selectors = args.slice(0, -1) as ((state: TState) => any)[];
  const combiner = args[args.length - 1] as (...args: any[]) => TResult;

  let lastArgs: any[] | undefined;
  let lastResult: TResult;

  return (state: TState) => {
    const currentArgs = selectors.map((selector) => selector(state));

    if (!lastArgs || !areArgumentsEqual(currentArgs, lastArgs)) {
      lastResult = combiner(...currentArgs);
      lastArgs = currentArgs;
    }

    return lastResult;
  };
}

function areArgumentsEqual(a: any[], b: any[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

export function createStructuredSelector<
  TState,
  TSelectors extends Record<string, (state: TState, ...args: any[]) => any>
>(
  selectors: TSelectors
): (state: TState) => { [K in keyof TSelectors]: ReturnType<TSelectors[K]> } {
  const selectorKeys = Object.keys(selectors) as (keyof TSelectors)[];

  let lastState: TState | undefined;
  let lastResult:
    | { [K in keyof TSelectors]: ReturnType<TSelectors[K]> }
    | undefined;

  return (state: TState) => {
    // If same state reference, return cached result without recomputation
    if (state === lastState && lastResult) {
      return lastResult;
    }

    const result = {} as { [K in keyof TSelectors]: ReturnType<TSelectors[K]> };
    for (const key of selectorKeys) {
      result[key] = selectors[key](state);
    }

    lastState = state;
    lastResult = result;
    return result;
  };
}

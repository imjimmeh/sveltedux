// Default equality check function using strict equality
function defaultEqualityCheck(a: any, b: any): boolean {
  return a === b;
}

// Deep equality check for objects and arrays
function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  
  if (a == null || b == null) return a === b;
  
  if (typeof a !== 'object' || typeof b !== 'object') return a === b;
  
  // Handle Date objects
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  }
  
  // Handle Arrays
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }
  
  // Handle Objects
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  
  if (keysA.length !== keysB.length) return false;
  
  for (const key of keysA) {
    if (!keysB.includes(key)) return false;
    if (!deepEqual(a[key], b[key])) return false;
  }
  
  return true;
}

// Enhanced argument equality check using deep equality
function areArgumentsShallowlyEqual(
  equalityCheck: (a: any, b: any) => boolean,
  prev: any[] | undefined,
  next: any[]
): boolean {
  if (prev === undefined || prev.length !== next.length) {
    return false;
  }
  
  for (let i = 0; i < prev.length; i++) {
    if (!equalityCheck(prev[i], next[i])) {
      return false;
    }
  }
  
  return true;
}

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

  let lastState: TState | undefined;
  let lastArguments: any[] | undefined;
  let lastResult: TResult;

  return (state: TState) => {
    // First check if state reference is the same
    // if (state === lastState && lastArguments !== undefined) {
    //   return lastResult;
    // }
    
    // State has changed, get current arguments from selectors
    const currentArguments = selectors.map((selector) => selector(state));

    // Use deep equality for comparing arguments to prevent unnecessary recomputations
    if (!areArgumentsShallowlyEqual(deepEqual, lastArguments, currentArguments)) {
      lastResult = combiner(...currentArguments);
      lastArguments = currentArguments;
    }
    
    lastState = state;
    return lastResult;
  };
}

export function createStructuredSelector<
  TState,
  TSelectors extends Record<string, (state: TState, ...args: any[]) => any>
>(
  selectors: TSelectors
): (state: TState) => { [K in keyof TSelectors]: ReturnType<TSelectors[K]> } {
  const selectorKeys = Object.keys(selectors) as (keyof TSelectors)[];

  let lastState: TState | undefined;
  let lastArguments: any[] | undefined;
  let lastResult:
    | { [K in keyof TSelectors]: ReturnType<TSelectors[K]> }
    | undefined;

  return (state: TState) => {
    // First check if state reference is the same
    // if (state === lastState && lastArguments !== undefined) {
    //   return lastResult!;
    // }
    
    // State has changed, get current arguments from selectors
    const currentArguments = selectorKeys.map(key => selectors[key](state));

    // Use deep equality for comparing arguments to prevent unnecessary recomputations
    if (!areArgumentsShallowlyEqual(deepEqual, lastArguments, currentArguments)) {
      const result = {} as { [K in keyof TSelectors]: ReturnType<TSelectors[K]> };
      for (let i = 0; i < selectorKeys.length; i++) {
        const key = selectorKeys[i];
        result[key] = currentArguments[i];
      }
      lastArguments = currentArguments;
      lastResult = result;
    }
    
    lastState = state;
    return lastResult!;
  };
}

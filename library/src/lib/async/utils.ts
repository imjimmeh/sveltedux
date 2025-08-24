import type { AsyncState } from "./types.js";

export function combineAsyncStates<
  T extends Record<string, AsyncState<any, any>>
>(
  states: T
): {
  isAnyLoading: boolean;
  hasAnyError: boolean;
  allErrors: any[];
  isAllSuccess: boolean;
  loadingCount: number;
} {
  const stateValues = Object.values(states);

  return {
    isAnyLoading: stateValues.some((state) => state.loading),
    hasAnyError: stateValues.some((state) => state.error !== null),
    allErrors: stateValues
      .map((state) => state.error)
      .filter((error) => error !== null),
    isAllSuccess: stateValues.every(
      (state) => !state.loading && state.error === null && state.data !== null
    ),
    loadingCount: stateValues.filter((state) => state.loading).length,
  };
}

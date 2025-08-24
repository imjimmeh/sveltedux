import type { AsyncState } from "./types.js";

export const asyncSelectors = {
  isLoading: <T>(asyncState: AsyncState<T>) => asyncState.loading,
  hasError: <T>(asyncState: AsyncState<T>) => asyncState.error !== null,
  hasData: <T>(asyncState: AsyncState<T>) => asyncState.data !== null,
  isStale: <T>(asyncState: AsyncState<T>, ttl: number = 5 * 60 * 1000) => {
    if (!asyncState.lastFetch) return true;
    return Date.now() - asyncState.lastFetch > ttl;
  },
  isIdle: <T>(asyncState: AsyncState<T>) =>
    !asyncState.loading &&
    asyncState.error === null &&
    asyncState.data === null,
  isSuccess: <T>(asyncState: AsyncState<T>) =>
    !asyncState.loading &&
    asyncState.error === null &&
    asyncState.data !== null,
  isFailed: <T>(asyncState: AsyncState<T>) =>
    !asyncState.loading && asyncState.error !== null,
};

import type { AsyncThunkAction } from "./types.js";
import { createAsyncThunk } from "./thunks.js";

export function createPollingAsyncThunk<TData, TState = unknown>(
  typePrefix: string,
  fetchFunction: () => Promise<TData>,
  options: {
    interval?: number;
    maxAttempts?: number;
    condition?: (state: TState) => boolean;
  } = {}
) {
  const { interval = 5000, maxAttempts = Infinity, condition } = options;
  let attempts = 0;
  let pollTimeout: NodeJS.Timeout | null = null;

  const thunk = createAsyncThunk<TData, void, TState>(
      typePrefix,
      async (_, { getState, dispatch, signal }) => {
        attempts++;

        if (attempts > maxAttempts) {
          throw new Error("Max polling attempts reached");
        }

        if (condition && !condition(getState())) {
          throw new Error("Polling condition not met");
        }

        const data = await fetchFunction();

        // Schedule next poll if not aborted
        if (!signal.aborted && attempts < maxAttempts) {
          pollTimeout = setTimeout(() => {
            if (!signal.aborted) {
              dispatch(thunk());
            }
          }, interval);
        }

        return data;
      }
    );

  // Add method to stop polling
  (thunk as any).stopPolling = () => {
    if (pollTimeout) {
      clearTimeout(pollTimeout);
      pollTimeout = null;
    }
    attempts = 0;
  };

  return thunk as any;
}

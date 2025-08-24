import type { AsyncState } from "./types.js";
import { createAsyncThunk } from "./thunks.js";

export interface AsyncSearchState<T> extends AsyncState<T[]> {
  query: string;
  isSearching: boolean;
  searchResults: T[];
}

export function createSearchAsyncThunk<TItem, TState = unknown>(
  typePrefix: string,
  searchFunction: (query: string, options?: unknown) => Promise<TItem[]>
) {
  return createAsyncThunk<
    TItem[],
    { query: string; options?: unknown },
    TState
  >(
    typePrefix,
    async ({ query, options }, { signal }) => {
      // Add debouncing logic
      await new Promise((resolve) => setTimeout(resolve, 300));

      if (signal.aborted) {
        throw new Error("Search cancelled");
      }

      return await searchFunction(query, options);
    },
    {
      condition: ({ query }) => query.trim().length > 0,
    }
  );
}

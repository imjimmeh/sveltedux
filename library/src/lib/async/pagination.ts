import type { AsyncState } from "./types.js";
import { createAsyncThunk } from "./thunks.js";

export interface PaginatedData<T> {
  items: T[];
  totalCount: number;
  pageSize: number;
  currentPage: number;
  hasMore: boolean;
}

export interface AsyncPaginatedState<T> extends AsyncState<PaginatedData<T>> {
  isLoadingMore: boolean;
  hasMore: boolean;
}

export function createPaginatedAsyncThunk<TItem, TState = unknown>(
  typePrefix: string,
  fetchFunction: (
    page: number,
    pageSize: number
  ) => Promise<PaginatedData<TItem>>
) {
  return createAsyncThunk<
    PaginatedData<TItem>,
    { page: number; pageSize: number; append?: boolean },
    TState
  >(typePrefix, async ({ page, pageSize }) => {
    return await fetchFunction(page, pageSize);
  });
}

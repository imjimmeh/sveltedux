import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  createPaginatedAsyncThunk,
  createSearchAsyncThunk,
  createOptimisticAsyncThunk,
  createPollingAsyncThunk,
  createBatchAsyncThunk,
  createDependentAsyncThunk,
  createErrorBoundaryAsyncThunk,
  asyncSelectors,
  combineAsyncStates,
  type PaginatedData,
} from "./asyncUtils.js";
import { createAsyncState } from "./async.js";
import type { AsyncState, AsyncThunkAction, Action } from "./types.js";

describe("asyncUtils", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("createPaginatedAsyncThunk", () => {
    it("creates a thunk that resolves paginated results", async () => {
      const fetchFn = vi.fn(
        async (
          page: number,
          pageSize: number
        ): Promise<PaginatedData<number>> => ({
          items: Array.from(
            { length: pageSize },
            (_, i) => i + 1 + (page - 1) * pageSize
          ),
          totalCount: 10,
          pageSize,
          currentPage: page,
          hasMore: page < 2,
        })
      );
      const paged = createPaginatedAsyncThunk<number>("items/paged", fetchFn);

      const dispatch = vi.fn();
      const getState = vi.fn(() => ({}));

      const result = await paged({ page: 1, pageSize: 3 })(
        dispatch as any,
        getState,
        undefined
      );

      expect(fetchFn).toHaveBeenCalledWith(1, 3);
      expect(result.type).toBe("items/paged/fulfilled");
      expect(result.payload.items).toEqual([1, 2, 3]);
    });
  });

  describe("createSearchAsyncThunk", () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it("debounces and resolves search results (condition true)", async () => {
      const searchFn = vi.fn(async (query: string) =>
        ["a", "b"].filter((x) => x.includes(query))
      );
      const search = createSearchAsyncThunk<string>("search/items", searchFn);

      const dispatch = vi.fn();
      const getState = vi.fn();

      const promise = search({ query: "a" })(
        dispatch as any,
        getState,
        undefined
      );
      // Debounce delay inside thunk
      await vi.advanceTimersByTimeAsync(350);
      const action = await promise;

      expect(searchFn).toHaveBeenCalledWith("a", undefined);
      expect(action.type).toBe("search/items/fulfilled");
      expect(action.payload).toEqual(["a"]);
    });

    it("skips when condition fails (empty query)", async () => {
      const searchFn = vi.fn(async (_q: string) => ["x"]);
      const search = createSearchAsyncThunk<string>("search/items", searchFn);

      const dispatch = vi.fn();
      const getState = vi.fn();

      // This should not call searchFn due to empty condition
      const action = await search({ query: "  " })(
        dispatch as any,
        getState,
        undefined
      );
      expect(searchFn).not.toHaveBeenCalled();
      expect(action.type).toBe("search/items/conditionRejected");
    });
  });

  describe("createOptimisticAsyncThunk", () => {
    it("returns rejectedWithValue with isOptimistic when async fails and revert provided", async () => {
      const optimisticUpdate = vi.fn((n: number) => n + 1);
      const asyncFunction = vi.fn(async (_n: number) => {
        throw new Error("fail");
      });
      const revertFn = vi.fn((original: number, _arg: number) => original);

      const thunk = createOptimisticAsyncThunk<
        number,
        number,
        { data: number }
      >("counter/update", optimisticUpdate, asyncFunction, revertFn);

      const dispatch = vi.fn();
      const getState = vi.fn(() => ({ data: 10 }));

      const action = await thunk(5)(dispatch as any, getState, undefined);

      expect(action.type).toBe("counter/update/rejected");
      expect((action as any).meta.rejectedWithValue).toBe(true);
      expect((action as any).payload.isOptimistic).toBe(true);
      expect(revertFn).toHaveBeenCalled();
    });
  });

  describe("createPollingAsyncThunk", () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it("schedules next poll until maxAttempts", async () => {
      const fetchFn = vi.fn(async () => "ok");
      const pollThunk = createPollingAsyncThunk<string>("poll/data", fetchFn, {
        interval: 50,
        maxAttempts: 2,
        condition: () => true,
      });

      const dispatch = vi.fn((arg: any) => {
        if (typeof arg === "function") {
          return arg(dispatch, () => ({}), undefined);
        }
        return arg;
      });
      const getState = vi.fn(() => ({}));

      // First execution
      const first = await pollThunk()(dispatch as any, getState, undefined);
      expect(first.type).toBe("poll/data/fulfilled");
      expect(fetchFn).toHaveBeenCalledTimes(1);

      // Timer will schedule second poll
      vi.advanceTimersByTime(50);
      // The scheduled dispatch will enqueue thunk again
      expect(dispatch).toHaveBeenCalledWith(expect.any(Function));
      // Run the scheduled thunk
      await (dispatch.mock.calls.at(-1)![0] as any);

      expect(fetchFn).toHaveBeenCalledTimes(2);

      // Stop polling to cleanup
      (pollThunk as any).stopPolling();
      vi.advanceTimersByTime(100);
    });
  });

  describe("createBatchAsyncThunk", () => {
    it("batches arguments and resolves promises in order when batch size reached", async () => {
      const batchFn = vi.fn(async (args: string[]) =>
        args.map((a) => a.toUpperCase())
      );
      const batched = createBatchAsyncThunk<string, string>(
        "letters/up",
        batchFn,
        { batchSize: 2, batchDelay: 1000 }
      );

      const dispatch = vi.fn();
      const getState = vi.fn();

      const p1 = batched("a")(dispatch as any, getState, undefined);
      const p2 = batched("b")(dispatch as any, getState, undefined);

      const [r1, r2] = await Promise.all([p1, p2]);
      expect(batchFn).toHaveBeenCalledTimes(1);
      expect(r1.type).toBe("letters/up/fulfilled");
      expect(r2.type).toBe("letters/up/fulfilled");
      expect(r1.payload).toBe("A");
      expect(r2.payload).toBe("B");
    });
  });

  describe("createDependentAsyncThunk", () => {
    it("waits for dependencies and passes their payloads", async () => {
      // Dependency thunks (loose typing for test to satisfy runtime behavior)
      const dep1 = () => (dispatch: any) =>
        ({ type: "dep1/fulfilled", payload: 1 } as Action as any);
      const dep2 = () => (dispatch: any) =>
        ({ type: "dep2/fulfilled", payload: 2 } as Action as any);

      const aggregator = vi.fn(async (deps: number[]) =>
        deps.reduce((a, b) => a + b, 0)
      );
      const dependent = createDependentAsyncThunk<number, number>(
        "sum/deps",
        [dep1 as any, dep2 as any],
        aggregator
      );

      // Dispatch that executes thunks (emulates thunk middleware)
      const dispatch = vi.fn((arg: any) => {
        if (typeof arg === "function") {
          return Promise.resolve(arg(dispatch, () => ({}), undefined));
        }
        return Promise.resolve(arg);
      });
      const getState = vi.fn();

      const result = await dependent()(dispatch as any, getState, undefined);

      expect(aggregator).toHaveBeenCalledWith([1, 2]);
      expect(result.type).toBe("sum/deps/fulfilled");
      expect(result.payload).toBe(3);
    });
  });

  describe("createErrorBoundaryAsyncThunk", () => {
    it("returns fallback data if all retries fail", async () => {
      const failing = vi.fn(async (_x: number) => {
        throw new Error("nope");
      });
      const guarded = createErrorBoundaryAsyncThunk<number, number>(
        "calc/guarded",
        failing,
        { fallbackData: 7 }
      );

      const dispatch = vi.fn();
      const getState = vi.fn();

      const result = await guarded(123)(dispatch as any, getState, undefined);

      expect(result.type).toBe("calc/guarded/fulfilled");
      expect(result.payload).toBe(7);
    });
  });

  describe("asyncSelectors", () => {
    it("evaluates async state predicates", () => {
      const idle: AsyncState<number> = createAsyncState();
      const success: AsyncState<number> = {
        data: 1,
        loading: false,
        error: null,
        lastFetch: Date.now(),
        requestId: "x",
      };
      const failed: AsyncState<number> = {
        data: null,
        loading: false,
        error: new Error("e"),
        lastFetch: null,
        requestId: null,
      };

      expect(asyncSelectors.isIdle(idle)).toBe(true);
      expect(asyncSelectors.hasData(success)).toBe(true);
      expect(asyncSelectors.isSuccess(success)).toBe(true);
      expect(asyncSelectors.isFailed(failed)).toBe(true);
      expect(asyncSelectors.hasError(failed)).toBe(true);
      expect(typeof asyncSelectors.isStale(success, 0)).toBe("boolean");
    });
  });

  describe("combineAsyncStates", () => {
    it("aggregates multiple async states", () => {
      const s1: AsyncState<number> = {
        data: null,
        loading: true,
        error: null,
        lastFetch: null,
        requestId: null,
      };
      const s2: AsyncState<number> = {
        data: 1,
        loading: false,
        error: null,
        lastFetch: Date.now(),
        requestId: "a",
      };
      const s3: AsyncState<number> = {
        data: null,
        loading: false,
        error: "err" as any,
        lastFetch: null,
        requestId: null,
      };

      const combined = combineAsyncStates({ s1, s2, s3 });

      expect(combined.isAnyLoading).toBe(true);
      expect(combined.hasAnyError).toBe(true);
      expect(combined.allErrors.length).toBe(1);
      expect(combined.isAllSuccess).toBe(false);
      expect(combined.loadingCount).toBe(1);
    });
  });
});

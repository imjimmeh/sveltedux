import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  createAsyncReducer,
  createAsyncSlice,
  AsyncReducerBuilder,
  extraAsyncReducers as extraBuilder,
  getAsyncState,
  isAnyAsyncPending,
  getAllAsyncErrors,
} from "./asyncReducers.js";
import { createAsyncThunk, createAsyncState } from "./async.js";
import { isFulfilledAction, isRejectedAction } from "./typedActions.js";
import type { AsyncState, Action } from "./types.js";

type User = { id: number; name: string };

const fixedNow = 1_725_000_000_000;

describe("asyncReducers", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(fixedNow);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe("createAsyncReducer", () => {
    it("handles default pending/fulfilled/rejected", () => {
      const fetchUser = createAsyncThunk<User, number>(
        "user/fetch",
        async (id) => ({
          id,
          name: `User ${id}`,
        })
      );

      const reducer = createAsyncReducer<User, string, number>(fetchUser);

      const initial: AsyncState<User, string> = createAsyncState();
      const reqId = "req-1";

      const pendingState = reducer(initial, {
        type: fetchUser.pending,
        meta: { requestId: reqId },
      } as unknown as Action);
      expect(pendingState.loading).toBe(true);
      expect(pendingState.error).toBeNull();
      // createAsyncReducer default pending handler does not set requestId
      expect(pendingState.requestId).toBeNull();

      const fulfilledState = reducer(pendingState, {
        type: fetchUser.fulfilled,
        payload: { id: 1, name: "User 1" },
        meta: { requestId: reqId },
      } as unknown as Action);
      expect(fulfilledState.loading).toBe(false);
      expect(fulfilledState.error).toBeNull();
      expect(fulfilledState.data).toEqual({ id: 1, name: "User 1" });
      expect(fulfilledState.lastFetch).toBe(fixedNow);
      expect(fulfilledState.requestId).toBe(reqId);

      const rejectedState = reducer(fulfilledState, {
        type: fetchUser.rejected,
        error: { message: "boom" },
        meta: { requestId: "req-2", rejectedWithValue: false },
      } as unknown as Action);
      expect(rejectedState.loading).toBe(false);
      expect((rejectedState.error as any).message).toBe("boom");
      expect(rejectedState.requestId).toBe("req-2");

      const rejectedWithValueState = reducer(fulfilledState, {
        type: fetchUser.rejected,
        payload: "bad",
        meta: { requestId: "req-3", rejectedWithValue: true },
      } as unknown as Action);
      expect(rejectedWithValueState.loading).toBe(false);
      expect(rejectedWithValueState.error).toBe("bad");
      expect(rejectedWithValueState.requestId).toBe("req-3");
    });

    it("supports custom handlers", () => {
      const op = createAsyncThunk<number, void>("op/run", async () => 42);
      const reducer = createAsyncReducer<number, string, void>(op, {
        pending: (s) => ({ ...s, loading: true, error: "pending" as any }),
        fulfilled: (s, a) => ({ ...s, data: a.payload, loading: false }),
        rejected: (s, a) => ({
          ...s,
          error: (a.payload as any) ?? (a.error as any) ?? "err",
        }),
      });

      const initial: AsyncState<number, string> = createAsyncState();
      const st1 = reducer(initial, {
        type: op.pending,
        meta: { requestId: "r" },
      } as any);
      expect(st1.loading).toBe(true);
      expect(st1.error).toBe("pending");

      const st2 = reducer(st1, {
        type: op.fulfilled,
        payload: 42,
        meta: { requestId: "r" },
      } as any);
      expect(st2.data).toBe(42);
      expect(st2.loading).toBe(false);

      const st3 = reducer(st2, {
        type: op.rejected,
        payload: "nope",
        meta: { requestId: "r", rejectedWithValue: true },
      } as any);
      expect(st3.error).toBe("nope");
    });
  });

  describe("createAsyncSlice", () => {
    it("creates sync action creators and handles async thunks", () => {
      const fetchUser = createAsyncThunk<User, number>(
        "user/fetchUser",
        async (id) => ({
          id,
          name: `U${id}`,
        })
      );

      const initial = {
        count: 0,
        user: createAsyncState<User, string>(),
      };

      const slice = createAsyncSlice({
        name: "app",
        initialState: initial as any,
        reducers: {
          increment: (state: any, action: Action<number>) => ({
            ...state,
            count: state.count + (action.payload ?? 1),
          }),
        },
        asyncThunks: {
          user: fetchUser as any,
        },
        extraAsyncReducers: (builder: any) => {
          builder
            .addMatcher(isFulfilledAction as any, (state: any) => {
              // no-op for state, just ensure path executes
              return state;
            })
            .addMatcher(isRejectedAction as any, (state: any) => state);
        },
      } as any);

      // Sync reducer
      const a1 = slice.actions.increment(5);
      expect(a1.type).toBe("app/increment");
      let state = slice.reducer(undefined, a1);
      expect(state.count).toBe(5);

      // Pending updates async sub-state
      state = slice.reducer(state, {
        type: fetchUser.pending,
        meta: { requestId: "req-10" },
      } as any);
      expect(state.user.loading).toBe(true);
      expect(state.user.error).toBeNull();
      expect(state.user.requestId).toBe("req-10");

      // Fulfilled updates data, lastFetch, requestId
      state = slice.reducer(state, {
        type: fetchUser.fulfilled,
        payload: { id: 9, name: "U9" },
        meta: { requestId: "req-10" },
      } as any);
      expect(state.user.loading).toBe(false);
      expect(state.user.data).toEqual({ id: 9, name: "U9" });
      expect(state.user.lastFetch).toBe(fixedNow);
      expect(state.user.error).toBeNull();

      // Rejected with error object
      state = slice.reducer(state, {
        type: fetchUser.rejected,
        error: { message: "X" },
        meta: { requestId: "req-11", rejectedWithValue: false },
      } as any);
      expect((state.user.error as any).message).toBe("X");
      expect(state.user.loading).toBe(false);
    });
  });

  describe("AsyncReducerBuilder", () => {
    it("supports addCase/addMatcher/addDefaultCase and respects first match", () => {
      const builder = new AsyncReducerBuilder<{ n: number }>({ n: 0 });
      builder
        .addCase("inc", (s, a: Action<number>) => ({
          n: s.n + (a.payload ?? 1),
        }))
        .addMatcher(
          (a: Action) => a.type === "set",
          (s, a: Action<number>) => ({ n: a.payload ?? s.n })
        )
        .addDefaultCase((s) => s);

      const reducer = builder.build();

      let st = reducer(undefined, { type: "inc", payload: 2 });
      expect(st.n).toBe(2);

      // First match wins: addCase 'inc' should handle, not matcher
      st = reducer({ n: 5 }, { type: "inc", payload: 3 });
      expect(st.n).toBe(8);

      // Matcher
      st = reducer(st, { type: "set", payload: 42 });
      expect(st.n).toBe(42);

      // Default case returns same
      const same = reducer(st, { type: "noop" });
      expect(same).toBe(st);
    });

    it("extraAsyncReducers passthrough returns the same builder", () => {
      const b = new AsyncReducerBuilder<number>(0);
      const returned = extraBuilder(b);
      expect(returned).toBe(b);
    });
  });

  describe("utility helpers", () => {
    it("getAsyncState / isAnyAsyncPending / getAllAsyncErrors", () => {
      const a: AsyncState<number, string> = {
        data: null,
        loading: true,
        error: null,
        lastFetch: null,
        requestId: null,
      };
      const b: AsyncState<number, string> = {
        data: 1,
        loading: false,
        error: "oops",
        lastFetch: fixedNow,
        requestId: "x",
      };

      const map = { one: a, two: b } as Record<
        string,
        AsyncState<unknown, unknown>
      >;

      const gs = getAsyncState(map as any, "two");
      expect(gs).toEqual(b as any);

      expect(isAnyAsyncPending(map)).toBe(true);

      const errs = getAllAsyncErrors(map);
      expect(errs).toEqual(["oops"]);
    });
  });
});

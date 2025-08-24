import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createStore } from "../store.svelte.js";
import { applyMiddleware, compose } from "../middleware.js";
import type { Reducer } from "../types.js";
import {
  createPersistEnhancer,
  createPersistMiddleware,
  PERSIST_PURGE,
  PERSIST_FLUSH,
  PERSIST_PAUSE,
  PERSIST_RESUME,
} from "./index.js";
import { createMemoryStorage } from "../../test/test-utils.js";

interface TestState {
  count: number;
  text: string;
}

const initialState: TestState = { count: 0, text: "init" };

const reducer: Reducer<TestState> = (state = initialState, action) => {
  switch (action.type) {
    case "INCREMENT":
      return { ...state, count: state.count + 1 };
    case "SET_TEXT":
      return { ...state, text: action.payload };
    default:
      return state;
  }
};

describe("persist middleware - gating and control", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("gates writes for non-matching actions and flushes on matching types", () => {
    const key = "persist-test-7";
    const storage = createMemoryStorage({ set: true });

    const enhancer = createPersistEnhancer<TestState>({
      key,
      storage,
      version: 2,
      throttle: 50,
    });
    // Only persist immediately on INCREMENT, ignore SET_TEXT
    const middleware = createPersistMiddleware<TestState>({
      key,
      storage,
      types: ["INCREMENT"],
    });

    const composedEnhancer: any = (compose as any)(
      enhancer,
      applyMiddleware(middleware)
    );
    const store = createStore(reducer, initialState, composedEnhancer);

    // Dispatch disallowed action - should NOT schedule write
    store.dispatch({ type: "SET_TEXT", payload: "no-write" });
    vi.advanceTimersByTime(60);
    expect(storage.__setSpy).toHaveBeenCalledTimes(0);

    // Dispatch allowed action - should flush and write immediately after debounce window
    store.dispatch({ type: "INCREMENT" });
    vi.runAllTimers();
    expect(storage.__setSpy).toHaveBeenCalledTimes(1);

    const lastCall3 =
      storage.__setSpy.mock.calls[storage.__setSpy.mock.calls.length - 1]!;
    const rec = JSON.parse(lastCall3[1]);
    expect(rec.state).toEqual({ count: 1, text: "no-write" });
  });

  it("supports control actions: PAUSE/RESUME, PURGE, FLUSH", () => {
    const key = "persist-test-8";
    const storage = createMemoryStorage({ set: true, remove: true });

    const enhancer = createPersistEnhancer<TestState>({
      key,
      storage,
      version: 2,
      throttle: 10,
    });
    const middleware = createPersistMiddleware<TestState>({ key, storage });

    const composedEnhancer: any = (compose as any)(
      enhancer,
      applyMiddleware(middleware)
    );
    const store = createStore(reducer, initialState, composedEnhancer);

    // Pause should prevent scheduling
    store.dispatch({ type: PERSIST_PAUSE } as any);
    store.dispatch({ type: "INCREMENT" });
    vi.runAllTimers();
    expect(storage.__setSpy).toHaveBeenCalledTimes(0);

    // Resume and flush should force immediate write
    store.dispatch({ type: PERSIST_RESUME } as any);
    store.dispatch({ type: PERSIST_FLUSH } as any);
    expect(storage.__setSpy).toHaveBeenCalledTimes(1);

    // Purge should remove key
    store.dispatch({ type: PERSIST_PURGE } as any);
    expect(storage.__removeSpy).toHaveBeenCalledWith(key);
  });
});

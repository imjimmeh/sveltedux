import { describe, it, expect, vi } from "vitest";
import { createStore } from "../store.svelte.js";
import type { Reducer } from "../types.js";
import {
  createPersistEnhancer,
  purgePersistedState,
  type StorageLike,
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

describe("persist enhancer - rehydrate and persist", () => {
  it("rehydrates with replace strategy from wrapped record", () => {
    const key = "persist-test-1";
    const storage = createMemoryStorage();
    const persisted = {
      version: 2,
      state: { count: 5, text: "from-storage" },
    };
    storage.setItem(key, JSON.stringify(persisted));

    const enhancer = createPersistEnhancer<TestState>({
      key,
      storage,
      version: 2,
      rehydrateStrategy: "replace",
    });

    const store = createStore(reducer, initialState, enhancer);
    expect(store.getState()).toEqual({ count: 5, text: "from-storage" });
  });

  it("throttles writes (single write after many rapid dispatches)", () => {
    vi.useFakeTimers();
    const key = "persist-test-2";
    const storage = createMemoryStorage({ set: true });

    const enhancer = createPersistEnhancer<TestState>({
      key,
      storage,
      throttle: 250,
      version: 2,
    });

    const store = createStore(reducer, initialState, enhancer);

    // Rapid updates
    store.dispatch({ type: "INCREMENT" });
    store.dispatch({ type: "INCREMENT" });
    store.dispatch({ type: "SET_TEXT", payload: "abc" });

    // Not yet persisted until timers run
    expect(storage.__setSpy).toHaveBeenCalledTimes(0);

    vi.runAllTimers();

    // Only one persisted write expected due to debounce/throttle
    expect(storage.__setSpy).toHaveBeenCalledTimes(1);
    const lastCall =
      storage.__setSpy.mock.calls[storage.__setSpy.mock.calls.length - 1]!;
    const record = JSON.parse(lastCall[1]);
    expect(record).toHaveProperty("version", 2);
    expect(record).toHaveProperty("state");
    expect(record.state).toEqual({ count: 2, text: "abc" });

    vi.useRealTimers();
  });

  it("respects custom partialize (only persists selected subset)", () => {
    vi.useFakeTimers();
    const key = "persist-test-3";
    const storage = createMemoryStorage({ set: true });

    const enhancer = createPersistEnhancer<TestState>({
      key,
      storage,
      version: 2,
      throttle: 0,
      partialize: (s) => ({ count: s.count }),
    });

    const store = createStore(reducer, initialState, enhancer);
    store.dispatch({ type: "INCREMENT" });
    store.dispatch({ type: "SET_TEXT", payload: "should-not-persist" });

    vi.runAllTimers();

    expect(storage.__setSpy).toHaveBeenCalled();
    const lastCall2 =
      storage.__setSpy.mock.calls[storage.__setSpy.mock.calls.length - 1]!;
    const persisted = JSON.parse(lastCall2[1]);
    expect(persisted.version).toBe(2);
    expect(persisted.state).toEqual({ count: 1 });
    vi.useRealTimers();
  });

  it("runs migrate when version differs and writes upgraded record back", () => {
    const key = "persist-test-4";
    const storage = createMemoryStorage({ set: true });
    // Simulate old version payload
    storage.setItem(key, JSON.stringify({ version: 1, state: { old: true } }));

    const enhancer = createPersistEnhancer({
      key,
      storage,
      version: 2,
      migrate: (state: any, from: number) => {
        expect(from).toBe(1);
        return { migrated: state.old === true };
      },
    });

    // Creating store should trigger migration write back immediately
    const store = createStore(reducer, initialState, enhancer);
    expect(store.getState()).toEqual({
      count: 0,
      text: "init",
    });

    // Verify upgraded record by reading storage value
    const rawLatest = storage.getItem(key)!;
    const parsed = JSON.parse(rawLatest);
    expect(parsed.version).toBe(2);
    expect(parsed.state).toEqual({ migrated: true });
  });

  it("does not crash if storage throws (SSR-safety)", () => {
    const key = "persist-test-5";
    const throwingStorage: StorageLike = {
      getItem() {
        throw new Error("no storage");
      },
      setItem() {
        throw new Error("no storage");
      },
      removeItem() {
        throw new Error("no storage");
      },
    };

    const enhancer = createPersistEnhancer({
      key,
      storage: throwingStorage,
      version: 2,
    });
    // Should not throw
    const store = createStore(reducer, initialState, enhancer);
    expect(store.getState()).toEqual(initialState);
  });

  it("purgePersistedState removes stored value", () => {
    const key = "persist-test-6";
    const storage = createMemoryStorage({ remove: true });

    const enhancer = createPersistEnhancer<TestState>({
      key,
      storage,
      version: 2,
    });
    const store = createStore(reducer, initialState, enhancer);

    store.dispatch({ type: "INCREMENT" });

    purgePersistedState(key, storage);
    // removeItem should be called
    expect(storage.__removeSpy).toHaveBeenCalledWith(key);
  });
});

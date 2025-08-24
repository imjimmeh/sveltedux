import { describe, it, expect, vi } from "vitest";
import {
  produce,
  bindActionCreators,
  shallowEqual,
  deepEqual,
  freeze,
  createDraftSafeSelector,
} from "./utils.js";

describe("produce", () => {
  it("should handle basic objects", () => {
    const state = { count: 0, name: "test" };
    const newState = produce(state, (draft) => {
      draft.count = 1;
    });

    expect(newState).toEqual({ count: 1, name: "test" });
    expect(newState).not.toBe(state);
  });

  it("should handle arrays", () => {
    const state = [1, 2, 3];
    const newState = produce(state, (draft) => {
      draft.push(4);
    });

    expect(newState).toEqual([1, 2, 3, 4]);
    expect(newState).not.toBe(state);
  });

  it("should handle Date objects", () => {
    const date = new Date("2023-01-01");
    const state = { created: date };
    const newState = produce(state, (draft) => {
      // Immer modifies Date objects in place, so we need to create a new Date
      draft.created = new Date(2024, 0, 1); // January 1, 2024
    });

    expect(newState.created.getFullYear()).toBe(2024);
    expect(state.created.getFullYear()).toBe(2023);
    expect(newState.created).not.toBe(state.created);
  });

  it("should handle Map objects", () => {
    const map = new Map([
      ["key1", "value1"],
      ["key2", "value2"],
    ]);
    const state = { data: map };
    const newState = produce(state, (draft) => {
      draft.data.set("key3", "value3");
    });

    expect(newState.data.get("key3")).toBe("value3");
    expect(state.data.has("key3")).toBe(false);
    expect(newState.data).not.toBe(state.data);
  });

  it("should handle Set objects", () => {
    const set = new Set([1, 2, 3]);
    const state = { tags: set };
    const newState = produce(state, (draft) => {
      draft.tags.add(4);
    });

    expect(newState.tags.has(4)).toBe(true);
    expect(state.tags.has(4)).toBe(false);
    expect(newState.tags).not.toBe(state.tags);
  });

  it("should handle BigInt values", () => {
    const state = { largeNumber: BigInt(123456789012345678901234567890n) };
    const newState = produce(state, (draft) => {
      draft.largeNumber = BigInt(987654321098765432109876543210n);
    });

    expect(newState.largeNumber).toBe(BigInt(987654321098765432109876543210n));
    expect(state.largeNumber).toBe(BigInt(123456789012345678901234567890n));
  });

  it("should handle functions", () => {
    const fn = () => "test";
    const state = { callback: fn };
    const newState = produce(state, (draft) => {
      // Functions should be preserved by reference
    });

    expect(newState.callback).toBe(fn);
    expect(newState.callback()).toBe("test");
  });

  it("should handle undefined values", () => {
    const state = { a: 1, b: undefined, c: null };
    const newState = produce(state, (draft) => {
      draft.a = 2;
    });

    expect(newState).toEqual({ a: 2, b: undefined, c: null });
    expect(newState.b).toBeUndefined();
  });

  it("should handle nested objects", () => {
    const state = {
      user: {
        name: "John",
        address: {
          street: "123 Main St",
          city: "New York",
        },
      },
    };

    const newState = produce(state, (draft) => {
      draft.user.address.city = "Boston";
    });

    expect(newState.user.address.city).toBe("Boston");
    expect(state.user.address.city).toBe("New York");
    expect(newState.user.address).not.toBe(state.user.address);
  });

  it("should handle when recipe returns a value", () => {
    const state = { count: 0 };
    const newState = produce(state, () => {
      return { count: 42 };
    });

    expect(newState).toEqual({ count: 42 });
  });

  it("should handle when recipe returns undefined", () => {
    const state = { count: 0 };
    const newState = produce(state, (draft) => {
      draft.count = 1;
      return undefined;
    });

    expect(newState).toEqual({ count: 1 });
  });
});

describe("bindActionCreators", () => {
  it("should bind action creators to dispatch", () => {
    const mockDispatch = vi.fn((action) => action);
    const actionCreators = {
      increment: () => ({ type: "INCREMENT" }),
      decrement: () => ({ type: "DECREMENT" }),
      addValue: (value: number) => ({ type: "ADD_VALUE", payload: value }),
    };

    const boundActions = bindActionCreators(actionCreators, mockDispatch);

    boundActions.increment();
    boundActions.decrement();
    boundActions.addValue(5);

    expect(mockDispatch).toHaveBeenCalledTimes(3);
    expect(mockDispatch).toHaveBeenCalledWith({ type: "INCREMENT" });
    expect(mockDispatch).toHaveBeenCalledWith({ type: "DECREMENT" });
    expect(mockDispatch).toHaveBeenCalledWith({
      type: "ADD_VALUE",
      payload: 5,
    });
  });

  it("should only bind functions", () => {
    const mockDispatch = vi.fn();
    const actionCreators = {
      increment: () => ({ type: "INCREMENT" }),
      notAFunction: "not a function",
      anotherFunction: () => ({ type: "ANOTHER" }),
    };

    const boundActions = bindActionCreators(actionCreators, mockDispatch);

    expect(typeof boundActions.increment).toBe("function");
    expect(boundActions.notAFunction).toBeUndefined(); // Non-functions are not copied
    expect(typeof boundActions.anotherFunction).toBe("function");
  });

  it("should preserve function return values", () => {
    const mockDispatch = vi.fn((action) => ({ ...action, dispatched: true }));
    const actionCreators = {
      test: () => ({ type: "TEST" }),
    };

    const boundActions = bindActionCreators(actionCreators, mockDispatch);
    const result = boundActions.test();

    expect(result).toEqual({ type: "TEST", dispatched: true });
  });
});

describe("shallowEqual", () => {
  it("should return true for identical references", () => {
    const obj = { a: 1, b: 2 };
    expect(shallowEqual(obj, obj)).toBe(true);
  });

  it("should return true for objects with same properties", () => {
    const obj1 = { a: 1, b: 2, c: "test" };
    const obj2 = { a: 1, b: 2, c: "test" };
    expect(shallowEqual(obj1, obj2)).toBe(true);
  });

  it("should return false for objects with different values", () => {
    const obj1 = { a: 1, b: 2 };
    const obj2 = { a: 1, b: 3 };
    expect(shallowEqual(obj1, obj2)).toBe(false);
  });

  it("should return false for objects with different keys", () => {
    const obj1 = { a: 1, b: 2 };
    const obj2 = { a: 1, c: 2 };
    expect(shallowEqual(obj1, obj2)).toBe(false);
  });

  it("should return false for objects with different number of keys", () => {
    const obj1 = { a: 1, b: 2 };
    const obj2 = { a: 1, b: 2, c: 3 };
    expect(shallowEqual(obj1, obj2)).toBe(false);
  });

  it("should handle null and undefined", () => {
    expect(shallowEqual(null, null)).toBe(true);
    expect(shallowEqual(undefined, undefined)).toBe(true);
    expect(shallowEqual(null, undefined)).toBe(false);
    expect(shallowEqual({}, null)).toBe(false);
  });

  it("should handle primitives", () => {
    expect(shallowEqual(1, 1)).toBe(true);
    expect(shallowEqual("test", "test")).toBe(true);
    expect(shallowEqual(true, true)).toBe(true);
    expect(shallowEqual(1, 2)).toBe(false);
  });

  it("should not do deep comparison", () => {
    const obj1 = { nested: { a: 1 } };
    const obj2 = { nested: { a: 1 } };
    expect(shallowEqual(obj1, obj2)).toBe(false);
  });
});

describe("deepEqual", () => {
  it("should return true for identical references", () => {
    const obj = { a: 1, b: { c: 2 } };
    expect(deepEqual(obj, obj)).toBe(true);
  });

  it("should return true for deeply equal objects", () => {
    const obj1 = { a: 1, b: { c: 2, d: [3, 4, { e: 5 }] } };
    const obj2 = { a: 1, b: { c: 2, d: [3, 4, { e: 5 }] } };
    expect(deepEqual(obj1, obj2)).toBe(true);
  });

  it("should return false for deeply different objects", () => {
    const obj1 = { a: 1, b: { c: 2 } };
    const obj2 = { a: 1, b: { c: 3 } };
    expect(deepEqual(obj1, obj2)).toBe(false);
  });

  it("should handle arrays", () => {
    expect(deepEqual([1, 2, 3], [1, 2, 3])).toBe(true);
    expect(deepEqual([1, 2, 3], [1, 2, 4])).toBe(false);
    expect(deepEqual([1, [2, 3]], [1, [2, 3]])).toBe(true);
    expect(deepEqual([1, [2, 3]], [1, [2, 4]])).toBe(false);
  });

  it("should handle null and undefined", () => {
    expect(deepEqual(null, null)).toBe(true);
    expect(deepEqual(undefined, undefined)).toBe(true);
    expect(deepEqual(null, undefined)).toBe(false);
  });

  it("should handle primitives", () => {
    expect(deepEqual(1, 1)).toBe(true);
    expect(deepEqual("test", "test")).toBe(true);
    expect(deepEqual(true, true)).toBe(true);
    expect(deepEqual(1, 2)).toBe(false);
  });

  it("should handle mixed types", () => {
    expect(deepEqual({}, [])).toBe(false);
    expect(deepEqual(1, "1")).toBe(false);
    expect(deepEqual(true, 1)).toBe(false);
  });

  it("should handle empty objects and arrays", () => {
    expect(deepEqual({}, {})).toBe(true);
    expect(deepEqual([], [])).toBe(true);
    expect(deepEqual({}, [])).toBe(false);
  });
});

describe("freeze", () => {
  it("should freeze an object", () => {
    const obj = { a: 1, b: 2 };
    const frozen = freeze(obj);

    expect(frozen).toBe(obj);
    expect(Object.isFrozen(frozen)).toBe(true);
  });

  it("should prevent modifications to frozen object", () => {
    const obj = { a: 1, b: 2 };
    const frozen = freeze(obj);

    expect(() => {
      (frozen as any).a = 2;
    }).toThrow();
  });

  it("should freeze arrays", () => {
    const arr = [1, 2, 3];
    const frozen = freeze(arr);

    expect(Object.isFrozen(frozen)).toBe(true);
  });
});

describe("createDraftSafeSelector", () => {
  it("should create a memoized selector", () => {
    const mockSelector = vi.fn((state: { count: number }) => state.count * 2);
    const selector = createDraftSafeSelector(mockSelector);

    const state1 = { count: 5 };
    const result1 = selector(state1);
    const result2 = selector(state1);

    expect(result1).toBe(10);
    expect(result2).toBe(10);
    expect(mockSelector).toHaveBeenCalledTimes(1);
  });

  it("should recompute when state changes", () => {
    const mockSelector = vi.fn((state: { count: number }) => state.count * 2);
    const selector = createDraftSafeSelector(mockSelector);

    const state1 = { count: 5 };
    const state2 = { count: 10 };

    const result1 = selector(state1);
    const result2 = selector(state2);

    expect(result1).toBe(10);
    expect(result2).toBe(20);
    expect(mockSelector).toHaveBeenCalledTimes(2);
  });

  it("should use custom equality function", () => {
    const mockSelector = vi.fn((state: { items: string[] }) => state.items);
    const customEqual = vi.fn((a, b) => a.length === b.length);
    const selector = createDraftSafeSelector(mockSelector, customEqual);

    const state1 = { items: ["a", "b"] };
    const state2 = { items: ["c", "d"] };

    const result1 = selector(state1);
    const result2 = selector(state2);

    expect(customEqual).toHaveBeenCalled();
    expect(mockSelector).toHaveBeenCalledTimes(2); // Selector runs for each state change
    expect(result1).toBe(result2); // But result should be memoized due to custom equality
  });

  it("should handle undefined lastResult", () => {
    const mockSelector = vi.fn((state: { value: string }) => state.value);
    const selector = createDraftSafeSelector(mockSelector);

    const state = { value: "test" };
    const result = selector(state);

    expect(result).toBe("test");
    expect(mockSelector).toHaveBeenCalledTimes(1);
  });
});

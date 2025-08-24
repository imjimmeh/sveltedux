import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  applyMiddleware,
  compose,
  thunkMiddleware,
  loggerMiddleware,
  createListenerMiddleware,
} from "./middleware.js";
import { createStore } from "./store.svelte.js";
import type { Action, Middleware } from "./types.js";

interface TestState {
  count: number;
  messages: string[];
}

const initialState: TestState = {
  count: 0,
  messages: [],
};

const testReducer = (state = initialState, action: Action): TestState => {
  switch (action.type) {
    case "INCREMENT":
      return { ...state, count: state.count + 1 };
    case "DECREMENT":
      return { ...state, count: state.count - 1 };
    case "ADD_MESSAGE":
      return { ...state, messages: [...state.messages, action.payload] };
    default:
      return state;
  }
};

describe("compose", () => {
  it("should compose functions from right to left", () => {
    const add1 = (x: number) => x + 1;
    const multiply2 = (x: number) => x * 2;
    const subtract3 = (x: number) => x - 3;

    const composed = compose(subtract3, multiply2, add1);
    const result = composed(5);

    // (5 + 1) * 2 - 3 = 9
    expect(result).toBe(9);
  });

  it("should return identity for no functions", () => {
    const composed = compose();
    expect(composed(5)).toBe(5);
  });

  it("should return the function for single function", () => {
    const add1 = (x: number) => x + 1;
    const composed = compose(add1);
    expect(composed(5)).toBe(6);
  });
});

describe("applyMiddleware", () => {
  it("should apply middleware to store", () => {
    const actionLogger: string[] = [];
    const loggingMiddleware: Middleware =
      ({ dispatch, getState }) =>
      (next) =>
      (action) => {
        actionLogger.push(action.type);
        return next(action);
      };

    const enhancer = applyMiddleware(loggingMiddleware);
    const store = createStore(testReducer, undefined, enhancer);

    store.dispatch({ type: "INCREMENT" });
    store.dispatch({ type: "ADD_MESSAGE", payload: "hello" });

    expect(actionLogger).toEqual(["INCREMENT", "ADD_MESSAGE"]);
    expect(store.getState().count).toBe(1);
    expect(store.getState().messages).toEqual(["hello"]);
  });

  it("should apply multiple middleware in correct order", () => {
    const log: string[] = [];

    const middleware1: Middleware = () => (next) => (action) => {
      log.push("middleware1-before");
      const result = next(action);
      log.push("middleware1-after");
      return result;
    };

    const middleware2: Middleware = () => (next) => (action) => {
      log.push("middleware2-before");
      const result = next(action);
      log.push("middleware2-after");
      return result;
    };

    const enhancer = applyMiddleware(middleware1, middleware2);
    const store = createStore(testReducer, undefined, enhancer);

    store.dispatch({ type: "INCREMENT" });

    expect(log).toEqual([
      "middleware1-before",
      "middleware2-before",
      "middleware2-after",
      "middleware1-after",
    ]);
  });

  it("should allow middleware to access dispatch and getState", () => {
    let capturedState: TestState | undefined;
    let dispatchCalled = false;

    const testMiddleware: Middleware<TestState> =
      ({ dispatch, getState }) =>
      (next) =>
      (action) => {
        capturedState = getState();

        if (action.type === "INCREMENT") {
          // Middleware can dispatch additional actions
          dispatch({ type: "ADD_MESSAGE", payload: "incremented" });
          dispatchCalled = true;
        }

        return next(action);
      };

    const enhancer = applyMiddleware(testMiddleware);
    const store = createStore(testReducer, undefined, enhancer);

    store.dispatch({ type: "INCREMENT" });

    expect(capturedState).toEqual(initialState);
    expect(dispatchCalled).toBe(true);
    expect(store.getState().messages).toContain("incremented");
  });

  it("should allow middleware to modify actions", () => {
    const uppercaseMiddleware: Middleware = () => (next) => (action) => {
      if (action.type === "ADD_MESSAGE" && typeof action.payload === "string") {
        return next({
          ...action,
          payload: action.payload.toUpperCase(),
        });
      }
      return next(action);
    };

    const enhancer = applyMiddleware(uppercaseMiddleware);
    const store = createStore(testReducer, undefined, enhancer);

    store.dispatch({ type: "ADD_MESSAGE", payload: "hello" });

    expect(store.getState().messages).toEqual(["HELLO"]);
  });

  it("should allow middleware to prevent actions", () => {
    const filterMiddleware: Middleware = () => (next) => (action) => {
      if (action.type === "INCREMENT") {
        // Don't call next() to prevent the action
        return action;
      }
      return next(action);
    };

    const enhancer = applyMiddleware(filterMiddleware);
    const store = createStore(testReducer, undefined, enhancer);

    store.dispatch({ type: "INCREMENT" });
    store.dispatch({ type: "DECREMENT" });

    // Increment should be filtered out, decrement should go through
    expect(store.getState().count).toBe(-1);
  });
});

describe("thunkMiddleware", () => {
  it("should handle function actions (thunks)", async () => {
    const enhancer = applyMiddleware(thunkMiddleware);
    const store = createStore(testReducer, undefined, enhancer);

    const thunkAction = (dispatch: any, getState: any) => {
      dispatch({ type: "INCREMENT" });
      dispatch({ type: "ADD_MESSAGE", payload: "thunk executed" });
      return "thunk result";
    };

    const result = store.dispatch(thunkAction as any);

    expect(result).toBe("thunk result");
    expect(store.getState().count).toBe(1);
    expect(store.getState().messages).toContain("thunk executed");
  });

  it("should pass dispatch and getState to thunks", async () => {
    const enhancer = applyMiddleware(thunkMiddleware);
    const store = createStore(testReducer, undefined, enhancer);

    let capturedDispatch: any;
    let capturedGetState: any;
    let capturedExtraArgument: any;

    const thunkAction = (dispatch: any, getState: any, extraArgument: any) => {
      capturedDispatch = dispatch;
      capturedGetState = getState;
      capturedExtraArgument = extraArgument;
    };

    store.dispatch(thunkAction as any);

    expect(typeof capturedDispatch).toBe("function");
    expect(typeof capturedGetState).toBe("function");
    expect(capturedExtraArgument).toBeUndefined();
  });

  it("should handle async thunks", async () => {
    const enhancer = applyMiddleware(thunkMiddleware);
    const store = createStore(testReducer, undefined, enhancer);

    const asyncThunk = async (dispatch: any, getState: any) => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      dispatch({ type: "ADD_MESSAGE", payload: "async complete" });
      return "async result";
    };

    const result = await store.dispatch(asyncThunk as any);

    expect(result).toBe("async result");
    expect(store.getState().messages).toContain("async complete");
  });

  it("should handle regular actions normally", () => {
    const enhancer = applyMiddleware(thunkMiddleware);
    const store = createStore(testReducer, undefined, enhancer);

    const action = { type: "INCREMENT" };
    const result = store.dispatch(action);

    expect(result).toBe(action);
    expect(store.getState().count).toBe(1);
  });
});

describe("loggerMiddleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should log actions with state", () => {
    const consoleSpy = vi.spyOn(console, "group").mockImplementation(() => {});
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const groupEndSpy = vi
      .spyOn(console, "groupEnd")
      .mockImplementation(() => {});

    const enhancer = applyMiddleware(loggerMiddleware);
    const store = createStore(testReducer, undefined, enhancer);

    store.dispatch({ type: "INCREMENT" });

    expect(consoleSpy).toHaveBeenCalledWith("action INCREMENT");
    expect(logSpy).toHaveBeenCalledWith("prev state", initialState);
    expect(logSpy).toHaveBeenCalledWith("action", { type: "INCREMENT" });
    expect(logSpy).toHaveBeenCalledWith("next state", {
      count: 1,
      messages: [],
    });
    expect(groupEndSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
    logSpy.mockRestore();
    groupEndSpy.mockRestore();
  });

  it("should not log non-action objects", () => {
    const consoleSpy = vi.spyOn(console, "group").mockImplementation(() => {});

    // Need thunkMiddleware to handle function dispatch
    const enhancer = applyMiddleware(thunkMiddleware, loggerMiddleware);
    const store = createStore(testReducer, undefined, enhancer);

    // Dispatch a function (which would be handled by thunk middleware if present)
    const thunk = () => {};
    store.dispatch(thunk as any);

    expect(consoleSpy).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it("should handle actions without type", () => {
    const consoleSpy = vi.spyOn(console, "group").mockImplementation(() => {});

    const enhancer = applyMiddleware(loggerMiddleware);
    const store = createStore(testReducer, undefined, enhancer);

    // Invalid actions should now throw an error at the core store level
    expect(() => {
      store.dispatch({ type: null } as any);
    }).toThrow("Actions must have a type property that is a string.");

    expect(consoleSpy).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });
});

describe("middleware integration", () => {
  it("should work with thunk and logger middleware together", async () => {
    const consoleSpy = vi.spyOn(console, "group").mockImplementation(() => {});
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const groupEndSpy = vi
      .spyOn(console, "groupEnd")
      .mockImplementation(() => {});

    const enhancer = applyMiddleware(thunkMiddleware, loggerMiddleware);
    const store = createStore(testReducer, undefined, enhancer);

    const thunkAction = (dispatch: any) => {
      dispatch({ type: "INCREMENT" });
      dispatch({ type: "ADD_MESSAGE", payload: "from thunk" });
    };

    store.dispatch(thunkAction as any);

    // Should log both dispatched actions
    expect(consoleSpy).toHaveBeenCalledWith("action INCREMENT");
    expect(consoleSpy).toHaveBeenCalledWith("action ADD_MESSAGE");

    consoleSpy.mockRestore();
    logSpy.mockRestore();
    groupEndSpy.mockRestore();
  });

  it("should preserve action return values through middleware chain", () => {
    const middleware1: Middleware = () => (next) => (action) => {
      const result = next(action);
      return { ...result, middleware1: true };
    };

    const middleware2: Middleware = () => (next) => (action) => {
      const result = next(action);
      return { ...result, middleware2: true };
    };

    const enhancer = applyMiddleware(middleware1, middleware2);
    const store = createStore(testReducer, undefined, enhancer);

    const action = { type: "INCREMENT" };
    const result = store.dispatch(action) as any;

    expect(result.type).toBe("INCREMENT");
    expect(result.middleware1).toBe(true);
    expect(result.middleware2).toBe(true);
  });

  it("should handle errors in middleware gracefully", () => {
    const errorMiddleware: Middleware = () => (next) => (action) => {
      if (action.type === "ERROR") {
        throw new Error("Middleware error");
      }
      return next(action);
    };

    const enhancer = applyMiddleware(errorMiddleware);
    const store = createStore(testReducer, undefined, enhancer);

    expect(() => {
      store.dispatch({ type: "ERROR" });
    }).toThrow("Middleware error");

    // Store should still work after error
    store.dispatch({ type: "INCREMENT" });
    expect(store.getState().count).toBe(1);
  });
});

describe("createListenerMiddleware", () => {
  it("invokes effect when predicate returns true and supports unsubscribe", () => {
    const { middleware, startListening } =
      createListenerMiddleware<TestState>();
    const enhancer = applyMiddleware(middleware);
    const store = createStore(testReducer, undefined, enhancer);

    const effect = vi.fn((action, { dispatch }) => {
      dispatch({ type: "ADD_MESSAGE", payload: "effect-fired" });
    });

    const stop = startListening({
      predicate: (action) => action.type === "INCREMENT",
      effect,
    });

    // Dispatch unrelated action - should not fire effect
    store.dispatch({ type: "DECREMENT" });
    expect(effect).not.toHaveBeenCalled();

    // Dispatch matching action - should fire effect
    store.dispatch({ type: "INCREMENT" });
    expect(effect).toHaveBeenCalledTimes(1);
    expect(store.getState().messages).toContain("effect-fired");

    // Unsubscribe and dispatch again - effect should not fire
    stop();
    store.dispatch({ type: "INCREMENT" });
    expect(effect).toHaveBeenCalledTimes(1);
  });

  it("supports actionCreator type", () => {
    const { middleware, startListening } =
      createListenerMiddleware<TestState>();
    const enhancer = applyMiddleware(middleware);
    const store = createStore(testReducer, undefined, enhancer);

    const addMessage = { type: "ADD_MESSAGE" };
    const effect = vi.fn();

    startListening({
      actionCreator: addMessage,
      effect,
    });

    store.dispatch({ type: "INCREMENT" });
    expect(effect).not.toHaveBeenCalled();

    store.dispatch({ type: "ADD_MESSAGE", payload: "hello" });
    expect(effect).toHaveBeenCalledTimes(1);
  });

  it("supports type option", () => {
    const { middleware, startListening } =
      createListenerMiddleware<TestState>();
    const enhancer = applyMiddleware(middleware);
    const store = createStore(testReducer, undefined, enhancer);

    const effect = vi.fn();
    startListening({
      type: "DECREMENT",
      effect,
    });

    store.dispatch({ type: "INCREMENT" });
    expect(effect).not.toHaveBeenCalled();

    store.dispatch({ type: "DECREMENT" });
    expect(effect).toHaveBeenCalledTimes(1);
  });
});

describe("applyMiddleware error paths", () => {
  it("throws if dispatching during middleware construction", () => {
    const constructingMiddleware: Middleware = ({ dispatch }) => {
      // Attempt to dispatch during construction phase
      expect(() => dispatch({ type: "DURING_CONSTRUCTION" } as any)).toThrow(
        "Dispatching while constructing your middleware is not allowed."
      );
      return (next) => (action) => next(action);
    };

    const enhancer = applyMiddleware(constructingMiddleware);
    // Creating the store should execute middleware factory and assert above
    createStore(testReducer, undefined, enhancer);
  });
});

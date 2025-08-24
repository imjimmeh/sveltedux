import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createStore } from "../store.svelte.js";
import { applyMiddleware, thunkMiddleware } from "../middleware.js";
import { createAsyncThunk } from "../async.js";
import { createRetryMiddleware } from "./retryMiddleware.js";

// Test constants
const TEST_CONFIG = {
  MAX_RETRIES: 2,
  RETRY_DELAY: 100,
  THUNK_NAME: "test",
} as const;

const ERROR_MESSAGES = {
  NETWORK: "Network error",
  VALIDATION: "Validation error",
} as const;

// Test helper functions
const createNetworkErrorCondition = () => (error: unknown, action: any) =>
  (error as Error).message === ERROR_MESSAGES.NETWORK;

const createTestStore = <TState>(
  reducer: (state: TState | undefined, action: any) => TState,
  middleware: any[]
) => {
  return createStore<TState>(
    reducer,
    undefined,
    applyMiddleware(...middleware) as any
  );
};

const createBasicStore = (middleware: any[]) => {
  return createStore(
    (state = { value: 0 }) => state,
    applyMiddleware(...middleware)
  );
};

// Helper to create a registry with a single test thunk
const createThunkRegistry = (thunk: any) => {
  const registry = new Map();
  registry.set(TEST_CONFIG.THUNK_NAME, thunk);
  return registry;
};

// Helper to create retry middleware with common config
const createTestRetryMiddleware = (
  thunk: any,
  overrides: Partial<{
    maxRetries: number;
    retryDelay: number;
    retryCondition: (error: unknown, action: any) => boolean;
    enabledThunks: Set<string>;
  }> = {}
) => {
  const thunkRegistry = createThunkRegistry(thunk);
  return createRetryMiddleware(thunkRegistry, {
    maxRetries: TEST_CONFIG.MAX_RETRIES,
    retryDelay: TEST_CONFIG.RETRY_DELAY,
    retryCondition: createNetworkErrorCondition(),
    ...overrides,
  });
};

describe("Retry Middleware", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("createRetryMiddleware", () => {
    it("should not retry successful thunks", async () => {
      // Arrange
      const mockPayloadCreator = vi.fn().mockResolvedValue("success");
      const testThunk = createAsyncThunk(
        TEST_CONFIG.THUNK_NAME,
        mockPayloadCreator
      );
      const retryMiddleware = createTestRetryMiddleware(testThunk);
      const store = createBasicStore([thunkMiddleware, retryMiddleware]);

      // Act
      await store.dispatch(testThunk({}) as any);

      // Assert
      expect(mockPayloadCreator).toHaveBeenCalledTimes(1);
    });

    it("should re-execute original thunks when using registry", async () => {
      // Arrange
      let attemptCount = 0;
      const mockPayloadCreator = vi.fn().mockImplementation(() => {
        attemptCount++;
        if (attemptCount <= 2) {
          throw new Error(ERROR_MESSAGES.NETWORK);
        }
        return "success";
      });

      const testThunk = createAsyncThunk(
        TEST_CONFIG.THUNK_NAME,
        mockPayloadCreator
      );
      const retryMiddleware = createTestRetryMiddleware(testThunk);
      const store = createBasicStore([thunkMiddleware, retryMiddleware]);

      // Act
      try {
        await store.dispatch(testThunk({}) as any);
      } catch (error) {
        // Expected to fail on first attempt
      }

      await vi.runAllTimersAsync();

      // Assert
      const expectedAttempts = 1 + TEST_CONFIG.MAX_RETRIES; // initial + retries
      expect(mockPayloadCreator).toHaveBeenCalledTimes(expectedAttempts);
    });

    it("should not retry when retry condition is not met", async () => {
      // Arrange
      const mockPayloadCreator = vi
        .fn()
        .mockRejectedValue(new Error(ERROR_MESSAGES.VALIDATION));
      const testThunk = createAsyncThunk(
        TEST_CONFIG.THUNK_NAME,
        mockPayloadCreator
      );
      const retryMiddleware = createTestRetryMiddleware(testThunk);
      const store = createBasicStore([thunkMiddleware, retryMiddleware]);

      const dispatchSpy = vi.spyOn(store, "dispatch");

      // Act
      try {
        await store.dispatch(testThunk({}) as any);
      } catch (error) {
        // Expected to fail
      }

      vi.advanceTimersByTime(TEST_CONFIG.RETRY_DELAY);

      // Assert
      // The middleware should only dispatch the original thunk once
      expect(dispatchSpy).toHaveBeenCalledTimes(1);
      expect(mockPayloadCreator).toHaveBeenCalledTimes(1);
    });

    it("should stop retrying after maxRetries", async () => {
      // Arrange
      const mockPayloadCreator = vi
        .fn()
        .mockRejectedValue(new Error(ERROR_MESSAGES.NETWORK));
      const testThunk = createAsyncThunk(
        TEST_CONFIG.THUNK_NAME,
        mockPayloadCreator
      );
      const retryMiddleware = createTestRetryMiddleware(testThunk);
      const store = createBasicStore([thunkMiddleware, retryMiddleware]);

      // Act
      try {
        await store.dispatch(testThunk({}) as any);
      } catch (error) {
        // Expected to fail
      }

      await vi.runAllTimersAsync();

      // Assert
      const expectedAttempts = 1 + TEST_CONFIG.MAX_RETRIES; // initial + max retries
      expect(mockPayloadCreator).toHaveBeenCalledTimes(expectedAttempts);
    });

    it("should respect enabledThunks option", async () => {
      // Arrange
      const mockPayloadCreator = vi
        .fn()
        .mockRejectedValue(new Error(ERROR_MESSAGES.NETWORK));
      const testThunk = createAsyncThunk(
        TEST_CONFIG.THUNK_NAME,
        mockPayloadCreator
      );

      // Create middleware with enabledThunks that doesn't include our test thunk
      const thunkRegistry = createThunkRegistry(testThunk);
      const retryMiddleware = createRetryMiddleware(thunkRegistry, {
        maxRetries: TEST_CONFIG.MAX_RETRIES,
        retryDelay: TEST_CONFIG.RETRY_DELAY,
        retryCondition: createNetworkErrorCondition(),
        enabledThunks: new Set(["other/thunk"]), // Different thunk name
      });

      const store = createBasicStore([thunkMiddleware, retryMiddleware]);

      // Act
      try {
        await store.dispatch(testThunk({}) as any);
      } catch (error) {
        // Expected to fail
      }

      await vi.runAllTimersAsync();

      // Assert
      // Should only be called once since retry is disabled for this thunk
      expect(mockPayloadCreator).toHaveBeenCalledTimes(1);
    });

    it("should retry when enabledThunks includes the thunk", async () => {
      // Arrange
      const mockPayloadCreator = vi
        .fn()
        .mockRejectedValue(new Error(ERROR_MESSAGES.NETWORK));
      const testThunk = createAsyncThunk(
        TEST_CONFIG.THUNK_NAME,
        mockPayloadCreator
      );

      // Create middleware with enabledThunks that includes our test thunk
      const thunkRegistry = createThunkRegistry(testThunk);
      const retryMiddleware = createRetryMiddleware(thunkRegistry, {
        maxRetries: TEST_CONFIG.MAX_RETRIES,
        retryDelay: TEST_CONFIG.RETRY_DELAY,
        retryCondition: createNetworkErrorCondition(),
        enabledThunks: new Set([TEST_CONFIG.THUNK_NAME]),
      });

      const store = createBasicStore([thunkMiddleware, retryMiddleware]);

      // Act
      try {
        await store.dispatch(testThunk({}) as any);
      } catch (error) {
        // Expected to fail
      }

      await vi.runAllTimersAsync();

      // Assert
      const expectedAttempts = 1 + TEST_CONFIG.MAX_RETRIES; // initial + max retries
      expect(mockPayloadCreator).toHaveBeenCalledTimes(expectedAttempts);
    });
  });
});

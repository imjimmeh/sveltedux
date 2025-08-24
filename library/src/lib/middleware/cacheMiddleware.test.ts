import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createCacheMiddleware } from "./cacheMiddleware.js";
import type { Action } from "../types.js";

// Mock the async utilities
vi.mock("../async.js", () => ({
  isPending: vi.fn((action: Action) => action.type.endsWith("/pending")),
  isFulfilled: vi.fn((action: Action) => action.type.endsWith("/fulfilled")),
}));

describe("createCacheMiddleware", () => {
  let mockStore: any;
  let mockNext: any;
  let mockDispatch: any;

  beforeEach(() => {
    vi.useFakeTimers();
    mockDispatch = vi.fn();
    mockNext = vi.fn((action) => action);
    mockStore = { dispatch: mockDispatch };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("with default options", () => {
    it("should pass non-pending actions through without caching", () => {
      const middleware = createCacheMiddleware();
      const action: Action = {
        type: "user/fetchUser/fulfilled",
        payload: { id: 1 },
      };

      const result = middleware(mockStore)(mockNext)(action);

      expect(result).toBe(action);
      expect(mockNext).toHaveBeenCalledWith(action);
    });

    it("should handle pending action with no cache", () => {
      const middleware = createCacheMiddleware();
      const middlewareFn = middleware(mockStore)(mockNext);
      const pendingAction: Action = {
        type: "user/fetchUser/pending",
        meta: { requestId: "req-123" },
      };

      const result = middlewareFn(pendingAction);

      expect(result).toBe(pendingAction);
      expect(mockNext).toHaveBeenCalledWith(pendingAction);
      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it("should cache fulfilled action data", () => {
      const middleware = createCacheMiddleware();
      const middlewareFn = middleware(mockStore)(mockNext);
      const userData = { id: 1, name: "John" };
      const fulfilledAction = {
        type: "user/fetchUser/fulfilled",
        payload: userData,
        meta: { requestId: "req-123" },
      };

      middlewareFn(fulfilledAction);

      expect(mockNext).toHaveBeenCalledWith(fulfilledAction);
    });

    it("should return cached data for subsequent pending actions", () => {
      const middleware = createCacheMiddleware();
      const middlewareFn = middleware(mockStore)(mockNext);
      const userData = { id: 1, name: "John" };

      // First, cache the data with fulfilled action
      const fulfilledAction = {
        type: "user/fetchUser/fulfilled",
        payload: userData,
        meta: { requestId: "req-123" },
      };
      middlewareFn(fulfilledAction);

      // Then, make the same pending request
      const pendingAction = {
        type: "user/fetchUser/pending",
        meta: { requestId: "req-456", arg: {} },
      };
      const result = middlewareFn(pendingAction);

      expect(result).toBe(pendingAction);
      expect(mockDispatch).toHaveBeenCalledWith({
        type: "user/fetchUser/fulfilled",
        payload: userData,
        meta: {
          requestId: "req-456",
          arg: {},
          cached: true,
        },
      });
    });
  });

  describe("with custom options", () => {
    it("should respect custom TTL", () => {
      const customTtl = 1000; // 1 second
      const middleware = createCacheMiddleware({ ttl: customTtl });
      const userData = { id: 1, name: "John" };

      const middlewareFn = middleware(mockStore)(mockNext);

      // Cache data
      const fulfilledAction = {
        type: "user/fetchUser/fulfilled",
        payload: userData,
      };
      middlewareFn(fulfilledAction);

      // Immediately after caching - should use cache
      const pendingAction = {
        type: "user/fetchUser/pending",
        meta: { requestId: "req-123" },
      };
      middlewareFn(pendingAction);
      expect(mockDispatch).toHaveBeenCalledTimes(1);

      mockDispatch.mockClear();

      // Advance time past TTL
      vi.advanceTimersByTime(customTtl + 1);

      // Should not use expired cache
      middlewareFn(pendingAction);
      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it("should respect custom key generator", () => {
      const customKeyGenerator = vi.fn(
        (action: Action) => action.type + "_custom_key"
      );
      const middleware = createCacheMiddleware({
        keyGenerator: customKeyGenerator,
      });

      const middlewareFn = middleware(mockStore)(mockNext);

      const fulfilledAction = {
        type: "user/fetchUser/fulfilled",
        payload: { id: 1 },
      };
      middlewareFn(fulfilledAction);

      expect(customKeyGenerator).toHaveBeenCalledWith(fulfilledAction);

      const pendingAction = {
        type: "user/fetchUser/pending",
      };
      middlewareFn(pendingAction);

      expect(customKeyGenerator).toHaveBeenCalledWith(pendingAction);
    });

    it("should enforce max cache size", () => {
      const middleware = createCacheMiddleware({ maxSize: 2 });

      const middlewareFn = middleware(mockStore)(mockNext);

      // Add first item to cache
      middlewareFn({
        type: "action1/fulfilled",
        payload: "data1",
      });

      // Add second item to cache
      middlewareFn({
        type: "action2/fulfilled",
        payload: "data2",
      });

      // Add third item - should evict first
      middlewareFn({
        type: "action3/fulfilled",
        payload: "data3",
      });

      // First action should no longer be cached
      middlewareFn({
        type: "action1/pending",
      });
      expect(mockDispatch).not.toHaveBeenCalled();

      // Second action should still be cached
      middlewareFn({
        type: "action2/pending",
      });
      expect(mockDispatch).toHaveBeenCalledWith({
        type: "action2/fulfilled",
        payload: "data2",
        meta: { cached: true },
      });
    });
  });

  describe("cache expiration and cleanup", () => {
    it("should clean expired entries on new cache operations", () => {
      const middleware = createCacheMiddleware({ ttl: 1000 });
      const middlewareFn = middleware(mockStore)(mockNext);

      // Cache first item
      middlewareFn({
        type: "action1/fulfilled",
        payload: "data1",
      });

      // Advance time to expire first item
      vi.advanceTimersByTime(1001);

      // Cache second item - should trigger cleanup
      middlewareFn({
        type: "action2/fulfilled",
        payload: "data2",
      });

      // First action should no longer be cached (expired)
      middlewareFn({
        type: "action1/pending",
      });
      expect(mockDispatch).not.toHaveBeenCalled();

      // Second action should be cached (not expired)
      middlewareFn({
        type: "action2/pending",
      });
      expect(mockDispatch).toHaveBeenCalledWith({
        type: "action2/fulfilled",
        payload: "data2",
        meta: { cached: true },
      });
    });

    it("should remove expired cache on access", () => {
      const middleware = createCacheMiddleware({ ttl: 1000 });
      const middlewareFn = middleware(mockStore)(mockNext);

      // Cache data
      middlewareFn({
        type: "user/fetchUser/fulfilled",
        payload: { id: 1 },
      });

      // Advance time past expiration
      vi.advanceTimersByTime(1001);

      // Try to access expired cache
      middlewareFn({
        type: "user/fetchUser/pending",
      });

      // Should not dispatch cached result
      expect(mockDispatch).not.toHaveBeenCalled();
    });
  });

  describe("cached action handling", () => {
    it("should not cache actions that are already cached", () => {
      const middleware = createCacheMiddleware();
      const middlewareFn = middleware(mockStore)(mockNext);

      // Simulate a cached fulfilled action
      const cachedFulfilledAction = {
        type: "user/fetchUser/fulfilled",
        payload: { id: 1 },
        meta: { cached: true },
      };

      // This should not be cached again
      middlewareFn(cachedFulfilledAction);

      // Try to get cached data
      middlewareFn({
        type: "user/fetchUser/pending",
      });

      // Should not find any cached data
      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it("should preserve original action for pending requests", () => {
      const middleware = createCacheMiddleware();
      const middlewareFn = middleware(mockStore)(mockNext);

      // Cache some data
      middlewareFn({
        type: "user/fetchUser/fulfilled",
        payload: { id: 1 },
      });

      const originalPendingAction = {
        type: "user/fetchUser/pending",
        meta: { requestId: "req-123", customField: "test" },
      };

      const result = middlewareFn(originalPendingAction);

      // Should return original action unchanged
      expect(result).toBe(originalPendingAction);

      // Should dispatch cached fulfilled action
      expect(mockDispatch).toHaveBeenCalledWith({
        type: "user/fetchUser/fulfilled",
        payload: { id: 1 },
        meta: {
          requestId: "req-123",
          customField: "test",
          cached: true,
        },
      });
    });
  });

  describe("action type transformation", () => {
    it("should correctly transform pending to fulfilled action type", () => {
      const middleware = createCacheMiddleware();
      const middlewareFn = middleware(mockStore)(mockNext);

      // Cache data
      middlewareFn({
        type: "complex/nested/action/fulfilled",
        payload: "test-data",
      });

      // Request cached data
      middlewareFn({
        type: "complex/nested/action/pending",
      });

      expect(mockDispatch).toHaveBeenCalledWith({
        type: "complex/nested/action/fulfilled",
        payload: "test-data",
        meta: { cached: true },
      });
    });
  });

  describe("edge cases", () => {
    it("should handle actions without meta", () => {
      const middleware = createCacheMiddleware();
      const middlewareFn = middleware(mockStore)(mockNext);

      const actionWithoutMeta = {
        type: "user/fetchUser/fulfilled",
        payload: { id: 1 },
      };

      expect(() => {
        middlewareFn(actionWithoutMeta);
      }).not.toThrow();

      const pendingActionWithoutMeta = {
        type: "user/fetchUser/pending",
      };

      const result = middlewareFn(pendingActionWithoutMeta);

      expect(result).toBe(pendingActionWithoutMeta);
      expect(mockDispatch).toHaveBeenCalledWith({
        type: "user/fetchUser/fulfilled",
        payload: { id: 1 },
        meta: { cached: true },
      });
    });

    it("should handle undefined payload", () => {
      const middleware = createCacheMiddleware();
      const middlewareFn = middleware(mockStore)(mockNext);

      const actionWithUndefinedPayload = {
        type: "user/fetchUser/fulfilled",
        payload: undefined,
      };

      expect(() => {
        middlewareFn(actionWithUndefinedPayload);
      }).not.toThrow();

      middlewareFn({
        type: "user/fetchUser/pending",
      });

      expect(mockDispatch).toHaveBeenCalledWith({
        type: "user/fetchUser/fulfilled",
        payload: undefined,
        meta: { cached: true },
      });
    });

    it("should handle zero TTL", () => {
      const middleware = createCacheMiddleware({ ttl: 0 });
      const middlewareFn = middleware(mockStore)(mockNext);

      // Cache data
      middlewareFn({
        type: "user/fetchUser/fulfilled",
        payload: { id: 1 },
      });

      // Should immediately expire
      middlewareFn({
        type: "user/fetchUser/pending",
      });

      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it("should handle zero max size", () => {
      const middleware = createCacheMiddleware({ maxSize: 0 });
      const middlewareFn = middleware(mockStore)(mockNext);

      // Try to cache data
      middlewareFn({
        type: "user/fetchUser/fulfilled",
        payload: { id: 1 },
      });

      // Should not cache anything
      middlewareFn({
        type: "user/fetchUser/pending",
      });

      expect(mockDispatch).not.toHaveBeenCalled();
    });
  });
});

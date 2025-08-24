import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createBatchingMiddleware } from "./batchingMiddleware.js";
import type { Action } from "../../types.js";

// Mock the async utilities
vi.mock("../async.js", () => ({
  isAsyncThunkAction: vi.fn(
    (action: Action) =>
      action.type.endsWith("/pending") ||
      action.type.endsWith("/fulfilled") ||
      action.type.endsWith("/rejected")
  ),
}));

describe("createBatchingMiddleware", () => {
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
    it("should pass non-async actions through without batching", () => {
      const middleware = createBatchingMiddleware();
      const action: Action = { type: "REGULAR_ACTION" };

      const result = middleware(mockStore)(mockNext)(action);

      expect(result).toBe(action);
      expect(mockNext).toHaveBeenCalledWith(action);
      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it("should batch async actions and flush when batch size is reached", () => {
      const middleware = createBatchingMiddleware({ batchSize: 2 });
      const middlewareFn = middleware(mockStore)(mockNext);
      const action1: Action = { type: "user/fetchUser/pending" };
      const action2: Action = { type: "posts/fetchPosts/pending" };

      // First action should be batched
      const result1 = middlewareFn(action1);
      expect(result1).toBe(action1);
      expect(mockDispatch).not.toHaveBeenCalled();

      // Second action should trigger flush
      const result2 = middlewareFn(action2);
      expect(result2).toBe(action2);
      expect(mockDispatch).toHaveBeenCalledWith({
        type: "@@BATCH",
        payload: [action1, action2],
      });
    });

    it("should flush batched actions after timeout interval", () => {
      const middleware = createBatchingMiddleware({
        batchSize: 10,
        flushInterval: 100,
      });
      const middlewareFn = middleware(mockStore)(mockNext);
      const action: Action = { type: "user/fetchUser/pending" };

      middlewareFn(action);
      expect(mockDispatch).not.toHaveBeenCalled();

      // Advance time to trigger flush
      vi.advanceTimersByTime(100);

      expect(mockDispatch).toHaveBeenCalledWith({
        type: "@@BATCH",
        payload: [action],
      });
    });

    it("should not flush empty batch", () => {
      const middleware = createBatchingMiddleware();

      vi.advanceTimersByTime(200);

      expect(mockDispatch).not.toHaveBeenCalled();
    });
  });

  describe("with custom options", () => {
    it("should respect custom batch size", () => {
      const middleware = createBatchingMiddleware({ batchSize: 3 });
      const middlewareFn = middleware(mockStore)(mockNext);
      const actions = [
        { type: "action1/pending" },
        { type: "action2/pending" },
        { type: "action3/pending" },
      ];

      // Add first two actions
      middlewareFn(actions[0]);
      middlewareFn(actions[1]);
      expect(mockDispatch).not.toHaveBeenCalled();

      // Third action should trigger flush
      middlewareFn(actions[2]);
      expect(mockDispatch).toHaveBeenCalledWith({
        type: "@@BATCH",
        payload: actions,
      });
    });

    it("should respect custom flush interval", () => {
      const middleware = createBatchingMiddleware({
        flushInterval: 200,
      });
      const middlewareFn = middleware(mockStore)(mockNext);
      const action: Action = { type: "user/fetchUser/pending" };

      middlewareFn(action);

      // Should not flush after 100ms
      vi.advanceTimersByTime(100);
      expect(mockDispatch).not.toHaveBeenCalled();

      // Should flush after 200ms
      vi.advanceTimersByTime(100);
      expect(mockDispatch).toHaveBeenCalledWith({
        type: "@@BATCH",
        payload: [action],
      });
    });

    it("should respect custom shouldBatch function", () => {
      const customShouldBatch = vi.fn((action: Action) =>
        action.type.startsWith("CUSTOM_")
      );
      const middleware = createBatchingMiddleware({
        shouldBatch: customShouldBatch,
        batchSize: 1,
      });

      const batchableAction: Action = { type: "CUSTOM_ACTION" };
      const nonBatchableAction: Action = { type: "OTHER_ACTION" };

      const middlewareFn = middleware(mockStore)(mockNext);

      // Should batch custom action
      middlewareFn(batchableAction);
      expect(customShouldBatch).toHaveBeenCalledWith(batchableAction);
      expect(mockDispatch).toHaveBeenCalledWith({
        type: "@@BATCH",
        payload: [batchableAction],
      });

      mockDispatch.mockClear();

      // Should not batch other action
      const result = middlewareFn(nonBatchableAction);
      expect(customShouldBatch).toHaveBeenCalledWith(nonBatchableAction);
      expect(result).toBe(nonBatchableAction);
      expect(mockNext).toHaveBeenCalledWith(nonBatchableAction);
      expect(mockDispatch).not.toHaveBeenCalled();
    });
  });

  describe("timeout management", () => {
    it("should clear timeout when flushing due to batch size", () => {
      const middleware = createBatchingMiddleware({
        batchSize: 2,
        flushInterval: 1000,
      });
      const middlewareFn = middleware(mockStore)(mockNext);
      const actions = [
        { type: "action1/pending" },
        { type: "action2/pending" },
      ];

      middlewareFn(actions[0]);
      middlewareFn(actions[1]); // Should flush immediately

      // Advance time past the interval
      vi.advanceTimersByTime(1000);

      // Should only have been called once (immediate flush)
      expect(mockDispatch).toHaveBeenCalledTimes(1);
    });

    it("should not create multiple timeouts for the same batch", () => {
      const middleware = createBatchingMiddleware({
        batchSize: 10,
        flushInterval: 100,
      });
      const middlewareFn = middleware(mockStore)(mockNext);

      middlewareFn({ type: "action1/pending" });
      middlewareFn({ type: "action2/pending" });
      middlewareFn({ type: "action3/pending" });

      // Advance time to trigger flush
      vi.advanceTimersByTime(100);

      // Should only have been called once
      expect(mockDispatch).toHaveBeenCalledTimes(1);
      expect(mockDispatch).toHaveBeenCalledWith({
        type: "@@BATCH",
        payload: [
          { type: "action1/pending" },
          { type: "action2/pending" },
          { type: "action3/pending" },
        ],
      });
    });

    it("should handle new batches after timeout flush", () => {
      const middleware = createBatchingMiddleware({
        batchSize: 10,
        flushInterval: 100,
      });
      const middlewareFn = middleware(mockStore)(mockNext);

      // First batch
      middlewareFn({ type: "action1/pending" });
      vi.advanceTimersByTime(100);
      expect(mockDispatch).toHaveBeenCalledTimes(1);

      mockDispatch.mockClear();

      // Second batch
      middlewareFn({ type: "action2/pending" });
      vi.advanceTimersByTime(100);
      expect(mockDispatch).toHaveBeenCalledTimes(1);
      expect(mockDispatch).toHaveBeenCalledWith({
        type: "@@BATCH",
        payload: [{ type: "action2/pending" }],
      });
    });
  });

  describe("mixed action handling", () => {
    it("should handle mix of batchable and non-batchable actions", () => {
      const middleware = createBatchingMiddleware({ batchSize: 2 });
      const middlewareFn = middleware(mockStore)(mockNext);

      const asyncAction1: Action = { type: "user/fetchUser/pending" };
      const regularAction: Action = { type: "REGULAR_ACTION" };
      const asyncAction2: Action = { type: "posts/fetchPosts/pending" };

      // Async action - should be batched
      middlewareFn(asyncAction1);
      expect(mockDispatch).not.toHaveBeenCalled();

      // Regular action - should pass through
      const result = middlewareFn(regularAction);
      expect(result).toBe(regularAction);
      expect(mockNext).toHaveBeenCalledWith(regularAction);
      expect(mockDispatch).not.toHaveBeenCalled();

      // Another async action - should complete the batch
      middlewareFn(asyncAction2);
      expect(mockDispatch).toHaveBeenCalledWith({
        type: "@@BATCH",
        payload: [asyncAction1, asyncAction2],
      });
    });
  });

  describe("edge cases", () => {
    it("should handle zero batch size by flushing immediately", () => {
      const middleware = createBatchingMiddleware({ batchSize: 0 });
      const middlewareFn = middleware(mockStore)(mockNext);
      const action: Action = { type: "user/fetchUser/pending" };

      middlewareFn(action);

      expect(mockDispatch).toHaveBeenCalledWith({
        type: "@@BATCH",
        payload: [action],
      });
    });

    it("should handle very small flush interval", () => {
      const middleware = createBatchingMiddleware({
        flushInterval: 1,
      });
      const middlewareFn = middleware(mockStore)(mockNext);
      const action: Action = { type: "user/fetchUser/pending" };

      middlewareFn(action);
      vi.advanceTimersByTime(1);

      expect(mockDispatch).toHaveBeenCalledWith({
        type: "@@BATCH",
        payload: [action],
      });
    });

    it("should maintain action order in batches", () => {
      const middleware = createBatchingMiddleware({ batchSize: 3 });
      const middlewareFn = middleware(mockStore)(mockNext);
      const actions = [
        { type: "action1/pending" },
        { type: "action2/pending" },
        { type: "action3/pending" },
      ];

      actions.forEach((action) => {
        middlewareFn(action);
      });

      expect(mockDispatch).toHaveBeenCalledWith({
        type: "@@BATCH",
        payload: actions,
      });
    });
  });
});

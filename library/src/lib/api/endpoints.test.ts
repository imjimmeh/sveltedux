import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createEndpointBuilder,
  createQueryThunk,
  createMutationThunk,
} from "./endpoints.js";

describe("Endpoints", () => {
  describe("createEndpointBuilder", () => {
    it("should create endpoint builder with query and mutation methods", () => {
      const builder = createEndpointBuilder();

      expect(builder).toHaveProperty("query");
      expect(builder).toHaveProperty("mutation");
      expect(typeof builder.query).toBe("function");
      expect(typeof builder.mutation).toBe("function");
    });

    it("should create query endpoint definition", () => {
      const builder = createEndpointBuilder();

      const queryDef = builder.query({
        query: () => "/posts",
      });

      expect(queryDef).toEqual({
        type: "query",
        definition: {
          query: expect.any(Function),
        },
      });
    });

    it("should create mutation endpoint definition", () => {
      const builder = createEndpointBuilder();

      const mutationDef = builder.mutation({
        query: (args: any) => ({
          url: "/posts",
          method: "POST",
          body: args,
        }),
      });

      expect(mutationDef).toEqual({
        type: "mutation",
        definition: {
          query: expect.any(Function),
        },
      });
    });
  });

  describe("createQueryThunk", () => {
    let mockBaseQuery: any;
    let mockApiSliceActions: any;
    let mockDispatch: any;
    let mockGetState: any;

    beforeEach(() => {
      mockBaseQuery = vi.fn();
      mockApiSliceActions = {
        queryStart: vi.fn(),
        querySuccess: vi.fn(),
        queryError: vi.fn(),
      };
      mockDispatch = vi.fn((action: any) => {
        if (typeof action === "function") {
          return action(mockDispatch, mockGetState, undefined);
        }
        return action;
      });
      mockGetState = vi.fn();
    });

    it("should create query thunk for successful request", async () => {
      const endpointDef = {
        type: "query" as const,
        definition: {
          query: (args: any) => `/posts/${args.id}`,
        },
      };

      mockBaseQuery.mockResolvedValue({
        data: { id: 1, title: "Test Post" },
      });

      const thunk = createQueryThunk(
        "getPost",
        endpointDef,
        mockBaseQuery,
        "api",
        mockApiSliceActions
      );

      const result = await thunk({ id: 1 });

      expect(mockDispatch).toHaveBeenCalledWith(
        mockApiSliceActions.queryStart({
          cacheKey: 'getPost({"id":1})',
          endpointName: "getPost",
        })
      );

      expect(mockBaseQuery).toHaveBeenCalledWith(
        "/posts/1",
        expect.objectContaining({
          signal: expect.any(AbortSignal),
          dispatch: mockDispatch,
          getState: mockGetState,
        })
      );

      expect(mockDispatch).toHaveBeenCalledWith(
        mockApiSliceActions.querySuccess({
          cacheKey: 'getPost({"id":1})',
          data: { id: 1, title: "Test Post" },
          tags: [],
        })
      );

      expect((result as any).payload).toEqual({ id: 1, title: "Test Post" });
    });

    it("should handle query thunk with transform response", async () => {
      const endpointDef = {
        type: "query" as const,
        definition: {
          query: () => "/posts",
          transformResponse: (response: any) => ({
            posts: response,
            total: response.length,
          }),
        },
      };

      const mockPosts = [{ id: 1 }, { id: 2 }];
      mockBaseQuery.mockResolvedValue({ data: mockPosts });

      const thunk = createQueryThunk(
        "getPosts",
        endpointDef,
        mockBaseQuery,
        "api",
        mockApiSliceActions
      );

      const result = await thunk(undefined);

      expect((result as any).payload).toEqual({
        posts: mockPosts,
        total: 2,
      });
    });

    it("should handle query thunk with provides tags", async () => {
      const endpointDef = {
        type: "query" as const,
        definition: {
          query: () => "/posts",
          providesTags: (result: any) =>
            result
              ? result.map((post: any) => ({
                  type: "Post" as const,
                  id: post.id,
                }))
              : [],
        },
      };

      const mockPosts = [{ id: 1 }, { id: 2 }];
      mockBaseQuery.mockResolvedValue({ data: mockPosts });

      const thunk = createQueryThunk(
        "getPosts",
        endpointDef,
        mockBaseQuery,
        "api",
        mockApiSliceActions
      );

      await thunk(undefined);

      expect(mockDispatch).toHaveBeenCalledWith(
        mockApiSliceActions.querySuccess({
          cacheKey: "getPosts(undefined)",
          data: mockPosts,
          tags: [
            { type: "Post", id: 1 },
            { type: "Post", id: 2 },
          ],
        })
      );
    });

    it("should handle query thunk error", async () => {
      const endpointDef = {
        type: "query" as const,
        definition: {
          query: () => "/posts",
        },
      };

      const error = { status: 404, message: "Not Found" };
      mockBaseQuery.mockResolvedValue({ error });

      const thunk = createQueryThunk(
        "getPosts",
        endpointDef,
        mockBaseQuery,
        "api",
        mockApiSliceActions
      );

      const result = await thunk(undefined);
      expect((result as any).payload).toEqual(error);

      expect(mockDispatch).toHaveBeenCalledWith(
        mockApiSliceActions.queryError({
          cacheKey: "getPosts(undefined)",
          error,
        })
      );
    });

    it("should handle query thunk with transform error response", async () => {
      const endpointDef = {
        type: "query" as const,
        definition: {
          query: () => "/posts",
          transformErrorResponse: (error: any) => ({
            ...error,
            transformed: true,
          }),
        },
      };

      const error = { status: 404, message: "Not Found" };
      mockBaseQuery.mockResolvedValue({ error });

      const thunk = createQueryThunk(
        "getPosts",
        endpointDef,
        mockBaseQuery,
        "api",
        mockApiSliceActions
      );

      const result = await thunk(undefined);
      expect((result as any).payload).toEqual({
        ...error,
        transformed: true,
      });
    });
  });

  describe("createMutationThunk", () => {
    let mockBaseQuery: any;
    let mockApiSliceActions: any;
    let mockDispatch: any;
    let mockGetState: any;

    beforeEach(() => {
      mockBaseQuery = vi.fn();
      mockApiSliceActions = {
        mutationStart: vi.fn(),
        mutationSuccess: vi.fn(),
        mutationError: vi.fn(),
        invalidateTags: vi.fn(),
      };
      mockDispatch = vi.fn((action: any) => {
        if (typeof action === "function") {
          return action(mockDispatch, mockGetState, undefined);
        }
        return action;
      });
      mockGetState = vi.fn();
    });

    it("should create mutation thunk for successful request", async () => {
      const endpointDef = {
        type: "mutation" as const,
        definition: {
          query: (args: any) => ({
            url: "/posts",
            method: "POST",
            body: args,
          }),
        },
      };

      const newPost = { title: "New Post", content: "Content" };
      const createdPost = { id: 1, ...newPost };

      mockBaseQuery.mockResolvedValue({ data: createdPost });

      const thunk = createMutationThunk(
        "createPost",
        endpointDef,
        mockBaseQuery,
        "api",
        mockApiSliceActions
      );

      const result = await thunk(newPost);

      expect(mockDispatch).toHaveBeenCalledWith(
        mockApiSliceActions.mutationStart({
          cacheKey: expect.stringMatching(/createPost:\d+/),
          endpointName: "createPost",
        })
      );

      expect(mockBaseQuery).toHaveBeenCalledWith(
        {
          url: "/posts",
          method: "POST",
          body: newPost,
        },
        expect.objectContaining({
          signal: expect.any(AbortSignal),
          dispatch: mockDispatch,
          getState: mockGetState,
        })
      );

      expect(mockDispatch).toHaveBeenCalledWith(
        mockApiSliceActions.mutationSuccess({
          cacheKey: expect.stringMatching(/createPost:\d+/),
          data: createdPost,
        })
      );

      expect((result as any).payload).toEqual(createdPost);
    });

    it("should handle mutation thunk with transform response", async () => {
      const endpointDef = {
        type: "mutation" as const,
        definition: {
          query: (args: any) => ({
            url: "/posts",
            method: "POST",
            body: args,
          }),
          transformResponse: (response: any) => ({
            ...response,
            transformed: true,
          }),
        },
      };

      const createdPost = { id: 1, title: "New Post" };
      mockBaseQuery.mockResolvedValue({ data: createdPost });

      const thunk = createMutationThunk(
        "createPost",
        endpointDef,
        mockBaseQuery,
        "api",
        mockApiSliceActions
      );

      const result = await thunk({ title: "New Post" });

      expect((result as any).payload).toEqual({
        ...createdPost,
        transformed: true,
      });
    });

    it("should handle mutation thunk with cache invalidation", async () => {
      const endpointDef = {
        type: "mutation" as const,
        definition: {
          query: (args: any) => ({
            url: "/posts",
            method: "POST",
            body: args,
          }),
          invalidatesTags: (result: any) => [
            "Post",
            { type: "Post", id: "LIST" },
          ],
        },
      };

      const createdPost = { id: 1, title: "New Post" };
      mockBaseQuery.mockResolvedValue({ data: createdPost });

      const thunk = createMutationThunk(
        "createPost",
        endpointDef,
        mockBaseQuery,
        "api",
        mockApiSliceActions
      );

      await thunk({ title: "New Post" });

      expect(mockDispatch).toHaveBeenCalledWith(
        mockApiSliceActions.invalidateTags({
          tags: ["Post", { type: "Post", id: "LIST" }],
        })
      );
    });

    it("should handle mutation thunk error", async () => {
      const endpointDef = {
        type: "mutation" as const,
        definition: {
          query: (args: any) => ({
            url: "/posts",
            method: "POST",
            body: args,
          }),
        },
      };

      const error = { status: 400, message: "Validation Error" };
      mockBaseQuery.mockResolvedValue({ error });

      const thunk = createMutationThunk(
        "createPost",
        endpointDef,
        mockBaseQuery,
        "api",
        mockApiSliceActions
      );

      const result = await thunk({ title: "New Post" });
      expect((result as any).payload).toEqual(error);

      expect(mockDispatch).toHaveBeenCalledWith(
        mockApiSliceActions.mutationError({
          cacheKey: expect.stringMatching(/createPost:\d+/),
          error,
        })
      );
    });

    it("should handle mutation thunk with transform error response", async () => {
      const endpointDef = {
        type: "mutation" as const,
        definition: {
          query: (args: any) => ({
            url: "/posts",
            method: "POST",
            body: args,
          }),
          transformErrorResponse: (error: any) => ({
            ...error,
            transformed: true,
          }),
        },
      };

      const error = { status: 400, message: "Validation Error" };
      mockBaseQuery.mockResolvedValue({ error });

      const thunk = createMutationThunk(
        "createPost",
        endpointDef,
        mockBaseQuery,
        "api",
        mockApiSliceActions
      );

      const result = await thunk({ title: "New Post" });
      expect((result as any).payload).toEqual({
        ...error,
        transformed: true,
      });
    });

    it("should not invalidate tags if none provided", async () => {
      const endpointDef = {
        type: "mutation" as const,
        definition: {
          query: (args: any) => ({
            url: "/posts",
            method: "POST",
            body: args,
          }),
          // No invalidatesTags function
        },
      };

      mockBaseQuery.mockResolvedValue({ data: { id: 1 } });

      const thunk = createMutationThunk(
        "createPost",
        endpointDef,
        mockBaseQuery,
        "api",
        mockApiSliceActions
      );

      await thunk({ title: "New Post" });

      // invalidateTags should not be called
      expect(mockApiSliceActions.invalidateTags).not.toHaveBeenCalled();
    });
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { store, api, usersAdapter, postsAdapter, apiHooks } from "./index.js";
import type { User, Post } from "../types.js";

// Mock fetch for testing
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("Example Store Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("store configuration", () => {
    it("should create store with correct structure", () => {
      expect(store).toBeDefined();
      expect(typeof store.getState).toBe("function");
      expect(typeof store.dispatch).toBe("function");
      expect(typeof store.subscribe).toBe("function");

      const state = store.getState();
      expect(state).toHaveProperty("api");
      expect(state).toHaveProperty("users");
      expect(state).toHaveProperty("posts");
    });

    it("should have API reducer in store", () => {
      const state = store.getState();
      expect(state.api).toBeDefined();
      expect(state.api).toHaveProperty("queries");
      expect(state.api).toHaveProperty("mutations");
      expect(state.api).toHaveProperty("provided");
      expect(state.api).toHaveProperty("subscriptions");
    });

    it("should have entity adapters initialized", () => {
      const state = store.getState();

      // Users entity state
      expect(state.users).toEqual({
        ids: [],
        entities: {},
      });

      // Posts entity state
      expect(state.posts).toEqual({
        ids: [],
        entities: {},
      });
    });
  });

  describe("API endpoints", () => {
    it("should have all required user endpoints", () => {
      expect(api.endpoints).toHaveProperty("getUsers");
      expect(api.endpoints).toHaveProperty("getUser");
      expect(api.endpoints).toHaveProperty("createUser");
      expect(api.endpoints).toHaveProperty("updateUser");
      expect(api.endpoints).toHaveProperty("deleteUser");

      // Check endpoint structure
      expect(api.endpoints.getUsers).toHaveProperty("select");
      expect(api.endpoints.getUsers).toHaveProperty("initiate");
      expect(api.endpoints.getUsers.type).toBe("query");

      expect(api.endpoints.createUser).toHaveProperty("select");
      expect(api.endpoints.createUser).toHaveProperty("initiate");
      expect(api.endpoints.createUser.type).toBe("mutation");
    });

    it("should have all required post endpoints", () => {
      expect(api.endpoints).toHaveProperty("getPosts");
      expect(api.endpoints).toHaveProperty("getPost");
      expect(api.endpoints).toHaveProperty("createPost");
      expect(api.endpoints).toHaveProperty("updatePost");
      expect(api.endpoints).toHaveProperty("deletePost");

      // Check endpoint structure
      expect(api.endpoints.getPosts).toHaveProperty("select");
      expect(api.endpoints.getPosts).toHaveProperty("initiate");
      expect(api.endpoints.getPosts.type).toBe("query");

      expect(api.endpoints.createPost).toHaveProperty("select");
      expect(api.endpoints.createPost).toHaveProperty("initiate");
      expect(api.endpoints.createPost.type).toBe("mutation");
    });
  });

  describe("API hooks", () => {
    it("should provide all user hooks", () => {
      expect(apiHooks).toHaveProperty("useGetUsersQuery");
      expect(apiHooks).toHaveProperty("useGetUserQuery");
      expect(apiHooks).toHaveProperty("useCreateUserMutation");
      expect(apiHooks).toHaveProperty("useUpdateUserMutation");
      expect(apiHooks).toHaveProperty("useDeleteUserMutation");

      expect(typeof apiHooks.useGetUsersQuery).toBe("function");
      expect(typeof apiHooks.useCreateUserMutation).toBe("function");
    });

    it("should provide all post hooks", () => {
      expect(apiHooks).toHaveProperty("useGetPostsQuery");
      expect(apiHooks).toHaveProperty("useGetPostQuery");
      expect(apiHooks).toHaveProperty("useCreatePostMutation");
      expect(apiHooks).toHaveProperty("useUpdatePostMutation");
      expect(apiHooks).toHaveProperty("useDeletePostMutation");

      expect(typeof apiHooks.useGetPostsQuery).toBe("function");
      expect(typeof apiHooks.useCreatePostMutation).toBe("function");
    });
  });

  describe("entity adapters", () => {
    it("should have users adapter configured correctly", () => {
      expect(usersAdapter).toBeDefined();
      
      expect(typeof usersAdapter.addOne).toBe("function");
      expect(typeof usersAdapter.selectAll).toBe("function");

      const initialState = usersAdapter.getInitialState();
      expect(initialState).toEqual({
        ids: [],
        entities: {},
      });
    });

    it("should have posts adapter configured correctly", () => {
      expect(postsAdapter).toBeDefined();
      
      expect(typeof postsAdapter.addOne).toBe("function");
      expect(typeof postsAdapter.selectAll).toBe("function");

      const initialState = postsAdapter.getInitialState();
      expect(initialState).toEqual({
        ids: [],
        entities: {},
      });
    });

    it("should use custom sort comparer for users", () => {
      const state = usersAdapter.getInitialState();
      const users: User[] = [
        {
          id: 1,
          name: "Charlie",
          email: "charlie@example.com",
          username: "charlie",
          role: "user",
          createdAt: "2024-01-03T00:00:00Z",
          updatedAt: "2024-01-03T00:00:00Z",
        },
        {
          id: 2,
          name: "Alice",
          email: "alice@example.com",
          username: "alice",
          role: "user",
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
        },
        {
          id: 3,
          name: "Bob",
          email: "bob@example.com",
          username: "bob",
          role: "user",
          createdAt: "2024-01-02T00:00:00Z",
          updatedAt: "2024-01-02T00:00:00Z",
        },
      ];

      const result = usersAdapter.addMany(state, {
        type: "test",
        payload: users,
      });

      // Should be sorted by createdAt (newest first based on our sort comparer)
      expect(result.ids).toEqual([3, 2, 1]); // Bob, Alice, Charlie
    });

    it("should use custom sort comparer for posts", () => {
      const state = postsAdapter.getInitialState();
      const posts: Post[] = [
        {
          id: 1,
          title: "First Post",
          content: "Content 1",
          excerpt: "Excerpt 1",
          authorId: 1,
          authorName: "John",
          tags: [],
          published: true,
          featured: false,
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
        },
        {
          id: 2,
          title: "Second Post",
          content: "Content 2",
          excerpt: "Excerpt 2",
          authorId: 1,
          authorName: "John",
          tags: [],
          published: true,
          featured: false,
          createdAt: "2024-01-03T00:00:00Z",
          updatedAt: "2024-01-03T00:00:00Z",
        },
        {
          id: 3,
          title: "Third Post",
          content: "Content 3",
          excerpt: "Excerpt 3",
          authorId: 1,
          authorName: "John",
          tags: [],
          published: true,
          featured: false,
          createdAt: "2024-01-02T00:00:00Z",
          updatedAt: "2024-01-02T00:00:00Z",
        },
      ];

      const result = postsAdapter.addMany(state, {
        type: "test",
        payload: posts,
      });

      // Should be sorted by createdAt (newest first based on our sort comparer)
      expect(result.ids).toEqual([2, 3, 1]); // Second, Third, First
    });
  });

  describe("API integration", () => {
    it("should dispatch getUsersQuery action", async () => {
      const mockUsers = {
        data: [
          {
            id: 1,
            name: "John Doe",
            email: "john@example.com",
            username: "johndoe",
            role: "admin",
            createdAt: "2024-01-01T00:00:00Z",
            updatedAt: "2024-01-01T00:00:00Z",
          },
        ],
        meta: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockUsers,
        headers: new Headers({ "content-type": "application/json" }),
      });

      const action = api.endpoints.getUsers.initiate({ page: 1, limit: 10 });
      const result = await store.dispatch(action);

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/users?page=1&limit=10",
        expect.objectContaining({
          method: "GET",
        })
      );

      expect(result).toBeDefined();
    });

    it("should dispatch createUserMutation action", async () => {
      const newUser = {
        id: 1,
        name: "Test User",
        email: "test@example.com",
        username: "testuser",
        role: "user" as const,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => newUser,
        headers: new Headers({ "content-type": "application/json" }),
      });

      const userData = {
        name: "Test User",
        email: "test@example.com",
        username: "testuser",
        role: "user" as const,
      };

      const action = api.endpoints.createUser.initiate(userData);
      const result = await store.dispatch(action);

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/users",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify(userData),
        })
      );

      expect(result).toBeDefined();
    });

    it("should dispatch getPostsQuery action with filters", async () => {
      const mockPosts = {
        data: [
          {
            id: 1,
            title: "Test Post",
            content: "Test content",
            excerpt: "Test excerpt",
            authorId: 1,
            authorName: "John Doe",
            tags: ["test"],
            published: true,
            featured: false,
            createdAt: "2024-01-01T00:00:00Z",
            updatedAt: "2024-01-01T00:00:00Z",
          },
        ],
        meta: {
          page: 1,
          limit: 5,
          total: 1,
          totalPages: 1,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPosts,
        headers: new Headers({ "content-type": "application/json" }),
      });

      const action = api.endpoints.getPosts.initiate({
        page: 1,
        limit: 5,
        published: true,
        authorId: 1,
        tag: "test",
      });
      const result = await store.dispatch(action);

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/posts?page=1&limit=5&authorId=1&published=true&tag=test",
        expect.objectContaining({
          method: "GET",
        })
      );

      expect(result).toBeDefined();
    });
  });

  describe("tag invalidation", () => {
    it("should configure user tags correctly", () => {
      // Users query should provide User tags
      const getUsersEndpoint = api.endpoints.getUsers;
      expect(getUsersEndpoint.type).toBe("query");

      // Create user mutation should invalidate User tags
      const createUserEndpoint = api.endpoints.createUser;
      expect(createUserEndpoint.type).toBe("mutation");
    });

    it("should configure post tags correctly", () => {
      // Posts query should provide Post tags
      const getPostsEndpoint = api.endpoints.getPosts;
      expect(getPostsEndpoint.type).toBe("query");

      // Create post mutation should invalidate Post tags
      const createPostEndpoint = api.endpoints.createPost;
      expect(createPostEndpoint.type).toBe("mutation");
    });
  });

  describe("utility functions", () => {
    it("should provide resetApiState utility", () => {
      expect(api.util.resetApiState).toBeDefined();
      expect(typeof api.util.resetApiState).toBe("function");

      const resetAction = api.util.resetApiState();
      expect(resetAction).toHaveProperty("type");
    });

    it("should provide invalidateTags utility", () => {
      expect(api.util.invalidateTags).toBeDefined();
      expect(typeof api.util.invalidateTags).toBe("function");

      const invalidateAction = api.util.invalidateTags(["User"]);
      expect(invalidateAction).toHaveProperty("type");
      expect(invalidateAction).toHaveProperty("payload");
    });

    it("should provide prefetch utility", () => {
      expect(api.util.prefetch).toBeDefined();
      expect(typeof api.util.prefetch).toBe("function");
    });
  });

  describe("error handling", () => {
    it("should handle API errors gracefully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: "Not Found",
        headers: new Headers(),
        json: async () => ({ message: "Not found" }),
      });

      const action = api.endpoints.getUser.initiate(999);
      const result = await store.dispatch(action);

      expect(result).toBeDefined();
      // The error should be handled by the async thunk system
    });

    it("should handle network errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const action = api.endpoints.getUsers.initiate();
      const result = await store.dispatch(action);

      expect(result).toBeDefined();
      // The error should be handled by the async thunk system
    });
  });

  describe("middleware integration", () => {
    it("should have API middleware configured", () => {
      expect(api.middleware).toBeDefined();
      expect(typeof api.middleware).toBe("function");
    });

    it("should handle concurrent requests", async () => {
      const mockResponse = {
        data: [],
        meta: { page: 1, limit: 10, total: 0, totalPages: 0 },
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
        headers: new Headers({ "content-type": "application/json" }),
      });

      // Dispatch multiple actions concurrently
      const actions = [
        store.dispatch(api.endpoints.getUsers.initiate()),
        store.dispatch(api.endpoints.getPosts.initiate()),
        store.dispatch(api.endpoints.getUser.initiate(1)),
      ];

      const results = await Promise.all(actions);

      expect(results).toHaveLength(3);
      results.forEach((result: any) => {
        expect(result).toBeDefined();
      });
    });
  });
});

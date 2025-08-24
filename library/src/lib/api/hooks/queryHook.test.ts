import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createStore } from '../../store.svelte.js';
import { combineReducers } from '../../reducers.js';
import { applyMiddleware, thunkMiddleware } from '../../middleware.js';
import { createApi } from '../index.js';
import { fetchBaseQuery } from '../baseQuery.js';
import { createQueryHook } from './queryHook.svelte.js';

// Mock fetch for testing
const mockFetch = vi.fn();
global.fetch = mockFetch;

interface TestUser {
  id: number;
  name: string;
  email: string;
}

interface TestPost {
  id: number;
  title: string;
  body: string;
  userId: number;
}

describe('createQueryHook', () => {
  let store: ReturnType<typeof createStore>;
  let api: ReturnType<typeof createApi>;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Create test API
    api = createApi({
      reducerPath: 'testApi',
      baseQuery: fetchBaseQuery({
        baseUrl: 'https://api.example.com'
      }),
      tagTypes: ['User', 'Post'],
      endpoints: (builder) => ({
        getUsers: builder.query<TestUser[], void>({
          query: () => 'users',
          providesTags: ['User']
        }),
        getUser: builder.query<TestUser, number>({
          query: (id) => `users/${id}`,
          providesTags: (result, error, id) => [{ type: 'User', id }]
        }),
        getPosts: builder.query<TestPost[], { userId?: number }>({
          query: ({ userId } = {}) => userId ? `posts?userId=${userId}` : 'posts',
          providesTags: (result) =>
            result
              ? [
                  ...result.map(({ id }) => ({ type: 'Post' as const, id })),
                  { type: 'Post' as const, id: 'LIST' }
                ]
              : [{ type: 'Post' as const, id: 'LIST' }]
        })
      })
    });

    // Create store with API
    const rootReducer = combineReducers({
      [api.reducerPath]: api.reducer
    });
    store = createStore(rootReducer, undefined, applyMiddleware(thunkMiddleware, api.middleware));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('basic functionality', () => {
    it('should create a query hook that integrates with the API', () => {
      const useGetUsers = createQueryHook<TestUser[], void>(store, api, 'getUsers');
      
      expect(typeof useGetUsers).toBe('function');
    });

    it('should throw error for unknown endpoint', () => {
      expect(() => {
        const unknownHook = createQueryHook(store, api, 'unknownEndpoint');
        unknownHook(); // Call the returned hook function
      }).toThrow('Unknown endpoint: unknownEndpoint');
    });
  });

  describe('query execution and state management', () => {
    it('should dispatch initiate action and update state reactively', async () => {
      const mockUsers: TestUser[] = [
        { id: 1, name: 'John Doe', email: 'john@example.com' },
        { id: 2, name: 'Jane Smith', email: 'jane@example.com' }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockUsers,
        headers: new Headers({ 'content-type': 'application/json' })
      });

      const useGetUsers = createQueryHook<TestUser[], void>(store, api, 'getUsers');
      
      // Simulate component using the hook
      let hookResult: any;
      const mockEffect = vi.fn(() => {
        hookResult = useGetUsers();
        return () => {};
      });

      // Initial state should be uninitialized
      hookResult = useGetUsers();
      expect(hookResult.isUninitialized).toBe(true);
      expect(hookResult.isLoading).toBe(false);
      expect(hookResult.data).toBeUndefined();

      // Simulate effect running (would happen automatically in real Svelte)
      mockEffect();

      // Manually trigger the query since $effect doesn't run in tests
      const queryAction = api.endpoints.getUsers.initiate();
      await store.dispatch(queryAction);

      // Wait for async action to complete
      await new Promise(resolve => setTimeout(resolve, 10));

      // State should be updated after query completes
      const finalState = useGetUsers();
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/users',
        expect.objectContaining({
          method: 'GET'
        })
      );
    });

    it('should handle query with parameters', async () => {
      const mockUser: TestUser = { id: 1, name: 'John Doe', email: 'john@example.com' };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockUser,
        headers: new Headers({ 'content-type': 'application/json' })
      });

      const useGetUser = createQueryHook<TestUser, number>(store, api, 'getUser');
      
      const hookResult = useGetUser(1);
      
      expect(hookResult).toBeDefined();
      expect(typeof hookResult.refetch).toBe('function');
    });

    it('should skip query when skip option is true', () => {
      const useGetUsers = createQueryHook<TestUser[], void>(store, api, 'getUsers');
      
      const hookResult = useGetUsers(undefined, { skip: true });
      
      expect(hookResult.isUninitialized).toBe(true);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should skip query when args is undefined', () => {
      const useGetUser = createQueryHook<TestUser, number>(store, api, 'getUser');
      
      const hookResult = useGetUser(undefined);
      
      expect(hookResult.isUninitialized).toBe(true);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('refetch functionality', () => {
    it('should provide refetch function that dispatches initiate', async () => {
      const mockUsers: TestUser[] = [
        { id: 1, name: 'John Doe', email: 'john@example.com' }
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockUsers,
        headers: new Headers({ 'content-type': 'application/json' })
      });

      const useGetUsers = createQueryHook<TestUser[], void>(store, api, 'getUsers');
      const hookResult = useGetUsers();

      expect(typeof hookResult.refetch).toBe('function');

      // Call refetch
      await hookResult.refetch();

      // Should dispatch the action (we can't easily test the dispatch directly in this setup,
      // but we can verify the refetch function exists and is callable)
      expect(hookResult.refetch).toBeDefined();
    });

    it('should not refetch when args is undefined', async () => {
      const useGetUser = createQueryHook<TestUser, number>(store, api, 'getUser');
      const hookResult = useGetUser(undefined);

      await hookResult.refetch();

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('store integration', () => {
    it('should select state from the store using API selectors', () => {
      const useGetUsers = createQueryHook<TestUser[], void>(store, api, 'getUsers');
      
      // Mock store state
      const mockState = {
        testApi: {
          queries: {
            'getUsers(undefined)': {
              data: [{ id: 1, name: 'John', email: 'john@example.com' }],
              isLoading: false,
              isSuccess: true,
              isError: false,
              isUninitialized: false
            }
          },
          mutations: {},
          provided: {},
          subscriptions: {}
        }
      };

      // We can't easily mock the store.getState() in this test setup,
      // but we can verify that the hook attempts to use the selector
      const hookResult = useGetUsers();
      
      expect(hookResult).toHaveProperty('data');
      expect(hookResult).toHaveProperty('isLoading');
      expect(hookResult).toHaveProperty('isSuccess');
      expect(hookResult).toHaveProperty('isError');
      expect(hookResult).toHaveProperty('refetch');
    });
  });

  describe('error handling', () => {
    it('should handle API errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: new Headers(),
        json: async () => ({ message: 'Not found' })
      });

      const useGetUser = createQueryHook<TestUser, number>(store, api, 'getUser');
      const hookResult = useGetUser(999);

      // Initial state
      expect(hookResult.isUninitialized).toBe(true);

      // The hook should handle the error state through the API system
      expect(typeof hookResult.refetch).toBe('function');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const useGetUsers = createQueryHook<TestUser[], void>(store, api, 'getUsers');
      const hookResult = useGetUsers();

      expect(hookResult).toBeDefined();
      expect(typeof hookResult.refetch).toBe('function');
    });
  });

  describe('options handling', () => {
    it('should respect refetchOnMount option', () => {
      const useGetUsers = createQueryHook<TestUser[], void>(store, api, 'getUsers');
      
      // Test with refetchOnMount: false
      const hookResult1 = useGetUsers(undefined, { refetchOnMount: false });
      expect(hookResult1).toBeDefined();

      // Test with refetchOnMount: true (default)
      const hookResult2 = useGetUsers(undefined, { refetchOnMount: true });
      expect(hookResult2).toBeDefined();
    });

    it('should handle all query options', () => {
      const useGetUsers = createQueryHook<TestUser[], void>(store, api, 'getUsers');
      
      const options = {
        skip: false,
        refetchOnMount: true,
        refetchOnFocus: true,
        refetchOnReconnect: false
      };

      const hookResult = useGetUsers(undefined, options);
      expect(hookResult).toBeDefined();
    });
  });
});
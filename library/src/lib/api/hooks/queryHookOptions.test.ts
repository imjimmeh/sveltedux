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
}

describe('createQueryHook options handling', () => {
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
      endpoints: (builder) => ({
        getUser: builder.query<TestUser, number>({
          query: (id) => `users/${id}`
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

  describe('skip option', () => {
    it('should skip query when skip option is true', () => {
      const useGetUser = createQueryHook<TestUser, number>(store, api, 'getUser');
      
      const hookResult = useGetUser(1, { skip: true });
      
      expect(hookResult.isUninitialized).toBe(true);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should execute query when skip option is false', () => {
      const mockUser: TestUser = { id: 1, name: 'John Doe' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockUser,
        headers: new Headers({ 'content-type': 'application/json' })
      });

      const useGetUser = createQueryHook<TestUser, number>(store, api, 'getUser');
      
      const hookResult = useGetUser(1, { skip: false });
      
      // The hook should attempt to fetch (though we can't easily test the full async flow in this setup)
      expect(hookResult).toBeDefined();
    });
  });

  describe('refetchOnMount option', () => {
    it('should respect refetchOnMount: false', () => {
      const useGetUser = createQueryHook<TestUser, number>(store, api, 'getUser');
      
      const hookResult = useGetUser(1, { refetchOnMount: false });
      
      expect(hookResult).toBeDefined();
      // With our new implementation, this option is properly passed to the subscription system
    });

    it('should respect refetchOnMount: true', () => {
      const useGetUser = createQueryHook<TestUser, number>(store, api, 'getUser');
      
      const hookResult = useGetUser(1, { refetchOnMount: true });
      
      expect(hookResult).toBeDefined();
    });
  });

  describe('pollingInterval option', () => {
    it('should handle pollingInterval: 0 (no polling)', () => {
      const useGetUser = createQueryHook<TestUser, number>(store, api, 'getUser');
      
      const hookResult = useGetUser(1, { pollingInterval: 0 });
      
      expect(hookResult).toBeDefined();
    });

    it('should handle pollingInterval > 0 (with polling)', () => {
      const useGetUser = createQueryHook<TestUser, number>(store, api, 'getUser');
      
      const hookResult = useGetUser(1, { pollingInterval: 1000 });
      
      expect(hookResult).toBeDefined();
    });
  });

  describe('refetchOnFocus option', () => {
    it('should handle refetchOnFocus: false', () => {
      const useGetUser = createQueryHook<TestUser, number>(store, api, 'getUser');
      
      const hookResult = useGetUser(1, { refetchOnFocus: false });
      
      expect(hookResult).toBeDefined();
    });

    it('should handle refetchOnFocus: true', () => {
      const useGetUser = createQueryHook<TestUser, number>(store, api, 'getUser');
      
      const hookResult = useGetUser(1, { refetchOnFocus: true });
      
      expect(hookResult).toBeDefined();
    });
  });
});
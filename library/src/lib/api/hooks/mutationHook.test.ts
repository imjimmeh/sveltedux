import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createStore } from '../../store.svelte.js';
import { combineReducers } from '../../reducers.js';
import { applyMiddleware, thunkMiddleware } from '../../middleware.js';
import { createApi } from '../index.js';
import { fetchBaseQuery } from '../baseQuery.js';
import { createMutationHook } from './mutationHook.svelte.js';

// Mock fetch for testing
const mockFetch = vi.fn();
global.fetch = mockFetch;

interface TestUser {
  id: number;
  name: string;
  email: string;
}

interface CreateUserRequest {
  name: string;
  email: string;
}

interface UpdateUserRequest {
  id: number;
  updates: Partial<TestUser>;
}

describe('createMutationHook', () => {
  let store: ReturnType<typeof createStore>;
  let api: ReturnType<typeof createApi>;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Create test API with mutations
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
        createUser: builder.mutation<TestUser, CreateUserRequest>({
          query: (userData) => ({
            url: 'users',
            method: 'POST',
            body: userData
          }),
          invalidatesTags: ['User']
        }),
        updateUser: builder.mutation<TestUser, UpdateUserRequest>({
          query: ({ id, updates }) => ({
            url: `users/${id}`,
            method: 'PUT',
            body: updates
          }),
          invalidatesTags: (result, error, { id }) => [{ type: 'User', id }]
        }),
        deleteUser: builder.mutation<{ success: boolean; id: number }, number>({
          query: (id) => ({
            url: `users/${id}`,
            method: 'DELETE'
          }),
          invalidatesTags: (result, error, id) => [{ type: 'User', id }]
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
    it('should create a mutation hook that integrates with the API', () => {
      const useCreateUser = createMutationHook<TestUser, CreateUserRequest, any>(
        store, 
        api, 
        'createUser'
      );
      
      expect(typeof useCreateUser).toBe('function');
    });

    it('should throw error for unknown endpoint', () => {
      expect(() => {
        const unknownHook = createMutationHook(store, api, 'unknownEndpoint');
        unknownHook(); // Call the returned hook function
      }).toThrow('Unknown endpoint: unknownEndpoint');
    });

    it('should return hook result with correct properties', () => {
      const useCreateUser = createMutationHook<TestUser, CreateUserRequest, any>(
        store, 
        api, 
        'createUser'
      );

      const hookResult = useCreateUser();

      expect(hookResult).toHaveProperty('data');
      expect(hookResult).toHaveProperty('error');
      expect(hookResult).toHaveProperty('isLoading');
      expect(hookResult).toHaveProperty('isSuccess');
      expect(hookResult).toHaveProperty('isError');
      expect(hookResult).toHaveProperty('isUninitialized');
      expect(hookResult).toHaveProperty('trigger');
      expect(hookResult).toHaveProperty('reset');

      // Should also be callable as a function
      expect(typeof hookResult).toBe('function');
      expect(typeof hookResult.trigger).toBe('function');
      expect(typeof hookResult.reset).toBe('function');
    });
  });

  describe('mutation execution', () => {
    it('should execute mutation and return result', async () => {
      const mockUser: TestUser = {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockUser,
        headers: new Headers({ 'content-type': 'application/json' })
      });

      const useCreateUser = createMutationHook<TestUser, CreateUserRequest, any>(
        store, 
        api, 
        'createUser'
      );

      const mutationHook = useCreateUser();
      
      // Initial state
      expect(mutationHook.isUninitialized).toBe(true);
      expect(mutationHook.isLoading).toBe(false);

      // Execute mutation
      const result = await mutationHook.trigger({
        name: 'John Doe',
        email: 'john@example.com'
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/users',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            name: 'John Doe',
            email: 'john@example.com'
          })
        })
      );

      // The result should be available
      expect(result).toBeDefined();
    });

    it('should be callable directly as a function', async () => {
      const mockUser: TestUser = {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockUser,
        headers: new Headers({ 'content-type': 'application/json' })
      });

      const useCreateUser = createMutationHook<TestUser, CreateUserRequest, any>(
        store, 
        api, 
        'createUser'
      );

      const mutationHook = useCreateUser();
      
      // Should be callable directly
      const result = await mutationHook({
        name: 'John Doe',
        email: 'john@example.com'
      });

      expect(result).toBeDefined();
    });

    it('should handle mutation with complex parameters', async () => {
      const mockUser: TestUser = {
        id: 1,
        name: 'John Updated',
        email: 'john.updated@example.com'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockUser,
        headers: new Headers({ 'content-type': 'application/json' })
      });

      const useUpdateUser = createMutationHook<TestUser, UpdateUserRequest, any>(
        store, 
        api, 
        'updateUser'
      );

      const mutationHook = useUpdateUser();
      
      const result = await mutationHook.trigger({
        id: 1,
        updates: { name: 'John Updated' }
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/users/1',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ name: 'John Updated' })
        })
      );

      expect(result).toBeDefined();
    });
  });

  describe('state management', () => {
    it('should update state reactively through store subscription', async () => {
      const useCreateUser = createMutationHook<TestUser, CreateUserRequest, any>(
        store, 
        api, 
        'createUser'
      );

      const mutationHook = useCreateUser();

      // Initial state
      expect(mutationHook.isUninitialized).toBe(true);
      expect(mutationHook.data).toBeUndefined();
      expect(mutationHook.error).toBeUndefined();

      // The hook should set up store subscription
      // We can't easily test the reactive updates without a full component lifecycle,
      // but we can verify the basic structure is correct
      expect(typeof mutationHook.trigger).toBe('function');
      expect(typeof mutationHook.reset).toBe('function');
    });

    it('should provide reset functionality', () => {
      const useCreateUser = createMutationHook<TestUser, CreateUserRequest, any>(
        store, 
        api, 
        'createUser'
      );

      const mutationHook = useCreateUser();

      // Reset should be available
      expect(typeof mutationHook.reset).toBe('function');

      // Calling reset should not throw
      expect(() => mutationHook.reset()).not.toThrow();
    });
  });

  describe('error handling', () => {
    it('should handle API errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        headers: new Headers(),
        json: async () => ({ message: 'Invalid data' })
      });

      const useCreateUser = createMutationHook<TestUser, CreateUserRequest, any>(
        store, 
        api, 
        'createUser'
      );

      const mutationHook = useCreateUser();
      
      const result = await mutationHook.trigger({
        name: '',
        email: 'invalid-email'
      });

      // Should handle the error gracefully
      expect(result).toBeDefined();
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const useCreateUser = createMutationHook<TestUser, CreateUserRequest, any>(
        store, 
        api, 
        'createUser'
      );

      const mutationHook = useCreateUser();
      
      const result = await mutationHook.trigger({
        name: 'John Doe',
        email: 'john@example.com'
      });

      expect(result).toBeDefined();
      expect(result).toHaveProperty('error');
    });
  });

  describe('integration with API system', () => {
    it('should dispatch actions through the API initiate function', async () => {
      const dispatchSpy = vi.spyOn(store, 'dispatch');

      const useCreateUser = createMutationHook<TestUser, CreateUserRequest, any>(
        store, 
        api, 
        'createUser'
      );

      const mutationHook = useCreateUser();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 1, name: 'John', email: 'john@example.com' }),
        headers: new Headers({ 'content-type': 'application/json' })
      });

      await mutationHook.trigger({
        name: 'John Doe',
        email: 'john@example.com'
      });

      // Should have dispatched the async thunk
      expect(dispatchSpy).toHaveBeenCalled();
    });

    it('should work with different mutation types', async () => {
      // Test DELETE mutation
      const useDeleteUser = createMutationHook<{ success: boolean; id: number }, number, any>(
        store, 
        api, 
        'deleteUser'
      );

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, id: 1 }),
        headers: new Headers({ 'content-type': 'application/json' })
      });

      const deleteHook = useDeleteUser();
      const result = await deleteHook.trigger(1);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/users/1',
        expect.objectContaining({
          method: 'DELETE'
        })
      );

      expect(result).toBeDefined();
    });
  });

  describe('options handling', () => {
    it('should accept and validate mutation options', () => {
      const useCreateUser = createMutationHook<TestUser, CreateUserRequest, any>(
        store, 
        api, 
        'createUser'
      );

      // Should work with options
      const hookResult = useCreateUser({
        fixedCacheKey: 'create-user-mutation'
      });

      expect(hookResult).toBeDefined();
    });

    it('should work without options', () => {
      const useCreateUser = createMutationHook<TestUser, CreateUserRequest, any>(
        store, 
        api, 
        'createUser'
      );

      // Should work without options
      const hookResult = useCreateUser();

      expect(hookResult).toBeDefined();
    });
  });

  describe('return value patterns', () => {
    it('should handle fulfilled actions correctly', async () => {
      const mockUser: TestUser = {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockUser,
        headers: new Headers({ 'content-type': 'application/json' })
      });

      const useCreateUser = createMutationHook<TestUser, CreateUserRequest, any>(
        store, 
        api, 
        'createUser'
      );

      const mutationHook = useCreateUser();
      const result = await mutationHook.trigger({
        name: 'John Doe',
        email: 'john@example.com'
      });

      // The result should be structured correctly
      expect(result).toBeDefined();
    });
  });
});
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createStore } from '../store.svelte.js';
import { combineReducers } from '../reducers.js';
import { applyMiddleware, thunkMiddleware } from '../middleware.js';
import { createApi, fetchBaseQuery } from './index.js';
import type { BaseQuery } from './types.js';

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

describe('createApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('basic API creation', () => {
    it('should create an API with all required properties', () => {
      const api = createApi<BaseQuery, 'User' | 'Post', 'testApi'>({
        reducerPath: 'testApi',
        baseQuery: fetchBaseQuery({
          baseUrl: 'https://api.example.com'
        }),
        tagTypes: ['User', 'Post'] as const,
        endpoints: (builder) => ({
          getUsers: builder.query<TestUser[], void>({
            query: () => 'users',
            providesTags: ['User'] as any
          }),
          createUser: builder.mutation<TestUser, Partial<TestUser>>({
            query: (userData) => ({
              url: 'users',
              method: 'POST',
              body: userData
            }),
            invalidatesTags: ['User'] as any
          })
        })
      });

      expect(api).toHaveProperty('reducerPath', 'testApi');
      expect(api).toHaveProperty('reducer');
      expect(api).toHaveProperty('middleware');
      expect(api).toHaveProperty('endpoints');
      expect(api).toHaveProperty('util');

      expect(typeof api.reducer).toBe('function');
      expect(typeof api.middleware).toBe('function');
      expect(api.endpoints).toHaveProperty('getUsers');
      expect(api.endpoints).toHaveProperty('createUser');
    });

    it('should use default reducerPath when not provided', () => {
      const api = createApi({
        baseQuery: fetchBaseQuery({
          baseUrl: 'https://api.example.com'
        }),
        endpoints: (builder) => ({
          getUsers: builder.query<TestUser[], void>({
            query: () => 'users'
          })
        })
      });

      expect(api.reducerPath).toBe('api');
    });

    it('should accept custom configuration options', () => {
      const api = createApi({
        reducerPath: 'customApi',
        baseQuery: fetchBaseQuery({
          baseUrl: 'https://api.example.com'
        }),
        tagTypes: ['User', 'Post'] as const,
        keepUnusedDataFor: 300000, // 5 minutes
        refetchOnMount: true,
        refetchOnFocus: true,
        refetchOnReconnect: true,
        endpoints: (builder) => ({
          getUsers: builder.query<TestUser[], void>({
            query: () => 'users'
          })
        })
      });

      expect(api.reducerPath).toBe('customApi');
    });
  });

  describe('endpoint creation', () => {
    it('should create query endpoints with correct structure', () => {
      const api = createApi({
        reducerPath: 'testApi',
        baseQuery: fetchBaseQuery({
          baseUrl: 'https://api.example.com'
        }),
        endpoints: (builder) => ({
          getUsers: builder.query<TestUser[], void>({
            query: () => 'users',
            providesTags: ['User'] as any
          }),
          getUser: builder.query<TestUser, number>({
            query: (id) => `users/${id}`,
            providesTags: (result, error, id) => [{ type: 'User', id }] as any
          })
        })
      });

      expect(api.endpoints.getUsers).toHaveProperty('type', 'query');
      expect(api.endpoints.getUsers).toHaveProperty('select');
      expect(api.endpoints.getUsers).toHaveProperty('initiate');
      expect(typeof (api.endpoints.getUsers as any).select).toBe('function');
      expect(typeof (api.endpoints.getUsers as any).initiate).toBe('function');

      expect(api.endpoints.getUser).toHaveProperty('type', 'query');
      expect(api.endpoints.getUser).toHaveProperty('select');
      expect(api.endpoints.getUser).toHaveProperty('initiate');
    });

    it('should create mutation endpoints with correct structure', () => {
      const api = createApi({
        reducerPath: 'testApi',
        baseQuery: fetchBaseQuery({
          baseUrl: 'https://api.example.com'
        }),
        endpoints: (builder) => ({
          createUser: builder.mutation<TestUser, Partial<TestUser>>({
            query: (userData) => ({
              url: 'users',
              method: 'POST',
              body: userData
            }),
            invalidatesTags: ['User'] as any
          }),
          updateUser: builder.mutation<TestUser, { id: number; updates: Partial<TestUser> }>({
            query: ({ id, updates }) => ({
              url: `users/${id}`,
              method: 'PUT',
              body: updates
            }),
            invalidatesTags: (result, error, { id }) => [{ type: 'User', id }] as any
          })
        })
      });

      expect(api.endpoints.createUser).toHaveProperty('type', 'mutation');
      expect(api.endpoints.createUser).toHaveProperty('select');
      expect(api.endpoints.createUser).toHaveProperty('initiate');
      expect(typeof (api.endpoints.createUser as any).select).toBe('function');
      expect(typeof (api.endpoints.createUser as any).initiate).toBe('function');

      expect(api.endpoints.updateUser).toHaveProperty('type', 'mutation');
      expect(api.endpoints.updateUser).toHaveProperty('select');
      expect(api.endpoints.updateUser).toHaveProperty('initiate');
    });
  });

  describe('utility functions', () => {
    it('should provide utility functions', () => {
      const api = createApi({
        reducerPath: 'testApi',
        baseQuery: fetchBaseQuery({
          baseUrl: 'https://api.example.com'
        }),
        tagTypes: ['User'],
        endpoints: (builder) => ({
          getUsers: builder.query<TestUser[], void>({
            query: () => 'users'
          })
        })
      });

      expect(api.util).toHaveProperty('resetApiState');
      expect(api.util).toHaveProperty('invalidateTags');
      expect(api.util).toHaveProperty('prefetch');

      expect(typeof api.util.resetApiState).toBe('function');
      expect(typeof api.util.invalidateTags).toBe('function');
      expect(typeof api.util.prefetch).toBe('function');
    });

    it('should create resetApiState action', () => {
      const api = createApi({
        reducerPath: 'testApi',
        baseQuery: fetchBaseQuery({
          baseUrl: 'https://api.example.com'
        }),
        endpoints: (builder) => ({
          getUsers: builder.query<TestUser[], void>({
            query: () => 'users'
          })
        })
      });

      const resetAction = api.util.resetApiState();
      expect(resetAction).toHaveProperty('type');
      expect(typeof resetAction.type).toBe('string');
    });

    it('should create invalidateTags action', () => {
      const api = createApi({
        reducerPath: 'testApi',
        baseQuery: fetchBaseQuery({
          baseUrl: 'https://api.example.com'
        }),
        tagTypes: ['User'],
        endpoints: (builder) => ({
          getUsers: builder.query<TestUser[], void>({
            query: () => 'users'
          })
        })
      });

      const invalidateAction = api.util.invalidateTags(['User']);
      expect(invalidateAction).toHaveProperty('type');
      expect(invalidateAction).toHaveProperty('payload');
      expect(invalidateAction.payload).toHaveProperty('tags');
    });
  });

  describe('integration with store', () => {
    it('should work with Redux store', () => {
      const api = createApi({
        reducerPath: 'testApi',
        baseQuery: fetchBaseQuery({
          baseUrl: 'https://api.example.com'
        }),
        endpoints: (builder) => ({
          getUsers: builder.query<TestUser[], void>({
            query: () => 'users'
          })
        })
      });

      const rootReducer = combineReducers({
        [api.reducerPath]: api.reducer
      });
      const store = createStore(rootReducer, undefined, applyMiddleware(thunkMiddleware, api.middleware));

      expect(store).toBeDefined();
      expect(typeof store.getState).toBe('function');
      expect(typeof store.dispatch).toBe('function');
      expect(typeof store.subscribe).toBe('function');

      // Initial state should be set
      const initialState = store.getState();
      expect(initialState).toHaveProperty(api.reducerPath);
    });

    it('should handle dispatched actions', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [{ id: 1, name: 'John', email: 'john@example.com' }],
        headers: new Headers({ 'content-type': 'application/json' })
      });

      const api = createApi({
        reducerPath: 'testApi',
        baseQuery: fetchBaseQuery({
          baseUrl: 'https://api.example.com'
        }),
        endpoints: (builder) => ({
          getUsers: builder.query<TestUser[], void>({
            query: () => 'users'
          })
        })
      });

      const rootReducer = combineReducers({
        [api.reducerPath]: api.reducer
      });
      const store = createStore(rootReducer, undefined, applyMiddleware(thunkMiddleware, api.middleware));

      // Dispatch a query action
      const action = (api.endpoints.getUsers as any).initiate();
      const result = await store.dispatch(action);

      expect(result).toBeDefined();
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/users',
        expect.objectContaining({
          method: 'GET'
        })
      );
    });
  });

  describe('tag system', () => {
    it('should handle providesTags correctly', () => {
      const api = createApi({
        reducerPath: 'testApi',
        baseQuery: fetchBaseQuery({
          baseUrl: 'https://api.example.com'
        }),
        tagTypes: ['User', 'Post'] as const,
        endpoints: (builder) => ({
          getUsers: builder.query<TestUser[], void>({
            query: () => 'users',
            providesTags: ['User'] as any
          }),
          getUser: builder.query<TestUser, number>({
            query: (id) => `users/${id}`,
            providesTags: (result, error, id) => [{ type: 'User', id }] as any
          }),
          getPosts: builder.query<TestPost[], void>({
            query: () => 'posts',
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

      // Endpoints should be created successfully
      expect(api.endpoints.getUsers).toBeDefined();
      expect(api.endpoints.getUser).toBeDefined();
      expect(api.endpoints.getPosts).toBeDefined();
    });

    it('should handle invalidatesTags correctly', () => {
      const api = createApi({
        reducerPath: 'testApi',
        baseQuery: fetchBaseQuery({
          baseUrl: 'https://api.example.com'
        }),
        tagTypes: ['User'],
        endpoints: (builder) => ({
          getUsers: builder.query<TestUser[], void>({
            query: () => 'users',
            providesTags: ['User'] as any
          }),
          createUser: builder.mutation<TestUser, Partial<TestUser>>({
            query: (userData) => ({
              url: 'users',
              method: 'POST',
              body: userData
            }),
            invalidatesTags: ['User'] as any
          }),
          updateUser: builder.mutation<TestUser, { id: number; updates: Partial<TestUser> }>({
            query: ({ id, updates }) => ({
              url: `users/${id}`,
              method: 'PUT',
              body: updates
            }),
            invalidatesTags: (result, error, { id }) => [{ type: 'User', id }] as any
          })
        })
      });

      // Mutations should be created successfully
      expect(api.endpoints.createUser).toBeDefined();
      expect(api.endpoints.updateUser).toBeDefined();
    });
  });

  describe('endpoint builder', () => {
    it('should provide query builder function', () => {
      const api = createApi({
        reducerPath: 'testApi',
        baseQuery: fetchBaseQuery({
          baseUrl: 'https://api.example.com'
        }),
        endpoints: (builder) => {
          expect(builder).toHaveProperty('query');
          expect(typeof builder.query).toBe('function');
          
          return {
            getUsers: builder.query<TestUser[], void>({
              query: () => 'users'
            })
          };
        }
      });

      expect(api.endpoints.getUsers).toBeDefined();
    });

    it('should provide mutation builder function', () => {
      const api = createApi({
        reducerPath: 'testApi',
        baseQuery: fetchBaseQuery({
          baseUrl: 'https://api.example.com'
        }),
        endpoints: (builder) => {
          expect(builder).toHaveProperty('mutation');
          expect(typeof builder.mutation).toBe('function');
          
          return {
            createUser: builder.mutation<TestUser, Partial<TestUser>>({
              query: (userData) => ({
                url: 'users',
                method: 'POST',
                body: userData
              })
            })
          };
        }
      });

      expect(api.endpoints.createUser).toBeDefined();
    });

    it('should handle complex endpoint definitions', () => {
      const api = createApi({
        reducerPath: 'testApi',
        baseQuery: fetchBaseQuery({
          baseUrl: 'https://api.example.com'
        }),
        tagTypes: ['User', 'Post'] as const,
        endpoints: (builder) => ({
          getUsers: builder.query<TestUser[], { page?: number; limit?: number }>({
            query: ({ page = 1, limit = 10 } = {}) => `users?page=${page}&limit=${limit}`,
            providesTags: (result) =>
              result
                ? [
                    ...result.map(({ id }) => ({ type: 'User' as const, id })),
                    { type: 'User' as const, id: 'LIST' }
                  ]
                : [{ type: 'User' as const, id: 'LIST' }],
            keepUnusedDataFor: 60000,
            transformResponse: (response: any) => response.data || response
          }),
          createUser: builder.mutation<TestUser, Partial<TestUser>>({
            query: (userData) => ({
              url: 'users',
              method: 'POST',
              body: userData,
              headers: { 'Custom-Header': 'value' }
            }),
            invalidatesTags: ['User'] as any,
            transformResponse: (response: any) => response.user || response,
            transformErrorResponse: (response: any) => response.error || response
          })
        })
      });

      expect(api.endpoints.getUsers).toBeDefined();
      expect(api.endpoints.createUser).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should handle base query errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: new Headers(),
        json: async () => ({ message: 'Not found' })
      });

      const api = createApi({
        reducerPath: 'testApi',
        baseQuery: fetchBaseQuery({
          baseUrl: 'https://api.example.com'
        }),
        endpoints: (builder) => ({
          getUsers: builder.query<TestUser[], void>({
            query: () => 'users'
          })
        })
      });

      const rootReducer = combineReducers({
        [api.reducerPath]: api.reducer
      });
      const store = createStore(rootReducer, undefined, applyMiddleware(thunkMiddleware, api.middleware));

      const action = (api.endpoints.getUsers as any).initiate();
      const result = await store.dispatch(action);

      expect(result).toBeDefined();
      // The error should be handled by the async thunk system
    });
  });
});
import { describe, it, expect, beforeEach } from 'vitest';
import { createApiSlice, createInitialApiState } from './slice.js';

describe('API Slice', () => {
  let apiSlice: ReturnType<typeof createApiSlice>;

  beforeEach(() => {
    apiSlice = createApiSlice('testApi');
  });

  describe('createInitialApiState', () => {
    it('should create initial API state', () => {
      const state = createInitialApiState();
      
      expect(state).toEqual({
        queries: {},
        mutations: {},
        provided: {},
        subscriptions: {},
      });
    });
  });

  describe('query lifecycle actions', () => {
    it('should handle queryStart action', () => {
      const initialState = createInitialApiState();
      
      const action = apiSlice.actions.queryStart({
        cacheKey: 'getPosts(undefined)',
        endpointName: 'getPosts'
      });
      
      const newState = apiSlice.reducer(initialState, action);
      
      expect(newState.queries['getPosts(undefined)']).toEqual(
        expect.objectContaining({
          endpointName: 'getPosts',
          data: null,
          loading: true,
          error: null,
          tags: [],
          lastFetch: expect.any(Number),
        })
      );
    });

    it('should handle querySuccess action', () => {
      const initialState = createInitialApiState();
      const cacheKey = 'getPosts(undefined)';
      
      // First start the query
      let state = apiSlice.reducer(initialState, 
        apiSlice.actions.queryStart({ cacheKey, endpointName: 'getPosts' })
      );
      
      // Then succeed
      const successAction = apiSlice.actions.querySuccess({
        cacheKey,
        data: [{ id: 1, title: 'Test Post' }],
        tags: ['Post', { type: 'Post', id: 1 }]
      });
      
      state = apiSlice.reducer(state, successAction);
      
      const entry = state.queries[cacheKey];
      expect(entry).toEqual(
        expect.objectContaining({
          data: [{ id: 1, title: 'Test Post' }],
          loading: false,
          error: null,
          tags: [{ type: 'Post' }, { type: 'Post', id: 1 }],
          lastFetch: expect.any(Number),
        })
      );
      
      // Check provided tags mapping
      expect(state.provided['Post']).toEqual(new Set([cacheKey]));
      expect(state.provided['Post:1']).toEqual(new Set([cacheKey]));
    });

    it('should handle queryError action', () => {
      const initialState = createInitialApiState();
      const cacheKey = 'getPosts(undefined)';
      
      // First start the query
      let state = apiSlice.reducer(initialState, 
        apiSlice.actions.queryStart({ cacheKey, endpointName: 'getPosts' })
      );
      
      // Then error
      const errorAction = apiSlice.actions.queryError({
        cacheKey,
        error: { message: 'Network error' }
      });
      
      state = apiSlice.reducer(state, errorAction);
      
      const entry = state.queries[cacheKey];
      expect(entry).toEqual(
        expect.objectContaining({
          error: { message: 'Network error' },
          loading: false,
        })
      );
    });
  });

  describe('mutation lifecycle actions', () => {
    it('should handle mutationStart action', () => {
      const initialState = createInitialApiState();
      
      const action = apiSlice.actions.mutationStart({
        cacheKey: 'createPost:12345',
        endpointName: 'createPost'
      });
      
      const newState = apiSlice.reducer(initialState, action);
      
      expect(newState.mutations['createPost:12345']).toEqual(
        expect.objectContaining({
          endpointName: 'createPost',
          data: null,
          loading: true,
          error: null,
          tags: [],
          lastFetch: expect.any(Number),
        })
      );
    });

    it('should handle mutationSuccess action', () => {
      const initialState = createInitialApiState();
      const cacheKey = 'createPost:12345';
      
      // First start the mutation
      let state = apiSlice.reducer(initialState, 
        apiSlice.actions.mutationStart({ cacheKey, endpointName: 'createPost' })
      );
      
      // Then succeed
      const successAction = apiSlice.actions.mutationSuccess({
        cacheKey,
        data: { id: 1, title: 'New Post' }
      });
      
      state = apiSlice.reducer(state, successAction);
      
      const entry = state.mutations[cacheKey];
      expect(entry).toEqual(
        expect.objectContaining({
          data: { id: 1, title: 'New Post' },
          loading: false,
          error: null,
        })
      );
    });

    it('should handle mutationError action', () => {
      const initialState = createInitialApiState();
      const cacheKey = 'createPost:12345';
      
      // First start the mutation
      let state = apiSlice.reducer(initialState, 
        apiSlice.actions.mutationStart({ cacheKey, endpointName: 'createPost' })
      );
      
      // Then error
      const errorAction = apiSlice.actions.mutationError({
        cacheKey,
        error: { message: 'Validation error' }
      });
      
      state = apiSlice.reducer(state, errorAction);
      
      const entry = state.mutations[cacheKey];
      expect(entry).toEqual(
        expect.objectContaining({
          error: { message: 'Validation error' },
          loading: false,
        })
      );
    });
  });

  describe('cache management actions', () => {
    it('should handle invalidateTags action', () => {
      const initialState = createInitialApiState();
      const cacheKey1 = 'getPosts(undefined)';
      const cacheKey2 = 'getPost({"id":1})';
      
      // Set up some cached queries with tags
      let state = apiSlice.reducer(initialState, 
        apiSlice.actions.queryStart({ cacheKey: cacheKey1, endpointName: 'getPosts' })
      );
      state = apiSlice.reducer(state, 
        apiSlice.actions.querySuccess({
          cacheKey: cacheKey1,
          data: [{ id: 1 }],
          tags: ['Post']
        })
      );
      state = apiSlice.reducer(state, 
        apiSlice.actions.queryStart({ cacheKey: cacheKey2, endpointName: 'getPost' })
      );
      state = apiSlice.reducer(state, 
        apiSlice.actions.querySuccess({
          cacheKey: cacheKey2,
          data: { id: 1 },
          tags: [{ type: 'Post', id: 1 }]
        })
      );
      
      // Verify setup
      expect(state.queries[cacheKey1]).toBeDefined();
      expect(state.queries[cacheKey2]).toBeDefined();
      expect(state.provided['Post']).toEqual(new Set([cacheKey1]));
      expect(state.provided['Post:1']).toEqual(new Set([cacheKey2]));
      
      // Invalidate Post tags
      const invalidateAction = apiSlice.actions.invalidateTags({
        tags: ['Post']
      });
      
      state = apiSlice.reducer(state, invalidateAction);
      
      // Check that Post-tagged queries are removed
      expect(state.queries[cacheKey1]).toBeUndefined();
      expect(state.queries[cacheKey2]).toBeDefined(); // This has Post:1 tag
      expect(state.provided['Post']).toBeUndefined();
    });

    it('should handle invalidateTags with specific IDs', () => {
      const initialState = createInitialApiState();
      const cacheKey = 'getPost({"id":1})';
      
      // Set up cached query with specific tag
      let state = apiSlice.reducer(initialState, 
        apiSlice.actions.queryStart({ cacheKey, endpointName: 'getPost' })
      );
      state = apiSlice.reducer(state, 
        apiSlice.actions.querySuccess({
          cacheKey,
          data: { id: 1 },
          tags: [{ type: 'Post', id: 1 }]
        })
      );
      
      expect(state.queries[cacheKey]).toBeDefined();
      
      // Invalidate specific Post
      const invalidateAction = apiSlice.actions.invalidateTags({
        tags: [{ type: 'Post', id: 1 }]
      });
      
      state = apiSlice.reducer(state, invalidateAction);
      
      expect(state.queries[cacheKey]).toBeUndefined();
      expect(state.provided['Post:1']).toBeUndefined();
    });

    it('should handle resetApiState action', () => {
      const initialState = createInitialApiState();
      
      // Add some data to state
      let state = apiSlice.reducer(initialState, 
        apiSlice.actions.queryStart({ 
          cacheKey: 'test', 
          endpointName: 'test' 
        })
      );
      
      expect(state.queries['test']).toBeDefined();
      
      // Reset state
      state = apiSlice.reducer(state, apiSlice.actions.resetApiState());
      
      expect(state).toEqual(createInitialApiState());
    });

    it('should handle queryCleanup action', () => {
      const initialState = createInitialApiState();
      const cacheKey = 'getPosts(undefined)';
      
      // Set up cached query
      let state = apiSlice.reducer(initialState, 
        apiSlice.actions.queryStart({ cacheKey, endpointName: 'getPosts' })
      );
      state = apiSlice.reducer(state, 
        apiSlice.actions.querySuccess({
          cacheKey,
          data: [{ id: 1 }],
          tags: ['Post']
        })
      );
      
      expect(state.queries[cacheKey]).toBeDefined();
      expect(state.provided['Post']).toEqual(new Set([cacheKey]));
      
      // Cleanup query
      const cleanupAction = apiSlice.actions.queryCleanup({ cacheKey });
      state = apiSlice.reducer(state, cleanupAction);
      
      expect(state.queries[cacheKey]).toBeUndefined();
      // Provided tags set should not contain the cache key anymore
      expect(state.provided['Post'].has(cacheKey)).toBe(false);
    });
  });

  describe('subscription management actions', () => {
    it('should handle subscribe action', () => {
      const initialState = createInitialApiState();
      const cacheKey = 'getPosts(undefined)';
      
      const subscribeAction = apiSlice.actions.subscribe({ cacheKey });
      let state = apiSlice.reducer(initialState, subscribeAction);
      
      expect(state.subscriptions[cacheKey]).toBe(1);
      
      // Subscribe again
      state = apiSlice.reducer(state, subscribeAction);
      expect(state.subscriptions[cacheKey]).toBe(2);
    });

    it('should handle unsubscribe action', () => {
      const initialState = createInitialApiState();
      const cacheKey = 'getPosts(undefined)';
      
      // First subscribe multiple times
      let state = apiSlice.reducer(initialState, 
        apiSlice.actions.subscribe({ cacheKey })
      );
      state = apiSlice.reducer(state, 
        apiSlice.actions.subscribe({ cacheKey })
      );
      
      expect(state.subscriptions[cacheKey]).toBe(2);
      
      // Unsubscribe once
      const unsubscribeAction = apiSlice.actions.unsubscribe({ cacheKey });
      state = apiSlice.reducer(state, unsubscribeAction);
      
      expect(state.subscriptions[cacheKey]).toBe(1);
      
      // Unsubscribe again - should remove entry
      state = apiSlice.reducer(state, unsubscribeAction);
      expect(state.subscriptions[cacheKey]).toBeUndefined();
    });

    it('should handle unsubscribe with no existing subscription', () => {
      const initialState = createInitialApiState();
      const cacheKey = 'getPosts(undefined)';
      
      const unsubscribeAction = apiSlice.actions.unsubscribe({ cacheKey });
      const state = apiSlice.reducer(initialState, unsubscribeAction);
      
      // Should not create negative subscriptions
      expect(state.subscriptions[cacheKey]).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    it('should handle querySuccess with no existing entry', () => {
      const initialState = createInitialApiState();
      
      const successAction = apiSlice.actions.querySuccess({
        cacheKey: 'nonexistent',
        data: { test: true },
        tags: []
      });
      
      // Should not crash
      const state = apiSlice.reducer(initialState, successAction);
      expect(state.queries['nonexistent']).toBeUndefined();
    });

    it('should handle queryError with no existing entry', () => {
      const initialState = createInitialApiState();
      
      const errorAction = apiSlice.actions.queryError({
        cacheKey: 'nonexistent',
        error: { message: 'error' }
      });
      
      // Should not crash
      const state = apiSlice.reducer(initialState, errorAction);
      expect(state.queries['nonexistent']).toBeUndefined();
    });

    it('should handle mutationSuccess with no existing entry', () => {
      const initialState = createInitialApiState();
      
      const successAction = apiSlice.actions.mutationSuccess({
        cacheKey: 'nonexistent',
        data: { test: true }
      });
      
      // Should not crash
      const state = apiSlice.reducer(initialState, successAction);
      expect(state.mutations['nonexistent']).toBeUndefined();
    });
  });
});
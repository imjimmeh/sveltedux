import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createEntityAdapter } from './entityAdapter.js';
import { createSlice } from './reducers.js';
import { createStore } from './store.svelte.js';
import { combineReducers } from './reducers.js';
import type { PayloadAction } from './types.js';

interface PostEntity {
  id: number;
  title: string;
  content: string;
  authorId: number;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

describe('Slice + Entity Adapter Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Posts Slice with Entity Adapter', () => {
    // Create entity adapter for posts
    const postsAdapter = createEntityAdapter<PostEntity>({
      sortComparer: (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    });

    // Define the posts state with nested entity adapter state
    interface PostsState {
      entities: ReturnType<typeof postsAdapter.getInitialState>;
      loading: boolean;
      error: string | null;
      lastFetch: number | null;
      filter: {
        published?: boolean;
        authorId?: number;
        tag?: string;
      };
    }

    // Create initial state
    const initialState: PostsState = {
      entities: postsAdapter.getInitialState(),
      loading: false,
      error: null,
      lastFetch: null,
      filter: {},
    };

    // Create posts slice with entity adapter integration
    const postsSlice = createSlice({
      name: 'posts',
      initialState,
      reducers: {
        // Loading states
        setLoading: (state, action: PayloadAction<boolean>) => {
          state.loading = action.payload;
        },
        setError: (state, action: PayloadAction<string | null>) => {
          state.error = action.payload;
        },
        setLastFetch: (state, action: PayloadAction<number>) => {
          state.lastFetch = action.payload;
        },

        // Filter actions
        setFilter: (state, action: PayloadAction<PostsState['filter']>) => {
          state.filter = { ...state.filter, ...action.payload };
        },
        clearFilter: (state) => {
          state.filter = {};
        },

        // Entity adapter actions - using the correct approach from the working example
        addPost: (state, action: PayloadAction<PostEntity>) => {
          const newState = postsAdapter.addOne(state.entities, action);
          state.entities = newState;
        },
        addPosts: (state, action: PayloadAction<PostEntity[]>) => {
          const newState = postsAdapter.addMany(state.entities, action);
          state.entities = newState;
        },
        updatePost: (state, action: PayloadAction<{ id: number; changes: Partial<PostEntity> }>) => {
          const newState = postsAdapter.updateOne(state.entities, action);
          state.entities = newState;
        },
        removePost: (state, action: PayloadAction<number>) => {
          const newState = postsAdapter.removeOne(state.entities, action);
          state.entities = newState;
        },
        setPosts: (state, action: PayloadAction<PostEntity[]>) => {
          const newState = postsAdapter.setMany(state.entities, action);
          state.entities = newState;
        },
        clearPosts: (state) => {
          const newState = postsAdapter.removeAll(state.entities);
          state.entities = newState;
        },

        // Compound actions combining entity operations with state updates
        loadPostsStart: (state) => {
          state.loading = true;
          state.error = null;
        },
        loadPostsSuccess: (state, action: PayloadAction<PostEntity[]>) => {
          state.loading = false;
          state.error = null;
          state.lastFetch = Date.now();
          const newState = postsAdapter.setMany(state.entities, action);
          state.entities = newState;
        },
        loadPostsFailure: (state, action: PayloadAction<string>) => {
          state.loading = false;
          state.error = action.payload;
          state.lastFetch = null;
        },
      },
    });

    const { actions, reducer } = postsSlice;

    // Create store with posts slice
    const store = createStore(
      combineReducers({
        posts: reducer,
      })
    );

    it('should initialize with correct entity adapter state', () => {
      const state = store.getState();
      expect(state.posts.entities.ids).toEqual([]);
      expect(state.posts.entities.entities).toEqual({});
      expect(state.posts.loading).toBe(false);
      expect(state.posts.error).toBeNull();
      expect(state.posts.lastFetch).toBeNull();
      expect(state.posts.filter).toEqual({});
    });

    it('should add posts using entity adapter methods', () => {
      const posts: PostEntity[] = [
        {
          id: 1,
          title: 'Post 1',
          content: 'Content 1',
          authorId: 1,
          published: true,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
        {
          id: 2,
          title: 'Post 2',
          content: 'Content 2',
          authorId: 2,
          published: false,
          createdAt: '2024-01-02T00:00:00Z',
          updatedAt: '2024-01-02T00:00:00Z',
        },
      ];

      // Dispatch action to add posts
      store.dispatch(actions.addPosts(posts));

      // Check state
      const state = store.getState();
      expect(state.posts.entities.ids).toEqual([2, 1]); // Sorted by createdAt (newest first)
      expect(state.posts.entities.entities).toEqual({
        1: posts[0],
        2: posts[1],
      });
    });

    it('should update posts using entity adapter methods', () => {
      const posts: PostEntity[] = [
        {
          id: 1,
          title: 'Post 1',
          content: 'Content 1',
          authorId: 1,
          published: true,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ];

      // Add posts first
      store.dispatch(actions.addPosts(posts));

      // Update a post
      store.dispatch(actions.updatePost({
        id: 1,
        changes: { title: 'Updated Post 1', published: false }
      }));

      // Check state
      const state = store.getState();
      expect(state.posts.entities.entities[1]?.title).toBe('Updated Post 1');
      expect(state.posts.entities.entities[1]?.published).toBe(false);
    });

    it('should remove posts using entity adapter methods', () => {
      const posts: PostEntity[] = [
        {
          id: 1,
          title: 'Post 1',
          content: 'Content 1',
          authorId: 1,
          published: true,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
        {
          id: 2,
          title: 'Post 2',
          content: 'Content 2',
          authorId: 2,
          published: false,
          createdAt: '2024-01-02T00:00:00Z',
          updatedAt: '2024-01-02T00:00:00Z',
        },
      ];

      // Add posts first
      store.dispatch(actions.addPosts(posts));

      // Remove one post
      store.dispatch(actions.removePost(1));

      // Check state
      const state = store.getState();
      expect(state.posts.entities.ids).toEqual([2]);
      expect(state.posts.entities.entities).toEqual({
        2: posts[1],
      });
    });

    it('should handle compound actions that combine entity operations with state updates', () => {
      const posts: PostEntity[] = [
        {
          id: 1,
          title: 'Post 1',
          content: 'Content 1',
          authorId: 1,
          published: true,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
        {
          id: 2,
          title: 'Post 2',
          content: 'Content 2',
          authorId: 2,
          published: false,
          createdAt: '2024-01-02T00:00:00Z',
          updatedAt: '2024-01-02T00:00:00Z',
        },
      ];

      // Start loading
      store.dispatch(actions.loadPostsStart());
      let state = store.getState();
      expect(state.posts.loading).toBe(true);
      expect(state.posts.error).toBeNull();

      // Complete loading successfully
      store.dispatch(actions.loadPostsSuccess(posts));
      state = store.getState();
      expect(state.posts.loading).toBe(false);
      expect(state.posts.error).toBeNull();
      expect(state.posts.lastFetch).toBeDefined();
      // The posts should be sorted by createdAt (newest first)
      expect(state.posts.entities.ids).toEqual([2, 1]);
      expect(state.posts.entities.entities).toEqual({
        1: posts[0],
        2: posts[1],
      });
    });

    it('should handle loading failures', () => {
      // Start loading
      store.dispatch(actions.loadPostsStart());
      let state = store.getState();
      expect(state.posts.loading).toBe(true);
      expect(state.posts.error).toBeNull();

      // Fail loading
      store.dispatch(actions.loadPostsFailure('Network error'));
      state = store.getState();
      expect(state.posts.loading).toBe(false);
      expect(state.posts.error).toBe('Network error');
      expect(state.posts.lastFetch).toBeNull();
    });

    it('should maintain other slice state when using entity adapter methods', () => {
      const posts: PostEntity[] = [
        {
          id: 1,
          title: 'Post 1',
          content: 'Content 1',
          authorId: 1,
          published: true,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
        {
          id: 2,
          title: 'Post 2',
          content: 'Content 2',
          authorId: 2,
          published: false,
          createdAt: '2024-01-02T00:00:00Z',
          updatedAt: '2024-01-02T00:00:00Z',
        },
      ];

      // Set loading to true
      store.dispatch(actions.setLoading(true));
      
      // Add posts (should not affect loading state)
      store.dispatch(actions.addPosts(posts));

      // Check state
      const state = store.getState();
      expect(state.posts.loading).toBe(true); // Should still be true
      // The posts should be sorted by createdAt (newest first)
      expect(state.posts.entities.ids).toEqual([2, 1]);
      expect(state.posts.entities.entities).toEqual({
        1: posts[0],
        2: posts[1],
      });
    });

    it('should handle filter state management', () => {
      // Set filter
      store.dispatch(actions.setFilter({
        published: true,
        authorId: 1,
      }));

      let state = store.getState();
      expect(state.posts.filter).toEqual({
        published: true,
        authorId: 1,
      });

      // Update filter
      store.dispatch(actions.setFilter({
        tag: 'tech',
      }));

      state = store.getState();
      expect(state.posts.filter).toEqual({
        published: true,
        authorId: 1,
        tag: 'tech',
      });

      // Clear filter
      store.dispatch(actions.clearFilter());
      state = store.getState();
      expect(state.posts.filter).toEqual({});
    });
  });

  describe('Complex Entity Adapter Operations', () => {
    // Create entity adapter for posts
    const postsAdapter = createEntityAdapter<PostEntity>({
      sortComparer: (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    });

    interface PostsState {
      entities: ReturnType<typeof postsAdapter.getInitialState>;
      loading: boolean;
      error: string | null;
    }

    const initialState: PostsState = {
      entities: postsAdapter.getInitialState(),
      loading: false,
      error: null,
    };

    const postsSlice = createSlice({
      name: 'posts',
      initialState,
      reducers: {
        setLoading: (state, action: PayloadAction<boolean>) => {
          state.loading = action.payload;
        },
        setError: (state, action: PayloadAction<string | null>) => {
          state.error = action.payload;
        },
        addPost: (state, action: PayloadAction<PostEntity>) => {
          const newState = postsAdapter.addOne(state.entities, action);
          state.entities = newState;
        },
        addPosts: (state, action: PayloadAction<PostEntity[]>) => {
          const newState = postsAdapter.addMany(state.entities, action);
          state.entities = newState;
        },
        updatePost: (state, action: PayloadAction<{ id: number; changes: Partial<PostEntity> }>) => {
          const newState = postsAdapter.updateOne(state.entities, action);
          state.entities = newState;
        },
        removePost: (state, action: PayloadAction<number>) => {
          const newState = postsAdapter.removeOne(state.entities, action);
          state.entities = newState;
        },
        setPosts: (state, action: PayloadAction<PostEntity[]>) => {
          const newState = postsAdapter.setMany(state.entities, action);
          state.entities = newState;
        },
        clearPosts: (state) => {
          const newState = postsAdapter.removeAll(state.entities);
          state.entities = newState;
        },
      },
    });

    const { actions, reducer } = postsSlice;
    const store = createStore(
      combineReducers({
        posts: reducer,
      })
    );

    it('should handle upsert operations correctly', () => {
      const post: PostEntity = {
        id: 1,
        title: 'Post 1',
        content: 'Content 1',
        authorId: 1,
        published: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      // Upsert new post (should add)
      store.dispatch(actions.addPost(post));

      let state = store.getState();
      expect(state.posts.entities.ids).toEqual([1]);
      expect(state.posts.entities.entities[1]).toEqual(post);
    });

    it('should handle batch remove operations', () => {
      const posts: PostEntity[] = [
        {
          id: 1,
          title: 'Post 1',
          content: 'Content 1',
          authorId: 1,
          published: true,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
        {
          id: 2,
          title: 'Post 2',
          content: 'Content 2',
          authorId: 2,
          published: false,
          createdAt: '2024-01-02T00:00:00Z',
          updatedAt: '2024-01-02T00:00:00Z',
        },
        {
          id: 3,
          title: 'Post 3',
          content: 'Content 3',
          authorId: 1,
          published: true,
          createdAt: '2024-01-03T00:00:00Z',
          updatedAt: '2024-01-03T00:00:00Z',
        },
      ];

      // Add posts
      store.dispatch(actions.addPosts(posts));

      // Remove posts by IDs
      store.dispatch(actions.removePost(1));
      store.dispatch(actions.removePost(3));

      const state = store.getState();
      expect(state.posts.entities.ids).toEqual([2]);
      expect(state.posts.entities.entities).toEqual({
        2: posts[1],
      });
    });

    it('should clear all posts', () => {
      const posts: PostEntity[] = [
        {
          id: 1,
          title: 'Post 1',
          content: 'Content 1',
          authorId: 1,
          published: true,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
        {
          id: 2,
          title: 'Post 2',
          content: 'Content 2',
          authorId: 2,
          published: false,
          createdAt: '2024-01-02T00:00:00Z',
          updatedAt: '2024-01-02T00:00:00Z',
        },
      ];

      // Add posts
      store.dispatch(actions.addPosts(posts));

      // Clear all posts
      store.dispatch(actions.clearPosts());

      const state = store.getState();
      expect(state.posts.entities.ids).toEqual([]);
      expect(state.posts.entities.entities).toEqual({});
    });
  });
});
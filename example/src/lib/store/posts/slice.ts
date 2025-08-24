import {
  createEntityAdapter,
  createSlice,
  type PayloadAction,
} from "sveltedux";
import type { Post } from "../../types.js";
import { api } from "../../api/index.js";

export const postsAdapter = createEntityAdapter<Post>({
  sortComparer: (a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
});

export interface PostsState
  extends ReturnType<typeof postsAdapter.getInitialState> {
  loading: boolean;
  error: string | null;
  lastFetch: number | null;
  filter: {
    published?: boolean;
    authorId?: number;
    tag?: string;
  };
}

const initialState: PostsState = {
  ...postsAdapter.getInitialState(),
  loading: false,
  error: null,
  lastFetch: null,
  filter: {},
};

const postsSlice = createSlice({
  name: "posts",
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
    setFilter: (state, action: PayloadAction<PostsState["filter"]>) => {
      state.filter = { ...state.filter, ...action.payload };
    },
    clearFilter: (state) => {
      state.filter = {};
    },

    // Entity adapter actions (with proper typing for extended state)
    addPost: (state, action: PayloadAction<Post>) => {
      postsAdapter.addOne(state as any, action);
    },
    addPosts: (state, action: PayloadAction<Post[]>) => {
      postsAdapter.addMany(state as any, action);
    },
    updatePost: (state, action: PayloadAction<{ id: number; changes: Partial<Post> }>) => {
      postsAdapter.updateOne(state as any, action);
    },
    updatePosts: (state, action: PayloadAction<{ id: number; changes: Partial<Post> }[]>) => {
      postsAdapter.updateMany(state as any, action);
    },
    removePost: (state, action: PayloadAction<number>) => {
      postsAdapter.removeOne(state as any, action);
    },
    removePosts: (state, action: PayloadAction<number[]>) => {
      postsAdapter.removeMany(state as any, action);
    },
    setPosts: (state, action: PayloadAction<Post[]>) => {
      // Use fixed entity adapter setMany method
      postsAdapter.setMany(state as any, action);
    },
    upsertPost: (state, action: PayloadAction<Post>) => {
      postsAdapter.upsertOne(state as any, action);
    },
    upsertPosts: (state, action: PayloadAction<Post[]>) => {
      postsAdapter.upsertMany(state as any, action);
    },
    clearPosts: (state, action?: PayloadAction<void>) => {
      postsAdapter.removeAll(state as any, action);
    },

    // Compound actions combining entity operations with state updates
    loadPostsStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    loadPostsSuccess: (state, action: PayloadAction<Post[]>) => {
      state.loading = false;
      state.error = null;
      state.lastFetch = Date.now();
      postsAdapter.setMany(state as any, action);
    },
    loadPostsFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },

    // Optimistic updates
    createPostOptimistic: (
      state,
      action: PayloadAction<Omit<Post, "id"> & { tempId: number }>
    ) => {
      const { tempId, ...postData } = action.payload;
      const optimisticPost: Post = {
        ...postData,
        id: tempId, // Use temp ID for optimistic update
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      postsAdapter.addOne(state as any, { type: "addPost", payload: optimisticPost });
    },
    confirmPostCreation: (
      state,
      action: PayloadAction<{ tempId: number; realPost: Post }>
    ) => {
      const { tempId, realPost } = action.payload;
      // Remove the optimistic post and add the real one
      postsAdapter.removeOne(state as any, { type: "removePost", payload: tempId });
      postsAdapter.addOne(state as any, { type: "addPost", payload: realPost });
    },
    revertPostCreation: (state, action: PayloadAction<number>) => {
      postsAdapter.removeOne(state as any, {
        type: "removePost",
        payload: action.payload,
      });
    },
  },
  // Note: API integration handled directly in component for simplicity
});

export const {
  // Loading states
  setLoading,
  setError,
  setLastFetch,

  // Filter actions
  setFilter,
  clearFilter,

  // Entity adapter actions
  addPost,
  addPosts,
  updatePost,
  updatePosts,
  removePost,
  removePosts,
  setPosts,
  upsertPost,
  upsertPosts,
  clearPosts,

  // Compound actions
  loadPostsStart,
  loadPostsSuccess,
  loadPostsFailure,

  // Optimistic updates
  createPostOptimistic,
  confirmPostCreation,
  revertPostCreation,
} = postsSlice.actions;

export default postsSlice.reducer;

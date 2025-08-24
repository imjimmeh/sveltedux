import { createAsyncThunk } from "sveltedux";
import type { Post } from "../../types.js";
import {
  loadPostsStart,
  loadPostsSuccess,
  loadPostsFailure,
  confirmPostCreation,
  revertPostCreation,
} from "./slice.js";

// Thunk to fetch posts from API and sync with entity adapter
export const fetchPostsToStore = createAsyncThunk<
  Post[],
  {
    page?: number;
    limit?: number;
    authorId?: number;
    published?: boolean;
    tag?: string;
  }
>("posts/fetchPostsToStore", async (params, { dispatch }) => {
  dispatch(loadPostsStart());

  try {
    const searchParams = new URLSearchParams();

    if (params.page) searchParams.set("page", params.page.toString());
    if (params.limit) searchParams.set("limit", params.limit.toString());
    if (params.authorId)
      searchParams.set("authorId", params.authorId.toString());
    if (params.published !== undefined)
      searchParams.set("published", params.published.toString());
    if (params.tag) searchParams.set("tag", params.tag);

    const response = await fetch(`/api/posts?${searchParams}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch posts: ${response.statusText}`);
    }

    const data = await response.json();
    dispatch(loadPostsSuccess(data.data));

    return data.data;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    dispatch(loadPostsFailure(errorMessage));
    throw error;
  }
});

// Thunk for optimistic post creation with entity adapter
export const createPostWithOptimisticUpdate = createAsyncThunk<
  Post,
  Omit<Post, "id" | "createdAt" | "updatedAt">
>("posts/createPostWithOptimisticUpdate", async (postData, { dispatch }) => {
  const tempId = Date.now(); // Simple temp ID generation

  // Create optimistic update
  dispatch({
    type: "posts/createPostOptimistic",
    payload: { ...postData, tempId },
  });

  try {
    const response = await fetch("/api/posts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(postData),
    });

    if (!response.ok) {
      throw new Error(`Failed to create post: ${response.statusText}`);
    }

    const realPost: Post = await response.json();

    // Confirm creation with real data
    dispatch(confirmPostCreation({ tempId, realPost }));

    return realPost;
  } catch (error) {
    // Revert optimistic update on failure
    dispatch(revertPostCreation(tempId));
    throw error;
  }
});

// Thunk to delete a post
export const deletePostFromStore = createAsyncThunk<number, number>(
  "posts/deletePostFromStore",
  async (postId) => {
    const response = await fetch(`/api/posts/${postId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      throw new Error(`Failed to delete post: ${response.statusText}`);
    }

    return postId;
  }
);

// Thunk to update a post
export const updatePostInStore = createAsyncThunk<
  Post,
  { id: number; updates: Partial<Post> }
>("posts/updatePostInStore", async ({ id, updates }) => {
  const response = await fetch(`/api/posts/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    throw new Error(`Failed to update post: ${response.statusText}`);
  }

  const updatedPost: Post = await response.json();
  return updatedPost;
});

// Utility thunk to refresh posts if they're stale
export const refreshPostsIfStale = createAsyncThunk<void, void>(
  "posts/refreshPostsIfStale",
  async (_, { getState, dispatch }) => {
    const state = getState() as any;
    const lastFetch = state.posts.lastFetch;

    if (!lastFetch) {
      // No data yet, fetch all
      dispatch(fetchPostsToStore({}));
      return;
    }

    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    if (lastFetch < fiveMinutesAgo) {
      // Data is stale, refresh
      dispatch(fetchPostsToStore({}));
    }
  }
);

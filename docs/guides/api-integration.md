# API Integration Guide

This guide walks through using the Redux-Esque API system to build a full-featured application with data fetching, caching, and cache invalidation.

## Setting Up the API Service

First, let's create an API service for a blog application:

```typescript
// src/lib/services/blogApi.ts
import { createApi, fetchBaseQuery } from "sveltekitlibrary/redux";

// Define our data types
export interface User {
  id: number;
  name: string;
  email: string;
}

export interface Post {
  id: number;
  title: string;
  body: string;
  userId: number;
  createdAt: string;
}

export interface Comment {
  id: number;
  postId: number;
  name: string;
  email: string;
  body: string;
}

// Create the API service
export const blogApi = createApi({
  reducerPath: "blogApi",
  baseQuery: fetchBaseQuery({ baseUrl: "https://jsonplaceholder.typicode.com" }),
  tagTypes: ["Post", "User", "Comment"],
  endpoints: (build) => ({
    // Queries
    getPosts: build.query<Post[], void>({
      query: () => "/posts",
      providesTags: (result) =>
        result
          ? [...result.map(({ id }) => ({ type: "Post" as const, id })), "Post"]
          : ["Post"],
    }),
    getPost: build.query<Post, number>({
      query: (id) => `/posts/${id}`,
      providesTags: (result, error, id) => [{ type: "Post", id }],
    }),
    getUser: build.query<User, number>({
      query: (id) => `/users/${id}`,
      providesTags: (result, error, id) => [{ type: "User", id }],
    }),
    getCommentsByPost: build.query<Comment[], number>({
      query: (postId) => `/posts/${postId}/comments`,
      providesTags: (result, error, postId) => [
        { type: "Comment", id: `POST_${postId}` },
      ],
    }),

    // Mutations
    addPost: build.mutation<Post, Partial<Post>>({
      query: (body) => ({
        url: "/posts",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Post"],
    }),
    updatePost: build.mutation<Post, Partial<Post> & Pick<Post, "id">>({
      query: ({ id, ...patch }) => ({
        url: `/posts/${id}`,
        method: "PUT",
        body: patch,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: "Post", id }],
    }),
    deletePost: build.mutation<{ success: boolean }, number>({
      query: (id) => ({
        url: `/posts/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, id) => [{ type: "Post", id }],
    }),
    addComment: build.mutation<Comment, Partial<Comment>>({
      query: (body) => ({
        url: "/comments",
        method: "POST",
        body,
      }),
      invalidatesTags: (result, error, arg) => [
        { type: "Comment", id: `POST_${arg.postId}` },
      ],
    }),
  }),
});

// Export the auto-generated hooks
export const {
  useGetPostsQuery,
  useGetPostQuery,
  useGetUserQuery,
  useGetCommentsByPostQuery,
  useAddPostMutation,
  useUpdatePostMutation,
  useDeletePostMutation,
  useAddCommentMutation,
} = blogApi;
```

## Integrating with the Store

Next, we need to integrate our API service with our Redux store:

```typescript
// src/lib/store.ts
import { createSvelteStore, combineReducers, applyMiddleware } from "sveltekitlibrary/redux";
import { thunkMiddleware } from "sveltekitlibrary/redux";
import { blogApi } from "./services/blogApi";

// Combine reducers
const rootReducer = combineReducers({
  [blogApi.reducerPath]: blogApi.reducer,
  // ... other reducers
});

// Create the store with API middleware
export const store = createSvelteStore(
  rootReducer,
  undefined,
  applyMiddleware(thunkMiddleware, blogApi.middleware)
);
```

## Using Queries in Components

Let's create a component that fetches and displays a list of posts:

```svelte
<!-- src/routes/posts/+page.svelte -->
<script lang="ts">
  import { store } from "$lib/store";
  import { useGetPostsQuery } from "$lib/services/blogApi";

  // Use the query hook
  const { data: posts, error, isLoading, isFetching, refetch } = useGetPostsQuery(
    undefined,
    { refetchOnMount: true }
  );
</script>

<div class="posts-page">
  <header>
    <h1>Blog Posts</h1>
    <button on:click={refetch} disabled={isFetching}>
      {isFetching ? "Refreshing..." : "Refresh"}
    </button>
  </header>

  {#if isLoading}
    <div class="loading">Loading posts...</div>
  {:else if error}
    <div class="error">
      Error loading posts: {error.status} - {error.message}
      <button on:click={refetch}>Retry</button>
    </div>
  {:else if posts}
    <div class="posts-list">
      {#each posts.slice(0, 10) as post (post.id)}
        <article class="post-item">
          <h2><a href="/posts/{post.id}">{post.title}</a></h2>
          <p>{post.body.substring(0, 100)}...</p>
        </article>
      {/each}
    </div>
  {/if}
</div>

<style>
  .posts-page {
    max-width: 800px;
    margin: 0 auto;
    padding: 1rem;
  }

  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
  }

  .loading, .error {
    text-align: center;
    padding: 2rem;
  }

  .posts-list {
    display: grid;
    gap: 1.5rem;
  }

  .post-item {
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    padding: 1.5rem;
    background: white;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }

  .post-item h2 {
    margin-top: 0;
  }

  .post-item a {
    text-decoration: none;
    color: #333;
  }

  .post-item a:hover {
    color: #007acc;
  }
</style>
```

## Using Mutations in Components

Let's create a form component for adding new posts:

```svelte
<!-- src/routes/posts/new/+page.svelte -->
<script lang="ts">
  import { store } from "$lib/store";
  import { useAddPostMutation } from "$lib/services/blogApi";
  import { goto } from "$app/navigation";

  let title = "";
  let body = "";
  let userId = 1; // In a real app, this would come from auth

  // Use the mutation hook
  const [addPost, { data, error, isLoading, isSuccess }] = useAddPostMutation();

  async function handleSubmit() {
    if (!title || !body) return;
    
    try {
      const result = await addPost({ title, body, userId });
      if ("data" in result) {
        // Successfully added, redirect to the new post
        goto(`/posts/${result.data.id}`);
      }
    } catch (err) {
      console.error("Failed to add post:", err);
    }
  }
</script>

<div class="new-post-page">
  <h1>Create New Post</h1>
  
  <form on:submit|preventDefault={handleSubmit}>
    <div class="form-group">
      <label for="title">Title</label>
      <input
        id="title"
        type="text"
        bind:value={title}
        placeholder="Enter post title"
        required
      />
    </div>
    
    <div class="form-group">
      <label for="body">Content</label>
      <textarea
        id="body"
        bind:value={body}
        placeholder="Enter post content"
        rows="10"
        required
      ></textarea>
    </div>
    
    <button type="submit" disabled={isLoading}>
      {isLoading ? "Creating..." : "Create Post"}
    </button>
    
    {#if error}
      <div class="error">
        Failed to create post: {error.message}
      </div>
    {/if}
    
    {#if isSuccess}
      <div class="success">
        Post created successfully!
      </div>
    {/if}
  </form>
</div>

<style>
  .new-post-page {
    max-width: 600px;
    margin: 0 auto;
    padding: 1rem;
  }

  .form-group {
    margin-bottom: 1.5rem;
  }

  label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: bold;
  }

  input, textarea {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-family: inherit;
    font-size: 1rem;
  }

  textarea {
    resize: vertical;
  }

  button {
    background: #007acc;
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 4px;
    cursor: pointer;
    font-size: 1rem;
  }

  button:disabled {
    background: #ccc;
    cursor: not-allowed;
  }

  .error {
    color: #d32f2f;
    background: #ffebee;
    padding: 0.75rem;
    border-radius: 4px;
    margin-top: 1rem;
  }

  .success {
    color: #388e3c;
    background: #e8f5e9;
    padding: 0.75rem;
    border-radius: 4px;
    margin-top: 1rem;
  }
</style>
```

## Creating a Post Detail Component

Let's create a component that shows a single post with its comments:

```svelte
<!-- src/routes/posts/[id]/+page.svelte -->
<script lang="ts">
  import { store } from "$lib/store";
  import { page } from "$app/stores";
  import { useGetPostQuery, useGetUserQuery, useGetCommentsByPostQuery, useAddCommentMutation } from "$lib/services/blogApi";

  // Get post ID from URL params
  let postId: number;
  $: postId = Number($page.params.id);

  // Fetch post data
  const { data: post, error: postError, isLoading: postLoading } = useGetPostQuery(postId, {
    skip: !postId
  });

  // Fetch user data for the post
  const { data: user, error: userError } = useGetUserQuery(post?.userId || 0, {
    skip: !post?.userId
  });

  // Fetch comments for the post
  const { data: comments, error: commentsError, isLoading: commentsLoading } = useGetCommentsByPostQuery(postId, {
    skip: !postId
  });

  // Mutation for adding comments
  const [addComment, { isLoading: isAddingComment }] = useAddCommentMutation();

  // Form state for new comments
  let commentName = "";
  let commentEmail = "";
  let commentBody = "";

  async function handleAddComment() {
    if (!commentName || !commentEmail || !commentBody) return;

    try {
      await addComment({
        postId,
        name: commentName,
        email: commentEmail,
        body: commentBody
      });

      // Reset form
      commentName = "";
      commentEmail = "";
      commentBody = "";
    } catch (err) {
      console.error("Failed to add comment:", err);
    }
  }
</script>

<div class="post-detail-page">
  {#if postLoading}
    <div class="loading">Loading post...</div>
  {:else if postError}
    <div class="error">
      Error loading post: {postError.status} - {postError.message}
    </div>
  {:else if post}
    <article class="post">
      <header>
        <h1>{post.title}</h1>
        {#if user}
          <div class="post-meta">
            By {user.name} ({user.email})
          </div>
        {/if}
      </header>
      
      <div class="post-content">
        {post.body}
      </div>
    </article>

    <section class="comments-section">
      <h2>Comments</h2>
      
      {#if commentsLoading}
        <div class="loading">Loading comments...</div>
      {:else if commentsError}
        <div class="error">
          Error loading comments: {commentsError.message}
        </div>
      {:else if comments}
        <div class="comments-list">
          {#each comments as comment (comment.id)}
            <div class="comment">
              <div class="comment-header">
                <strong>{comment.name}</strong> &lt;{comment.email}&gt;
              </div>
              <div class="comment-body">
                {comment.body}
              </div>
            </div>
          {/each}
        </div>
      {/if}

      <div class="add-comment">
        <h3>Add a Comment</h3>
        <form on:submit|preventDefault={handleAddComment}>
          <div class="form-group">
            <label for="name">Name</label>
            <input
              id="name"
              type="text"
              bind:value={commentName}
              placeholder="Your name"
              required
            />
          </div>
          
          <div class="form-group">
            <label for="email">Email</label>
            <input
              id="email"
              type="email"
              bind:value={commentEmail}
              placeholder="your.email@example.com"
              required
            />
          </div>
          
          <div class="form-group">
            <label for="comment">Comment</label>
            <textarea
              id="comment"
              bind:value={commentBody}
              placeholder="Your comment"
              rows="4"
              required
            ></textarea>
          </div>
          
          <button type="submit" disabled={isAddingComment}>
            {isAddingComment ? "Adding..." : "Add Comment"}
          </button>
        </form>
      </div>
    </section>
  {/if}
</div>

<style>
  .post-detail-page {
    max-width: 800px;
    margin: 0 auto;
    padding: 1rem;
  }

  .loading, .error {
    text-align: center;
    padding: 2rem;
  }

  .post {
    background: white;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    padding: 2rem;
    margin-bottom: 2rem;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }

  .post header {
    margin-bottom: 1.5rem;
    border-bottom: 1px solid #eee;
    padding-bottom: 1rem;
  }

  .post h1 {
    margin: 0 0 0.5rem 0;
    color: #333;
  }

  .post-meta {
    color: #666;
    font-size: 0.9rem;
  }

  .post-content {
    line-height: 1.6;
    color: #444;
  }

  .comments-section h2 {
    margin-top: 2rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid #eee;
  }

  .comments-list {
    margin-bottom: 2rem;
  }

  .comment {
    background: #f9f9f9;
    border: 1px solid #eee;
    border-radius: 4px;
    padding: 1rem;
    margin-bottom: 1rem;
  }

  .comment-header {
    margin-bottom: 0.5rem;
    font-size: 0.9rem;
    color: #666;
  }

  .comment-body {
    color: #333;
  }

  .add-comment {
    background: #f5f5f5;
    border: 1px solid #ddd;
    border-radius: 4px;
    padding: 1.5rem;
  }

  .add-comment h3 {
    margin-top: 0;
  }

  .form-group {
    margin-bottom: 1rem;
  }

  label {
    display: block;
    margin-bottom: 0.25rem;
    font-weight: bold;
    font-size: 0.9rem;
  }

  input, textarea {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-family: inherit;
    font-size: 1rem;
  }

  textarea {
    resize: vertical;
  }

  button {
    background: #007acc;
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    cursor: pointer;
    font-size: 1rem;
  }

  button:disabled {
    background: #ccc;
    cursor: not-allowed;
  }
</style>
```

## Advanced Usage: Optimistic Updates

Let's implement optimistic updates for a better user experience:

```typescript
// src/lib/services/blogApi.ts (enhanced)
// ... existing code ...

export const blogApi = createApi({
  // ... existing config ...
  endpoints: (build) => ({
    // ... existing endpoints ...
    
    // Enhanced deletePost with optimistic update
    deletePost: build.mutation<{ success: boolean; id: number }, number>({
      query: (id) => ({
        url: `/posts/${id}`,
        method: "DELETE",
      }),
      async onQueryStarted(id, { dispatch, queryFulfilled }) {
        // Optimistically update the cache
        const patchResult = dispatch(
          blogApi.util.updateQueryData("getPosts", undefined, (draft) => {
            return draft.filter((post) => post.id !== id);
          })
        );
        
        try {
          // Wait for the mutation to complete
          await queryFulfilled;
        } catch {
          // If the mutation fails, undo the optimistic update
          patchResult.undo();
        }
      },
      invalidatesTags: (result, error, id) => [{ type: "Post", id }],
    }),
    
    // Enhanced updatePost with optimistic update
    updatePost: build.mutation<Post, Partial<Post> & Pick<Post, "id">>({
      query: ({ id, ...patch }) => ({
        url: `/posts/${id}`,
        method: "PUT",
        body: patch,
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        // Optimistically update the cache for getPosts
        const patchResult1 = dispatch(
          blogApi.util.updateQueryData("getPosts", undefined, (draft) => {
            const existingPost = draft.find((post) => post.id === id);
            if (existingPost) {
              Object.assign(existingPost, patch);
            }
          })
        );
        
        // Optimistically update the cache for getPost
        const patchResult2 = dispatch(
          blogApi.util.updateQueryData("getPost", id, (draft) => {
            Object.assign(draft, patch);
          })
        );
        
        try {
          // Wait for the mutation to complete
          await queryFulfilled;
        } catch {
          // If the mutation fails, undo the optimistic updates
          patchResult1.undo();
          patchResult2.undo();
        }
      },
      invalidatesTags: (result, error, { id }) => [{ type: "Post", id }],
    }),
  }),
});

// ... existing code ...
```

## Using Optimistic Updates in Components

Let's create a component that demonstrates optimistic updates:

```svelte
<!-- src/routes/posts/manage/+page.svelte -->
<script lang="ts">
  import { store } from "$lib/store";
  import { useGetPostsQuery, useDeletePostMutation, useUpdatePostMutation } from "$lib/services/blogApi";

  const { data: posts, error, isLoading, isFetching, refetch } = useGetPostsQuery();
  const [deletePost, { isLoading: isDeleting }] = useDeletePostMutation();
  const [updatePost, { isLoading: isUpdating }] = useUpdatePostMutation();

  let editingId: number | null = null;
  let editTitle = "";
  let editBody = "";

  function startEditing(post) {
    editingId = post.id;
    editTitle = post.title;
    editBody = post.body;
  }

  function cancelEditing() {
    editingId = null;
    editTitle = "";
    editBody = "";
  }

  async function saveEdit(postId: number) {
    if (!editTitle || !editBody) return;
    
    try {
      await updatePost({ id: postId, title: editTitle, body: editBody });
      cancelEditing();
    } catch (err) {
      console.error("Failed to update post:", err);
    }
  }

  async function handleDelete(postId: number) {
    if (!confirm("Are you sure you want to delete this post?")) return;
    
    try {
      await deletePost(postId);
    } catch (err) {
      console.error("Failed to delete post:", err);
    }
  }
</script>

<div class="manage-posts-page">
  <header>
    <h1>Manage Posts</h1>
    <button on:click={refetch} disabled={isFetching}>
      {isFetching ? "Refreshing..." : "Refresh"}
    </button>
  </header>

  {#if isLoading}
    <div class="loading">Loading posts...</div>
  {:else if error}
    <div class="error">
      Error loading posts: {error.status} - {error.message}
      <button on:click={refetch}>Retry</button>
    </div>
  {:else if posts}
    <div class="posts-list">
      {#each posts.slice(0, 20) as post (post.id)}
        {#if editingId === post.id}
          <!-- Edit form -->
          <div class="post-item editing">
            <div class="form-group">
              <input
                type="text"
                bind:value={editTitle}
                placeholder="Post title"
              />
            </div>
            <div class="form-group">
              <textarea
                bind:value={editBody}
                placeholder="Post content"
                rows="3"
              ></textarea>
            </div>
            <div class="actions">
              <button 
                on:click={() => saveEdit(post.id)} 
                disabled={isUpdating}
                class="save"
              >
                {isUpdating ? "Saving..." : "Save"}
              </button>
              <button on:click={cancelEditing} class="cancel">Cancel</button>
            </div>
          </div>
        {:else}
          <!-- Display post -->
          <div class="post-item">
            <h3>{post.title}</h3>
            <p>{post.body.substring(0, 100)}...</p>
            <div class="actions">
              <button on:click={() => startEditing(post)} class="edit">Edit</button>
              <button 
                on:click={() => handleDelete(post.id)} 
                disabled={isDeleting}
                class="delete"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        {/if}
      {/each}
    </div>
  {/if}
</div>

<style>
  .manage-posts-page {
    max-width: 800px;
    margin: 0 auto;
    padding: 1rem;
  }

  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
  }

  .loading, .error {
    text-align: center;
    padding: 2rem;
  }

  .posts-list {
    display: grid;
    gap: 1rem;
  }

  .post-item {
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    padding: 1rem;
    background: white;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }

  .post-item.editing {
    background: #f0f8ff;
  }

  .post-item h3 {
    margin: 0 0 0.5rem 0;
    color: #333;
  }

  .post-item p {
    margin: 0 0 1rem 0;
    color: #666;
  }

  .form-group {
    margin-bottom: 1rem;
  }

  input, textarea {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-family: inherit;
    font-size: 1rem;
  }

  textarea {
    resize: vertical;
  }

  .actions {
    display: flex;
    gap: 0.5rem;
  }

  button {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.9rem;
  }

  .edit, .save {
    background: #007acc;
    color: white;
  }

  .delete, .cancel {
    background: #d32f2f;
    color: white;
  }

  button:disabled {
    background: #ccc;
    cursor: not-allowed;
  }

  .error button {
    margin-top: 1rem;
    background: #007acc;
    color: white;
  }
</style>
```

## Performance Optimization

For better performance, you can use the API's built-in selectors to monitor cache state:

```typescript
// src/lib/selectors/apiSelectors.ts
import { createApiStateSelectors } from "sveltekitlibrary/redux";
import type { RootState } from "$lib/store";

// Create selectors for our blog API
export const blogApiSelectors = createApiStateSelectors("blogApi");

// Custom selectors for specific use cases
export const selectPostsLoading = (state: RootState) => {
  const { isAnyLoading } = blogApiSelectors.selectQueriesLoading(state);
  return isAnyLoading;
};

export const selectPostsError = (state: RootState) => {
  const { hasAnyErrors, errorQueries } = blogApiSelectors.selectQueriesErrors(state);
  return hasAnyErrors ? errorQueries[0]?.error : null;
};

export const selectCacheStats = (state: RootState) => {
  return blogApiSelectors.selectCacheStats(state);
};
```

## Testing API Endpoints

You can test your API endpoints using the built-in test utilities:

```typescript
// src/lib/services/blogApi.test.ts
import { describe, it, expect, vi } from "vitest";
import { blogApi } from "./blogApi";
import { store } from "$lib/store";

describe("Blog API", () => {
  it("should fetch posts", async () => {
    const result = await store.dispatch(blogApi.endpoints.getPosts.initiate());
    
    expect(result.data).toBeDefined();
    expect(Array.isArray(result.data)).toBe(true);
    expect(result.data.length).toBeGreaterThan(0);
  });

  it("should fetch a single post", async () => {
    const result = await store.dispatch(blogApi.endpoints.getPost.initiate(1));
    
    expect(result.data).toBeDefined();
    expect(result.data.id).toBe(1);
    expect(result.data.title).toBeDefined();
  });

  it("should add a new post", async () => {
    const newPost = {
      title: "Test Post",
      body: "This is a test post",
      userId: 1
    };

    const result = await store.dispatch(blogApi.endpoints.addPost.initiate(newPost));
    
    expect(result.data).toBeDefined();
    expect(result.data.title).toBe(newPost.title);
    expect(result.data.body).toBe(newPost.body);
  });
});
```

This guide demonstrates how to use the Redux-Esque API system to build a full-featured application with data fetching, caching, optimistic updates, and cache invalidation. The API system provides a powerful, type-safe way to manage server state in your Svelte 5 applications.
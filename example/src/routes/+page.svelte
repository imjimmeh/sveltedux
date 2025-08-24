<script lang="ts">
  import { createStore } from "$lib/redux/store.svelte";
  import { combineReducers } from "$lib/redux/reducers";
  import { createApi, fetchBaseQuery } from "$lib/redux/api";
  import { createApiHooks } from "$lib/redux/api/factory";
  import { applyMiddleware, thunkMiddleware } from "$lib";

  // Define types for our data
  interface Post {
    id: number;
    title: string;
    body: string;
    userId: number;
  }

  interface User {
    id: number;
    name: string;
    username: string;
    email: string;
  }

  // Create the API slice
  const api = createApi({
    reducerPath: "jsonPlaceholderApi",
    baseQuery: fetchBaseQuery({
      baseUrl: "https://jsonplaceholder.typicode.com",
      prepareHeaders: (headers) => {
        headers.set("Content-Type", "application/json");
        return headers;
      },
    }),
    tagTypes: ["Post", "User"],
    endpoints: (builder) => ({
      // Query endpoints
      getPosts: builder.query<Post[]>({
        query: () => "/posts",
        providesTags: (result) =>
          result
            ? [
                ...result.map(({ id }) => ({
                  type: "Post" as const,
                  id: id as number,
                })),
                { type: "Post" as const, id: "LIST" },
              ]
            : [{ type: "Post" as const, id: "LIST" }],
      }),

      getPost: builder.query<Post, number>({
        query: (id) => `/posts/${id}`,
        providesTags: (result, error, id) => [
          { type: "Post", id: id as number },
        ],
      }),

      getUsers: builder.query<User[], void>({
        query: () => "/users",
        providesTags: () => ["User"],
      }),

      // Mutation endpoints
      createPost: builder.mutation<Post, Omit<Post, "id">>({
        query: (newPost) => ({
          url: "/posts",
          method: "POST",
          body: newPost,
        }),
        invalidatesTags: () => [{ type: "Post", id: "LIST" }],
      }),

      updatePost: builder.mutation<Post, { id: number; update: Partial<Post> }>(
        {
          query: ({ id, update }) => ({
            url: `/posts/${id}`,
            method: "PUT",
            body: update,
          }),
          invalidatesTags: (result, error, { id }) => [
            { type: "Post", id: id as number },
          ],
        }
      ),

      deletePost: builder.mutation<void, number>({
        query: (id) => ({
          url: `/posts/${id}`,
          method: "DELETE",
        }),
        invalidatesTags: (result, error, id) => [
          { type: "Post", id },
          { type: "Post", id: "LIST" },
        ],
      }),
    }),
  });

  // Create store with API reducer
  const rootReducer = combineReducers({
    [api.reducerPath]: api.reducer,
  });

  const store = createStore(
    rootReducer,
    undefined,
    applyMiddleware(thunkMiddleware, api.middleware)
  );

  // Create API hooks
  const hooks = createApiHooks(store, api);

  // Component state
  let selectedPostId = $state(1);
  let newPostTitle = $state("");
  let newPostBody = $state("");

  // Use the generated hooks
  // Use the generated hooks with correct options and initiate calls
  const postsQuery = hooks.useGetPostsQuery();
  const usersQuery = hooks.useGetUsersQuery();
  const postQuery = $derived(hooks.useGetPostQuery(selectedPostId));

  const createPost = hooks.useCreatePostMutation();
  const updatePost = hooks.useUpdatePostMutation();
  const deletePost = hooks.useDeletePostMutation();
  // Handle form submissions
  async function handleCreatePost(e: Event) {
    e.preventDefault();
    if (!newPostTitle.trim() || !newPostBody.trim()) return;

    try {
      await createPost({
        title: newPostTitle,
        body: newPostBody,
        userId: 1,
      });

      newPostTitle = "";
      newPostBody = "";
    } catch (error) {
      console.error("Failed to create post:", error);
    }
  }

  async function handleUpdatePost(id: number) {
    try {
      await updatePost({
        id,
        update: { title: `Updated: ${Date.now()}` },
      });
    } catch (error) {
      console.error("Failed to update post:", error);
    }
  }

  async function handleDeletePost(id: number) {
    try {
      await deletePost(id);
    } catch (error) {
      console.error("Failed to delete post:", error);
    }
  }
</script>

<div class="api-demo">
  <h1>RTK Query-like API Demo</h1>

  <div class="section">
    <h2>All Posts</h2>
    {#if postsQuery.isLoading}
      <div class="loading">Loading posts...</div>
    {:else if postsQuery.isError}
      <div class="error">
        Error loading posts: {JSON.stringify(postsQuery.error)}
      </div>
    {:else if postsQuery.data}
      <div class="posts-grid">
        {#each postsQuery.data.slice(0, 10) as post (post.id)}
          <div class="post-card" class:selected={post.id === selectedPostId}>
            <h3>{post.title}</h3>
            <p>{post.body.substring(0, 100)}...</p>
            <div class="post-actions">
              <button
                onclick={() => (selectedPostId = post.id)}
                class="btn btn-primary"
              >
                View Details
              </button>
              <button
                onclick={() => handleUpdatePost(post.id)}
                class="btn btn-secondary"
                disabled={deletePost.isLoading}
              >
                {updatePost.isLoading ? "Updating..." : "Update"}
              </button>
              <button
                onclick={() => handleDeletePost(post.id)}
                class="btn btn-danger"
                disabled={deletePost.isLoading}
              >
                {deletePost.isLoading ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        {/each}
      </div>

      <div class="data-info">
        <p>
          <strong>Cache Status:</strong>
          {postsQuery.isFetching ? "Fetching" : "Fresh"}
        </p>
        <button onclick={postsQuery.refetch} class="btn btn-outline">
          Refetch Posts
        </button>
      </div>
    {/if}
  </div>

  <div class="section">
    <h2>Selected Post Details</h2>
    {#if postQuery.isLoading}
      <div class="loading">Loading post details...</div>
    {:else if postQuery.isError}
      <div class="error">
        Error loading post: {JSON.stringify(postQuery.error)}
      </div>
    {:else if postQuery.data}
      <div class="post-details">
        <h3>{postQuery.data.title}</h3>
        <p><strong>ID:</strong> {postQuery.data.id}</p>
        <p><strong>User ID:</strong> {postQuery.data.userId}</p>
        <p><strong>Body:</strong> {postQuery.data.body}</p>

        <div class="post-selector">
          <label>
            Select Post ID:
            <input
              type="number"
              bind:value={selectedPostId}
              min="1"
              max="100"
            />
          </label>
        </div>
      </div>
    {/if}
  </div>

  <div class="section">
    <h2>Create New Post</h2>
    <form onsubmit={handleCreatePost} class="create-form">
      <div class="form-group">
        <label>
          Title:
          <input
            type="text"
            bind:value={newPostTitle}
            placeholder="Enter post title"
            required
          />
        </label>
      </div>

      <div class="form-group">
        <label>
          Body:
          <textarea
            bind:value={newPostBody}
            placeholder="Enter post content"
            required
            rows="4"
          ></textarea>
        </label>
      </div>

      <button
        type="submit"
        class="btn btn-primary"
        disabled={createPost.isLoading ||
          !newPostTitle.trim() ||
          !newPostBody.trim()}
      >
        {createPost.isLoading ? "Creating..." : "Create Post"}
      </button>

      {#if createPost.isSuccess}
        <div class="success">Post created successfully!</div>
      {/if}

      {#if createPost.isError}
        <div class="error">
          Failed to create post: {JSON.stringify(createPost.error)}
        </div>
      {/if}
    </form>
  </div>

  <div class="section">
    <h2>Users</h2>
    {#if usersQuery.isLoading}
      <div class="loading">Loading users...</div>
    {:else if usersQuery.isError}
      <div class="error">
        Error loading users: {JSON.stringify(usersQuery.error)}
      </div>
    {:else if usersQuery.data}
      <div class="users-list">
        {#each usersQuery.data.slice(0, 5) as user (user.id)}
          <div class="user-card">
            <h4>{user.name}</h4>
            <p><strong>Username:</strong> {user.username}</p>
            <p><strong>Email:</strong> {user.email}</p>
          </div>
        {/each}
      </div>
    {/if}
  </div>

  <div class="section">
    <h2>Cache Management</h2>
    <div class="cache-controls">
      <button
        onclick={() => store.dispatch(api.util.resetApiState())}
        class="btn btn-warning"
      >
        Reset All Cache
      </button>

      <button
        onclick={() => store.dispatch(api.util.invalidateTags(["Post"]))}
        class="btn btn-warning"
      >
        Invalidate Posts Cache
      </button>

      <button
        onclick={() => store.dispatch(api.util.invalidateTags(["User"]))}
        class="btn btn-warning"
      >
        Invalidate Users Cache
      </button>
    </div>

    <div class="cache-info">
      <h3>Current Cache State</h3>
      <pre>{JSON.stringify(
          (store.getState() as any)[api.reducerPath],
          null,
          2
        )}</pre>
    </div>
  </div>
</div>

<style>
  .api-demo {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
      sans-serif;
  }

  .section {
    margin-bottom: 3rem;
    padding: 1.5rem;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    background: #f9f9f9;
  }

  .section h2 {
    margin-top: 0;
    color: #333;
    border-bottom: 2px solid #007acc;
    padding-bottom: 0.5rem;
  }

  .loading {
    padding: 1rem;
    text-align: center;
    color: #007acc;
    font-style: italic;
  }

  .error {
    padding: 1rem;
    background: #fee;
    border: 1px solid #fcc;
    border-radius: 4px;
    color: #c00;
  }

  .success {
    padding: 1rem;
    background: #efe;
    border: 1px solid #cfc;
    border-radius: 4px;
    color: #060;
    margin-top: 1rem;
  }

  .posts-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .post-card {
    padding: 1rem;
    border: 1px solid #ddd;
    border-radius: 6px;
    background: white;
    transition: all 0.2s ease;
  }

  .post-card:hover {
    border-color: #007acc;
    box-shadow: 0 2px 8px rgba(0, 122, 204, 0.1);
  }

  .post-card.selected {
    border-color: #007acc;
    background: #f0f8ff;
  }

  .post-card h3 {
    margin: 0 0 0.5rem 0;
    color: #333;
    font-size: 1.1rem;
  }

  .post-card p {
    margin: 0 0 1rem 0;
    color: #666;
    line-height: 1.4;
  }

  .post-actions {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .post-details {
    padding: 1rem;
    background: white;
    border-radius: 6px;
    border: 1px solid #ddd;
  }

  .post-details h3 {
    margin-top: 0;
    color: #007acc;
  }

  .post-selector {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid #eee;
  }

  .post-selector label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .create-form {
    max-width: 500px;
  }

  .form-group {
    margin-bottom: 1rem;
  }

  .form-group label {
    display: block;
    margin-bottom: 0.5rem;
    color: #333;
    font-weight: 500;
  }

  .form-group input,
  .form-group textarea {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 1rem;
    box-sizing: border-box;
  }

  .form-group input:focus,
  .form-group textarea:focus {
    outline: none;
    border-color: #007acc;
    box-shadow: 0 0 0 2px rgba(0, 122, 204, 0.2);
  }

  .users-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 1rem;
  }

  .user-card {
    padding: 1rem;
    background: white;
    border: 1px solid #ddd;
    border-radius: 6px;
  }

  .user-card h4 {
    margin: 0 0 0.5rem 0;
    color: #007acc;
  }

  .user-card p {
    margin: 0.25rem 0;
    color: #666;
  }

  .data-info {
    padding: 1rem;
    background: #f0f8ff;
    border-radius: 6px;
    border: 1px solid #b3d9ff;
  }

  .cache-controls {
    display: flex;
    gap: 1rem;
    margin-bottom: 1rem;
    flex-wrap: wrap;
  }

  .cache-info {
    background: white;
    padding: 1rem;
    border-radius: 6px;
    border: 1px solid #ddd;
  }

  .cache-info pre {
    background: #f5f5f5;
    padding: 1rem;
    border-radius: 4px;
    overflow-x: auto;
    font-size: 0.85rem;
    margin: 0;
  }

  .btn {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: 500;
    transition: all 0.2s ease;
    text-decoration: none;
    display: inline-block;
    text-align: center;
  }

  .btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .btn-primary {
    background: #007acc;
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    background: #0056b3;
  }

  .btn-secondary {
    background: #6c757d;
    color: white;
  }

  .btn-secondary:hover:not(:disabled) {
    background: #5a6268;
  }

  .btn-danger {
    background: #dc3545;
    color: white;
  }

  .btn-danger:hover:not(:disabled) {
    background: #c82333;
  }

  .btn-warning {
    background: #ffc107;
    color: #212529;
  }

  .btn-warning:hover:not(:disabled) {
    background: #e0a800;
  }

  .btn-outline {
    background: transparent;
    color: #007acc;
    border: 1px solid #007acc;
  }

  .btn-outline:hover:not(:disabled) {
    background: #007acc;
    color: white;
  }
</style>

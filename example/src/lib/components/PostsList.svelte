<script lang="ts">
  import {
    useGetPostsQuery,
    useGetUserQuery,
    useCreatePostMutation,
    useUpdatePostMutation,
    useDeletePostMutation,
  } from "../api/hooks.js";
  import type { Post } from "$lib/types.js";

  let page = $state(1);
  let limit = $state(3);
  let publishedFilter = $state<"all" | "published" | "draft">("all");
  let selectedAuthorId = $state<number | undefined>(undefined);

  const postsQuery = $derived(
    useGetPostsQuery({
      page,
      limit,
      published:
        publishedFilter === "all" ? undefined : publishedFilter === "published",
      authorId: selectedAuthorId,
    })
  );

  const createPost = useCreatePostMutation();
  const updatePost = useUpdatePostMutation();
  const deletePost = useDeletePostMutation();

  let showCreateForm = $state(false);
  let editingPost = $state<Post | null>(null);

  let newPost = $state({
    title: "",
    content: "",
    authorId: 1,
    authorName: "John Doe",
    tags: [] as string[],
    published: false,
    featured: false,
  });

  let newTagInput = $state("");

  function handleCreatePost() {
    if (newPost.title && newPost.content) {
      createPost(newPost);
      resetForm();
    }
  }

  function handleUpdatePost(post: Post) {
    const updates = {
      ...post,
      published: !post.published,
      updatedAt: new Date().toISOString(),
    };
    updatePost({ id: post.id, updates });
  }

  function handleDeletePost(postId: number) {
    deletePost(postId);
  }

  function addTag() {
    if (newTagInput.trim() && !newPost.tags.includes(newTagInput.trim())) {
      newPost.tags = [...newPost.tags, newTagInput.trim()];
      newTagInput = "";
    }
  }

  function removeTag(tagToRemove: string) {
    newPost.tags = newPost.tags.filter((tag) => tag !== tagToRemove);
  }

  function resetForm() {
    newPost = {
      title: "",
      content: "",
      authorId: 1,
      authorName: "John Doe",
      tags: [],
      published: false,
      featured: false,
    };
    newTagInput = "";
    showCreateForm = false;
  }

  function nextPage() {
    if (postsQuery.data?.meta && page < postsQuery.data.meta.totalPages) {
      page++;
    }
  }

  function prevPage() {
    if (page > 1) {
      page--;
    }
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString();
  }

  function getExcerpt(content: string, maxLength: number = 120) {
    return content.length > maxLength
      ? content.substring(0, maxLength) + "..."
      : content;
  }
</script>

<div class="posts-section">
  <div class="section-header">
    <h2>Posts Management</h2>
    <button
      onclick={() => (showCreateForm = !showCreateForm)}
      class="btn btn-primary"
    >
      {showCreateForm ? "Cancel" : "Create Post"}
    </button>
  </div>

  {#if showCreateForm}
    <div class="create-form">
      <h3>Create New Post</h3>
      <div class="form-grid">
        <div class="form-group full-width">
          <label>
            Title:
            <input
              type="text"
              bind:value={newPost.title}
              placeholder="Post title"
            />
          </label>
        </div>
        <div class="form-group">
          <label>
            Author:
            <select
              bind:value={newPost.authorId}
              onchange={(e) => {
                const authorId = parseInt(e.currentTarget?.value ?? "");
                newPost.authorId = authorId;
                newPost.authorName =
                  authorId === 1
                    ? "John Doe"
                    : authorId === 2
                      ? "Jane Smith"
                      : authorId === 3
                        ? "Bob Wilson"
                        : "John Doe";
              }}
            >
              <option value={1}>John Doe</option>
              <option value={2}>Jane Smith</option>
              <option value={3}>Bob Wilson</option>
            </select>
          </label>
        </div>
        <div class="form-group">
          <div class="checkbox-group">
            <label>
              <input type="checkbox" bind:checked={newPost.published} />
              Published
            </label>
            <label>
              <input type="checkbox" bind:checked={newPost.featured} />
              Featured
            </label>
          </div>
        </div>
        <div class="form-group full-width">
          <label>
            Content:
            <textarea
              bind:value={newPost.content}
              placeholder="Post content"
              rows="4"
            ></textarea>
          </label>
        </div>
        <div class="form-group full-width">
          <label>
            Tags:
            <div class="tags-input">
              <input
                type="text"
                bind:value={newTagInput}
                placeholder="Add a tag"
                onkeydown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag();
                  }
                }}
              />
              <button type="button" onclick={addTag} class="btn btn-sm"
                >Add Tag</button
              >
            </div>
            <div class="tags-list">
              {#each newPost.tags as tag}
                <span class="tag">
                  {tag}
                  <button
                    type="button"
                    onclick={() => removeTag(tag)}
                    class="tag-remove">×</button
                  >
                </span>
              {/each}
            </div>
          </label>
        </div>
      </div>
      <div class="form-actions">
        <button
          onclick={handleCreatePost}
          class="btn btn-primary"
          disabled={createPost.isLoading || !newPost.title || !newPost.content}
        >
          {createPost.isLoading ? "Creating..." : "Create Post"}
        </button>
        <button onclick={resetForm} class="btn btn-outline">Cancel</button>
      </div>
    </div>
  {/if}

  <div class="filters">
    <div class="filter-group">
      <label>
        Status Filter:
        <select bind:value={publishedFilter}>
          <option value="all">All Posts</option>
          <option value="published">Published</option>
          <option value="draft">Drafts</option>
        </select>
      </label>
    </div>
    <div class="filter-group">
      <label>
        Author Filter:
        <select bind:value={selectedAuthorId}>
          <option value={undefined}>All Authors</option>
          <option value={1}>John Doe</option>
          <option value={2}>Jane Smith</option>
          <option value={3}>Bob Wilson</option>
          <option value={4}>Alice Johnson</option>
          <option value={5}>Charlie Brown</option>
        </select>
      </label>
    </div>
    <div class="filter-group">
      <label>
        Per Page:
        <select bind:value={limit}>
          <option value={2}>2</option>
          <option value={3}>3</option>
          <option value={5}>5</option>
        </select>
      </label>
    </div>
  </div>

  {#if postsQuery.isLoading}
    <div class="loading">Loading posts...</div>
  {:else if postsQuery.error}
    <div class="error">
      Error loading posts: {JSON.stringify(postsQuery.error)}
    </div>
  {:else if postsQuery.data}
    <div class="posts-list">
      {#each postsQuery.data.data as post (post.id)}
        <article class="post-card" class:featured={post.featured}>
          <div class="post-header">
            <h3 class="post-title">{post.title}</h3>
            <div class="post-meta">
              <span class="author">by {post.authorName}</span>
              <span class="date">{formatDate(post.createdAt)}</span>
              <div class="post-badges">
                <span
                  class="status-badge"
                  class:published={post.published}
                  class:draft={!post.published}
                >
                  {post.published ? "Published" : "Draft"}
                </span>
                {#if post.featured}
                  <span class="featured-badge">Featured</span>
                {/if}
              </div>
            </div>
          </div>

          <div class="post-content">
            <p>{getExcerpt(post.content)}</p>
          </div>

          {#if post.tags.length > 0}
            <div class="post-tags">
              {#each post.tags as tag}
                <span class="tag">{tag}</span>
              {/each}
            </div>
          {/if}

          <div class="post-actions">
            <button
              onclick={() => handleUpdatePost(post)}
              class="btn btn-sm btn-outline"
              disabled={updatePost.isLoading}
            >
              {post.published ? "Unpublish" : "Publish"}
            </button>
            <button
              onclick={() => handleDeletePost(post.id)}
              class="btn btn-sm btn-danger"
              disabled={deletePost.isLoading}
            >
              Delete
            </button>
          </div>
        </article>
      {/each}
    </div>

    <div class="pagination">
      <div class="pagination-info">
        Showing {(page - 1) * limit + 1} to {Math.min(
          page * limit,
          postsQuery.data.meta.total
        )} of {postsQuery.data.meta.total} posts
      </div>
      <div class="pagination-controls">
        <button
          onclick={prevPage}
          class="btn btn-outline"
          disabled={page <= 1 || postsQuery.isFetching}
        >
          Previous
        </button>
        <span class="page-info"
          >Page {page} of {postsQuery.data.meta.totalPages}</span
        >
        <button
          onclick={nextPage}
          class="btn btn-outline"
          disabled={page >= postsQuery.data.meta.totalPages ||
            postsQuery.isFetching}
        >
          Next
        </button>
      </div>
      <div class="cache-status">
        Cache: {postsQuery.isFetching ? "Refreshing" : "Fresh"}
        <button onclick={postsQuery.refetch} class="btn btn-sm">Refresh</button>
      </div>
    </div>
  {/if}

  {#if createPost.isSuccess}
    <div class="success">Post created successfully!</div>
  {/if}

  {#if updatePost.isSuccess}
    <div class="success">Post updated successfully!</div>
  {/if}

  {#if deletePost.isSuccess}
    <div class="success">Post deleted successfully!</div>
  {/if}
</div>

<style>
  .posts-section {
    margin-bottom: 2rem;
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .section-header h2 {
    margin: 0;
    color: #333;
  }

  .create-form {
    background: #f8f9fa;
    border: 1px solid #dee2e6;
    border-radius: 8px;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
  }

  .create-form h3 {
    margin-top: 0;
    color: #495057;
  }

  .form-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .form-group.full-width {
    grid-column: 1 / -1;
  }

  .form-group label {
    display: block;
    font-weight: 500;
    margin-bottom: 0.5rem;
    color: #495057;
  }

  .form-group input,
  .form-group select,
  .form-group textarea {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #ced4da;
    border-radius: 4px;
    font-size: 0.9rem;
    box-sizing: border-box;
  }

  .checkbox-group {
    display: flex;
    gap: 1rem;
    align-items: center;
    padding-top: 1.5rem;
  }

  .checkbox-group label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: normal;
  }

  .tags-input {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .tags-input input {
    flex: 1;
    margin-bottom: 0;
  }

  .tags-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .tag {
    background: #e9ecef;
    color: #495057;
    padding: 0.25rem 0.5rem;
    border-radius: 12px;
    font-size: 0.8rem;
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
  }

  .tag-remove {
    background: none;
    border: none;
    color: #6c757d;
    cursor: pointer;
    font-size: 1rem;
    line-height: 1;
    padding: 0;
  }

  .tag-remove:hover {
    color: #dc3545;
  }

  .filters {
    display: flex;
    gap: 1rem;
    margin-bottom: 1rem;
    align-items: center;
    flex-wrap: wrap;
  }

  .filter-group label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 500;
    color: #495057;
  }

  .filter-group select {
    padding: 0.25rem 0.5rem;
    border: 1px solid #ced4da;
    border-radius: 4px;
  }

  .posts-list {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    margin-bottom: 1.5rem;
  }

  .post-card {
    background: white;
    border: 1px solid #dee2e6;
    border-radius: 8px;
    padding: 1.5rem;
    transition: box-shadow 0.2s ease;
  }

  .post-card.featured {
    border-left: 4px solid #ffc107;
  }

  .post-card:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .post-header {
    margin-bottom: 1rem;
  }

  .post-title {
    margin: 0 0 0.5rem 0;
    color: #212529;
    font-size: 1.25rem;
    line-height: 1.3;
  }

  .post-meta {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
    font-size: 0.9rem;
    color: #6c757d;
  }

  .post-badges {
    display: flex;
    gap: 0.5rem;
  }

  .status-badge {
    padding: 0.2rem 0.5rem;
    border-radius: 10px;
    font-size: 0.75rem;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .status-badge.published {
    background: #d1ecf1;
    color: #0c5460;
  }

  .status-badge.draft {
    background: #f8d7da;
    color: #721c24;
  }

  .featured-badge {
    background: #fff3cd;
    color: #856404;
    padding: 0.2rem 0.5rem;
    border-radius: 10px;
    font-size: 0.75rem;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .post-content p {
    margin: 0;
    color: #495057;
    line-height: 1.5;
  }

  .post-tags {
    margin: 1rem 0;
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .post-actions {
    margin-top: 1rem;
    display: flex;
    gap: 0.5rem;
  }

  .pagination {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    background: #f8f9fa;
    border-radius: 8px;
    border: 1px solid #dee2e6;
    flex-wrap: wrap;
    gap: 1rem;
  }

  .pagination-info {
    color: #6c757d;
    font-size: 0.9rem;
  }

  .pagination-controls {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .page-info {
    color: #495057;
    font-weight: 500;
    white-space: nowrap;
  }

  .cache-status {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: #6c757d;
    font-size: 0.85rem;
  }

  .loading {
    text-align: center;
    color: #007bff;
    font-style: italic;
    padding: 2rem;
  }

  .error {
    background: #f8d7da;
    color: #721c24;
    padding: 1rem;
    border-radius: 4px;
    border: 1px solid #f5c6cb;
  }

  .success {
    background: #d4edda;
    color: #155724;
    padding: 1rem;
    border-radius: 4px;
    border: 1px solid #c3e6cb;
    margin-top: 1rem;
  }

  .form-actions {
    display: flex;
    gap: 1rem;
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
    background: #007bff;
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    background: #0056b3;
  }

  .btn-danger {
    background: #dc3545;
    color: white;
  }

  .btn-danger:hover:not(:disabled) {
    background: #c82333;
  }

  .btn-outline {
    background: transparent;
    color: #007bff;
    border: 1px solid #007bff;
  }

  .btn-outline:hover:not(:disabled) {
    background: #007bff;
    color: white;
  }

  .btn-sm {
    padding: 0.25rem 0.5rem;
    font-size: 0.8rem;
  }
</style>

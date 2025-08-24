<script lang="ts">
  import { store, selectors, actions } from "../store/index.js";
  import {
    useGetPostsQuery,
    useCreatePostMutation,
    useUpdatePostMutation,
    useDeletePostMutation,
  } from "../api/hooks.js";
  import type { Post } from "$lib/types.js";
  
  // Entity adapter demo state
  let selectedAuthorId = $state<number | undefined>(undefined);
  let selectedTag = $state<string>("");
  let publishedFilter = $state<boolean | undefined>(undefined);
  let showCreateForm = $state(false);
  let newPostTitle = $state("");
  let newPostContent = $state("");
  
  // Query hooks for data fetching with automatic caching and loading states
  const postsQuery = $derived(
    useGetPostsQuery({
      limit: 50, // Load more posts for comprehensive entity adapter demo
      published: publishedFilter,
      authorId: selectedAuthorId,
    })
  );

  // Mutation hooks for CRUD operations
  const createPostMutation = useCreatePostMutation();
  const updatePostMutation = useUpdatePostMutation();
  const deletePostMutation = useDeletePostMutation();

  // Sync API data with entity adapter when query data changes
  let lastDataRef = null;
  $effect(() => {
    if (postsQuery.data?.data && postsQuery.data.data !== lastDataRef) {
      lastDataRef = postsQuery.data.data;
      // Update entity adapter with API data
      store.dispatch(actions.posts.setPosts(postsQuery.data.data));
    }
  });

  // Reactive selectors using entity adapter (populated from API data)
  const allPosts = $derived(selectors.posts.selectAllPosts(store.state));
  const postsStats = $derived(selectors.posts.selectPostsStats(store.state));
  const filteredPosts = $derived(selectors.posts.selectFilteredPosts(store.state));
  const authorsFromPosts = $derived(selectors.posts.selectAuthorsFromPosts(store.state));
  const tagsFromPosts = $derived(selectors.posts.selectTagsFromPosts(store.state));
  const recentPosts = $derived(selectors.posts.selectRecentPosts(store.state));
  
  // Entity adapter is now working correctly!
  
  // Query state selectors
  const isLoading = $derived(postsQuery.isLoading);
  const error = $derived(postsQuery.error);
  const isStale = $derived(!postsQuery.isLoading && !postsQuery.isFetching && postsQuery.isStale);
  
  // No manual data loading needed - query hooks handle this automatically!
  
  function applyFilter() {
    store.dispatch(actions.posts.setPostsFilter({
      published: publishedFilter,
      authorId: selectedAuthorId,
      tag: selectedTag || undefined,
    }));
  }
  
  function clearFilters() {
    publishedFilter = undefined;
    selectedAuthorId = undefined;
    selectedTag = "";
    store.dispatch(actions.posts.setPostsFilter({}));
  }
  
  async function handleCreatePost() {
    if (!newPostTitle.trim() || !newPostContent.trim()) return;
    
    console.log("Creating post...");
    
    try {
      const result = await createPostMutation({
        title: newPostTitle,
        content: newPostContent,
        excerpt: newPostContent.substring(0, 100) + "...",
        authorId: 1,
        authorName: "John Doe",
        tags: ["demo", "entity-adapter"],
        published: false,
        featured: false,
      });
      
      console.log("Post created successfully:", result);
      
      // Reset form
      newPostTitle = "";
      newPostContent = "";
      showCreateForm = false;
    } catch (error) {
      console.error("Failed to create post:", error);
    }
  }
  
  function togglePostPublished(post: Post) {
    updatePostMutation({
      id: post.id,
      updates: {
        published: !post.published,
        updatedAt: new Date().toISOString(),
      },
    });
  }
  
  function deletePost(postId: number) {
    if (confirm("Are you sure you want to delete this post?")) {
      deletePostMutation(postId);
    }
  }
  
  function refreshData() {
    postsQuery.refetch();
  }
  
  function getPostById(id: number): Post | undefined {
    return selectors.posts.selectPostById(store.state, id);
  }
  
  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }
</script>

<div class="entity-demo">
  <div class="demo-header">
    <h2>📚 Posts Entity Adapter Demo</h2>
    <p class="demo-description">
      This component demonstrates the Entity Adapter in action. It shows normalized entity management,
      memoized selectors, optimistic updates, and complex filtering - all using the <code>createEntityAdapter</code> API.
    </p>
    
    <div class="data-status">
      <div class="status-item">
        <strong>Cache Status:</strong>
        <span class="status-badge" class:stale={isStale} class:fresh={!isStale}>
          {isStale ? "Stale" : "Fresh"}
        </span>
        {#if isStale}
          <button onclick={refreshData} class="btn btn-sm">Refresh</button>
        {/if}
      </div>
      
      <div class="status-item">
        <strong>Loading:</strong>
        <span>{isLoading ? "Yes" : "No"}</span>
      </div>
      
      {#if error}
        <div class="status-item error">
          <strong>Error:</strong> {error}
        </div>
      {/if}
    </div>
  </div>

  <!-- Statistics Panel -->
  <div class="stats-panel">
    <h3>📊 Entity Statistics (Memoized Selectors)</h3>
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-number">{postsStats.total}</div>
        <div class="stat-label">Total Posts</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">{postsStats.published}</div>
        <div class="stat-label">Published</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">{postsStats.drafts}</div>
        <div class="stat-label">Drafts</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">{postsStats.featured}</div>
        <div class="stat-label">Featured</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">{recentPosts.length}</div>
        <div class="stat-label">Recent (7 days)</div>
      </div>
    </div>
  </div>

  <!-- Filtering Panel -->
  <div class="filters-panel">
    <h3>🔍 Entity Filtering (Complex Selectors)</h3>
    <div class="filters-form">
      <div class="filter-group">
        <label>
          Status:
          <select bind:value={publishedFilter}>
            <option value={undefined}>All</option>
            <option value={true}>Published</option>
            <option value={false}>Drafts</option>
          </select>
        </label>
      </div>
      
      <div class="filter-group">
        <label>
          Author:
          <select bind:value={selectedAuthorId}>
            <option value={undefined}>All Authors</option>
            {#each authorsFromPosts as author}
              <option value={author.id}>{author.name} ({author.postCount} posts)</option>
            {/each}
          </select>
        </label>
      </div>
      
      <div class="filter-group">
        <label>
          Tag:
          <select bind:value={selectedTag}>
            <option value="">All Tags</option>
            {#each tagsFromPosts.slice(0, 10) as tag}
              <option value={tag.name}>{tag.name} ({tag.count})</option>
            {/each}
          </select>
        </label>
      </div>
      
      <div class="filter-actions">
        <button onclick={applyFilter} class="btn btn-primary">Apply Filters</button>
        <button onclick={clearFilters} class="btn btn-outline">Clear</button>
      </div>
    </div>
  </div>

  <!-- CRUD Operations Panel -->
  <div class="crud-panel">
    <div class="panel-header">
      <h3>✏️ CRUD Operations</h3>
      <button 
        onclick={() => showCreateForm = !showCreateForm} 
        class="btn btn-primary"
      >
        {showCreateForm ? "Cancel" : "Create Post (Optimistic)"}
      </button>
    </div>
    
    {#if showCreateForm}
      <div class="create-form">
        <div class="form-group">
          <label>
            Title:
            <input 
              type="text" 
              bind:value={newPostTitle} 
              placeholder="Enter post title"
            />
          </label>
        </div>
        <div class="form-group">
          <label>
            Content:
            <textarea 
              bind:value={newPostContent} 
              placeholder="Enter post content"
              rows="3"
            ></textarea>
          </label>
        </div>
        <div class="form-actions">
          <button 
            onclick={handleCreatePost} 
            class="btn btn-primary"
            disabled={!newPostTitle.trim() || !newPostContent.trim() || createPostMutation.isLoading}
          >
            {createPostMutation.isLoading ? "Creating..." : "Create Post"}
          </button>
        </div>
      </div>
    {/if}
  </div>

  <!-- Posts Display -->
  <div class="posts-display">
    <div class="posts-header">
      <h3>📝 Entity Collection</h3>
      <div class="results-info">
        Showing {filteredPosts.length} of {allPosts.length} posts
        {#if filteredPosts.length !== allPosts.length}
          <span class="filter-indicator">(filtered)</span>
        {/if}
      </div>
    </div>
    
    {#if isLoading && allPosts.length === 0}
      <div class="loading-state">Loading posts...</div>
    {:else if filteredPosts.length === 0}
      <div class="empty-state">
        {allPosts.length === 0 ? "No posts available" : "No posts match the current filters"}
      </div>
    {:else}
      <div class="posts-grid">
        {#each filteredPosts as post (post.id)}
          <div class="post-item" class:featured={post.featured}>
            <div class="post-header">
              <h4 class="post-title">{post.title}</h4>
              <div class="post-meta">
                <span class="author">by {post.authorName}</span>
                <span class="date">{formatDate(post.createdAt)}</span>
                <div class="badges">
                  <span class="status-badge" class:published={post.published} class:draft={!post.published}>
                    {post.published ? "Published" : "Draft"}
                  </span>
                  {#if post.featured}
                    <span class="featured-badge">Featured</span>
                  {/if}
                </div>
              </div>
            </div>
            
            <p class="post-excerpt">{post.excerpt}</p>
            
            {#if post.tags.length > 0}
              <div class="post-tags">
                {#each post.tags as tag}
                  <span class="tag">{tag}</span>
                {/each}
              </div>
            {/if}
            
            <div class="post-actions">
              <button 
                onclick={() => togglePostPublished(post)} 
                class="btn btn-sm btn-outline"
                disabled={updatePostMutation.isLoading}
              >
                {updatePostMutation.isLoading ? "..." : (post.published ? "Unpublish" : "Publish")}
              </button>
              <button 
                onclick={() => deletePost(post.id)} 
                class="btn btn-sm btn-danger"
                disabled={deletePostMutation.isLoading}
              >
                {deletePostMutation.isLoading ? "..." : "Delete"}
              </button>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>

  <!-- Entity Adapter Technical Info -->
  <div class="tech-info">
    <h3>🛠️ Technical Implementation</h3>
    <div class="tech-details">
      <p><strong>Entity Adapter Features Demonstrated:</strong></p>
      <ul>
        <li><strong>Normalized State:</strong> Posts stored as <code>{`{ ids: [], entities: {} }`}</code></li>
        <li><strong>Automatic Sorting:</strong> Posts sorted by creation date (newest first)</li>
        <li><strong>CRUD Operations:</strong> Add, update, remove with <code>postsAdapter</code> methods</li>
        <li><strong>Memoized Selectors:</strong> <code>selectAllPosts</code>, <code>selectFilteredPosts</code>, etc.</li>
        <li><strong>Complex Filtering:</strong> Multi-criteria filtering with derived selectors</li>
        <li><strong>Optimistic Updates:</strong> Immediate UI updates, rollback on error</li>
        <li><strong>Statistics:</strong> Derived counts and metrics from entity collection</li>
        <li><strong>Cache Management:</strong> Timestamp tracking and stale data detection</li>
      </ul>
      
      <p><strong>Files Created:</strong></p>
      <ul>
        <li><code>lib/store/posts/slice.ts</code> - Entity adapter setup and reducers</li>
        <li><code>lib/store/posts/selectors.ts</code> - Memoized selectors</li>
        <li><code>lib/store/posts/thunks.ts</code> - Async operations with optimistic updates</li>
      </ul>
    </div>
  </div>
</div>

<style>
  .entity-demo {
    max-width: 1200px;
    margin: 0 auto;
    padding: 1rem;
    font-family: system-ui, -apple-system, sans-serif;
  }

  .demo-header {
    background: #f8f9fa;
    border: 1px solid #dee2e6;
    border-radius: 8px;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
  }

  .demo-header h2 {
    margin: 0 0 0.5rem 0;
    color: #212529;
  }

  .demo-description {
    color: #6c757d;
    margin: 0 0 1rem 0;
    line-height: 1.5;
  }

  .demo-description code {
    background: #e9ecef;
    padding: 0.125rem 0.25rem;
    border-radius: 3px;
    font-size: 0.875rem;
  }

  .data-status {
    display: flex;
    gap: 2rem;
    align-items: center;
    flex-wrap: wrap;
  }

  .status-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.9rem;
  }

  .status-item.error {
    color: #dc3545;
  }

  .status-badge {
    padding: 0.125rem 0.5rem;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 500;
    text-transform: uppercase;
  }

  .status-badge.fresh {
    background: #d1ecf1;
    color: #0c5460;
  }

  .status-badge.stale {
    background: #fff3cd;
    color: #856404;
  }

  .stats-panel,
  .filters-panel,
  .crud-panel,
  .posts-display,
  .tech-info {
    background: white;
    border: 1px solid #dee2e6;
    border-radius: 8px;
    margin-bottom: 1.5rem;
    overflow: hidden;
  }

  .stats-panel h3,
  .filters-panel h3,
  .crud-panel h3,
  .posts-display h3,
  .tech-info h3 {
    background: #495057;
    color: white;
    margin: 0;
    padding: 1rem 1.5rem;
    font-size: 1rem;
    font-weight: 600;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 1rem;
    padding: 1.5rem;
  }

  .stat-card {
    text-align: center;
    padding: 1rem;
    background: #f8f9fa;
    border-radius: 6px;
  }

  .stat-number {
    font-size: 2rem;
    font-weight: bold;
    color: #007bff;
    margin-bottom: 0.25rem;
  }

  .stat-label {
    font-size: 0.875rem;
    color: #6c757d;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .filters-form {
    padding: 1.5rem;
    display: flex;
    gap: 1rem;
    align-items: end;
    flex-wrap: wrap;
  }

  .filter-group {
    min-width: 150px;
  }

  .filter-group label {
    display: block;
    font-weight: 500;
    color: #495057;
    margin-bottom: 0.5rem;
  }

  .filter-group select,
  .form-group input,
  .form-group textarea {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #ced4da;
    border-radius: 4px;
    font-size: 0.9rem;
    box-sizing: border-box;
  }

  .filter-actions {
    display: flex;
    gap: 0.5rem;
  }

  .panel-header {
    background: #495057;
    color: white;
    padding: 1rem 1.5rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .panel-header h3 {
    margin: 0;
    background: none;
    padding: 0;
    color: inherit;
  }

  .create-form {
    padding: 1.5rem;
    background: #f8f9fa;
  }

  .form-group {
    margin-bottom: 1rem;
  }

  .form-group label {
    display: block;
    font-weight: 500;
    color: #495057;
    margin-bottom: 0.5rem;
  }

  .form-actions {
    margin-top: 1rem;
  }

  .posts-header {
    padding: 1.5rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #dee2e6;
  }

  .posts-header h3 {
    margin: 0;
    background: none;
    padding: 0;
    color: #495057;
  }

  .results-info {
    font-size: 0.9rem;
    color: #6c757d;
  }

  .filter-indicator {
    background: #fff3cd;
    color: #856404;
    padding: 0.125rem 0.5rem;
    border-radius: 10px;
    font-size: 0.75rem;
    margin-left: 0.5rem;
  }

  .loading-state,
  .empty-state {
    padding: 3rem;
    text-align: center;
    color: #6c757d;
    font-style: italic;
  }

  .posts-grid {
    display: grid;
    gap: 1rem;
    padding: 1.5rem;
  }

  .post-item {
    border: 1px solid #e9ecef;
    border-radius: 6px;
    padding: 1rem;
    background: #fefefe;
    transition: box-shadow 0.2s ease;
  }

  .post-item:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .post-item.featured {
    border-left: 4px solid #ffc107;
  }

  .post-header {
    margin-bottom: 0.75rem;
  }

  .post-title {
    margin: 0 0 0.5rem 0;
    color: #212529;
    font-size: 1.1rem;
    line-height: 1.3;
  }

  .post-meta {
    display: flex;
    align-items: center;
    gap: 1rem;
    font-size: 0.85rem;
    color: #6c757d;
    flex-wrap: wrap;
  }

  .badges {
    display: flex;
    gap: 0.5rem;
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
    padding: 0.125rem 0.5rem;
    border-radius: 10px;
    font-size: 0.75rem;
    font-weight: 500;
    text-transform: uppercase;
  }

  .post-excerpt {
    color: #495057;
    line-height: 1.4;
    margin: 0 0 0.75rem 0;
  }

  .post-tags {
    display: flex;
    gap: 0.25rem;
    margin-bottom: 0.75rem;
    flex-wrap: wrap;
  }

  .tag {
    background: #e9ecef;
    color: #495057;
    padding: 0.125rem 0.5rem;
    border-radius: 10px;
    font-size: 0.75rem;
    font-weight: 500;
  }

  .post-actions {
    display: flex;
    gap: 0.5rem;
  }

  .tech-info {
    background: #f8f9fa;
  }

  .tech-details {
    padding: 1.5rem;
  }

  .tech-details p {
    margin: 0 0 1rem 0;
    line-height: 1.5;
  }

  .tech-details ul {
    margin: 0 0 1.5rem 0;
    padding-left: 1.5rem;
  }

  .tech-details li {
    margin-bottom: 0.5rem;
    line-height: 1.4;
  }

  .tech-details code {
    background: #e9ecef;
    padding: 0.125rem 0.25rem;
    border-radius: 3px;
    font-size: 0.875rem;
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
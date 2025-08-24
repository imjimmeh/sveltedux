<script lang="ts">
  import PostsEntityDemo from "$lib/components/PostsEntityDemo.svelte";
</script>

<svelte:head>
  <title>Entity Adapter Demo - SvelteDux</title>
  <meta name="description" content="Demonstration of Entity Adapter features in SvelteDux" />
</svelte:head>

<div class="page-container">
  <div class="page-header">
    <h1>🏗️ Entity Adapter Demo</h1>
    <p class="page-description">
      This page demonstrates the powerful <strong>Entity Adapter</strong> functionality 
      from the SvelteDux library. Entity adapters provide normalized state management 
      with automatic CRUD operations, memoized selectors, and advanced filtering capabilities.
    </p>
    
    <div class="demo-links">
      <a href="/" class="link">← Back to Main Demo</a>
      <a href="https://github.com/your-repo/docs/entity-adapter" class="link">📖 Documentation</a>
    </div>
  </div>

  <PostsEntityDemo />

  <div class="implementation-notes">
    <h2>💡 Implementation Notes</h2>
    <div class="notes-grid">
      <div class="note-card">
        <h3>🎯 Key Benefits</h3>
        <ul>
          <li>Normalized entity storage pattern</li>
          <li>Automatic sorting and indexing</li>
          <li>Memoized selectors for performance</li>
          <li>Built-in CRUD operations</li>
          <li>Complex filtering capabilities</li>
          <li>Optimistic update support</li>
        </ul>
      </div>
      
      <div class="note-card">
        <h3>🔧 Usage Pattern</h3>
        <pre><code>{`// 1. Create adapter
const adapter = createEntityAdapter<Post>({
  sortComparer: (a, b) => 
    new Date(b.createdAt).getTime() - 
    new Date(a.createdAt).getTime()
});

// 2. Use in slice
const slice = createSlice({
  name: "posts",
  initialState: adapter.getInitialState(),
  reducers: {
    addPost: adapter.addOne,
    setPosts: adapter.setMany,
    // ... other reducers
  }
});

// 3. Create selectors
const selectAllPosts = createSelector(
  (state) => state.posts,
  adapter.selectAll
);`}</code></pre>
      </div>
      
      <div class="note-card">
        <h3>⚡ Performance</h3>
        <ul>
          <li>O(1) lookups by ID</li>
          <li>Memoized selector results</li>
          <li>Minimal re-renders</li>
          <li>Efficient updates</li>
          <li>Automatic denormalization</li>
        </ul>
      </div>
    </div>
  </div>
</div>

<style>
  .page-container {
    min-height: 100vh;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    padding: 2rem 1rem;
  }

  .page-header {
    max-width: 1200px;
    margin: 0 auto 2rem auto;
    text-align: center;
    color: white;
  }

  .page-header h1 {
    font-size: 3rem;
    margin: 0 0 1rem 0;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
  }

  .page-description {
    font-size: 1.2rem;
    line-height: 1.6;
    max-width: 800px;
    margin: 0 auto 2rem auto;
    opacity: 0.95;
  }

  .demo-links {
    display: flex;
    gap: 1rem;
    justify-content: center;
    flex-wrap: wrap;
  }

  .link {
    background: rgba(255, 255, 255, 0.2);
    color: white;
    padding: 0.75rem 1.5rem;
    border-radius: 25px;
    text-decoration: none;
    font-weight: 500;
    transition: all 0.3s ease;
    backdrop-filter: blur(10px);
  }

  .link:hover {
    background: rgba(255, 255, 255, 0.3);
    transform: translateY(-2px);
  }

  .implementation-notes {
    max-width: 1200px;
    margin: 3rem auto 0 auto;
    background: rgba(255, 255, 255, 0.95);
    border-radius: 12px;
    padding: 2rem;
    backdrop-filter: blur(10px);
  }

  .implementation-notes h2 {
    text-align: center;
    margin: 0 0 2rem 0;
    color: #333;
  }

  .notes-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
    gap: 2rem;
  }

  .note-card {
    background: white;
    border: 1px solid #e9ecef;
    border-radius: 8px;
    padding: 1.5rem;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .note-card h3 {
    margin: 0 0 1rem 0;
    color: #495057;
    font-size: 1.1rem;
  }

  .note-card ul {
    margin: 0;
    padding-left: 1.5rem;
  }

  .note-card li {
    margin-bottom: 0.5rem;
    color: #6c757d;
    line-height: 1.4;
  }

  .note-card pre {
    background: #f8f9fa;
    border: 1px solid #e9ecef;
    border-radius: 4px;
    padding: 1rem;
    overflow-x: auto;
    margin: 0;
  }

  .note-card code {
    font-family: 'Monaco', 'Consolas', monospace;
    font-size: 0.85rem;
    line-height: 1.4;
    color: #495057;
  }

  @media (max-width: 768px) {
    .page-header h1 {
      font-size: 2rem;
    }
    
    .page-description {
      font-size: 1rem;
    }
    
    .notes-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
<script lang="ts">
  import UsersList from "$lib/components/UsersList.svelte";
  import PostsList from "$lib/components/PostsList.svelte";
</script>

<main class="container">
  <h1>SvelteDux Demo</h1>
  <p>This demonstrates the SvelteDux Redux-like state management library for Svelte applications.</p>
  
  <div class="demo-links">
    <a href="/entity-demo" class="demo-link">
      <div class="demo-link-icon">🏗️</div>
      <div class="demo-link-content">
        <h3>Entity Adapter Demo</h3>
        <p>Explore normalized state management with entity adapters, memoized selectors, and CRUD operations.</p>
      </div>
    </a>
  </div>
  
  <div class="component-section">
    <UsersList />
  </div>
  
  <div class="component-section">
    <PostsList />
  </div>
</main>

<style>
  .container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  h1 {
    color: #333;
    margin-bottom: 1rem;
  }

  p {
    color: #666;
    margin-bottom: 2rem;
  }

  .demo-links {
    margin-bottom: 2rem;
  }

  .demo-link {
    display: flex;
    align-items: center;
    padding: 1.5rem;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    text-decoration: none;
    border-radius: 12px;
    transition: all 0.3s ease;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }

  .demo-link:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
  }

  .demo-link-icon {
    font-size: 3rem;
    margin-right: 1.5rem;
  }

  .demo-link-content h3 {
    margin: 0 0 0.5rem 0;
    font-size: 1.5rem;
    font-weight: 600;
  }

  .demo-link-content p {
    margin: 0;
    opacity: 0.9;
    line-height: 1.4;
  }

  .component-section {
    margin-bottom: 3rem;
    padding: 2rem;
    border: 1px solid #eee;
    border-radius: 8px;
    background: #f9f9f9;
  }
</style>
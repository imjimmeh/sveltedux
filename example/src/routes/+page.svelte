<script lang="ts">
  import UsersList from "$lib/components/UsersList.svelte";
  import PostsList from "$lib/components/PostsList.svelte";
</script>

<main class="container">
  <h1>SvelteDux API Demo</h1>
  <p>This page demonstrates the usage of the API library from SvelteDux.</p>
  
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

  .component-section {
    margin-bottom: 3rem;
    padding: 2rem;
    border: 1px solid #eee;
    border-radius: 8px;
    background: #f9f9f9;
  }
</style>
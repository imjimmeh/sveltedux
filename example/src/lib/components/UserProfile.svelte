<script lang="ts">
  import type { User } from '../example.js';

  interface Props {
    user: User | null;
    isLoading: boolean;
    error: string | null;
    onFetchUser: () => void;
  }

  let { user, isLoading, error, onFetchUser }: Props = $props();
</script>

<div class="user-profile">
  <h3>User Info</h3>
  
  {#if isLoading}
    <div class="loading">
      <p>Loading user...</p>
    </div>
  {:else if error}
    <div class="error">
      <p>Error: {error}</p>
      <button onclick={onFetchUser}>Retry</button>
    </div>
  {:else if user}
    <div class="user-details">
      <div class="user-field">
        <strong>Name:</strong> {user.name}
      </div>
      <div class="user-field">
        <strong>Email:</strong> {user.email}
      </div>
      <div class="user-field">
        <strong>ID:</strong> {user.id}
      </div>
      <button onclick={onFetchUser} class="refresh-btn">
        Refresh User
      </button>
    </div>
  {:else}
    <div class="no-user">
      <p>No user logged in</p>
      <button onclick={onFetchUser} class="fetch-btn">
        Fetch User
      </button>
    </div>
  {/if}
</div>

<style>
  .user-profile {
    padding: 1rem;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    margin-bottom: 1rem;
    background: #f9f9f9;
  }

  .user-profile h3 {
    margin-top: 0;
    color: #333;
    border-bottom: 1px solid #ddd;
    padding-bottom: 0.5rem;
  }

  .loading, .error, .no-user {
    text-align: center;
    padding: 1rem;
  }

  .error {
    color: #d32f2f;
    background: #ffebee;
    border-radius: 4px;
  }

  .user-details {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .user-field {
    padding: 0.25rem 0;
    font-size: 0.9rem;
  }

  .user-field strong {
    color: #555;
    min-width: 60px;
    display: inline-block;
  }

  .refresh-btn, .fetch-btn {
    margin-top: 0.5rem;
    padding: 0.5rem 1rem;
    background: #1976d2;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.9rem;
    transition: background-color 0.2s;
  }

  .refresh-btn:hover, .fetch-btn:hover {
    background: #1565c0;
  }

  .error button {
    background: #d32f2f;
  }

  .error button:hover {
    background: #c62828;
  }

  :global(.dark) .user-profile {
    background: #2a2a2a;
    border-color: #444;
  }

  :global(.dark) .user-profile h3 {
    color: #fff;
    border-bottom-color: #555;
  }

  :global(.dark) .user-field strong {
    color: #ccc;
  }

  :global(.dark) .error {
    background: #4a2c2c;
    color: #ffcdd2;
  }
</style>
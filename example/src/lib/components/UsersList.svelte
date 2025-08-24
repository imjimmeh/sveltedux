<script lang="ts">
  import {
    useGetUsersQuery,
    useCreateUserMutation,
    useDeleteUserMutation,
  } from "../api/hooks.js";
  import type { User } from "$lib/types.js";

  let page = $state(1);
  let limit = $state(5);
  let roleFilter = $state<"all" | "admin" | "user" | "moderator">("all");

    const usersQuery = $derived(
    useGetUsersQuery({
      page,
      limit,
      role: roleFilter === "all" ? undefined : roleFilter,
    })
  );

  const createUser = useCreateUserMutation();
  const deleteUser = useDeleteUserMutation();

  let showCreateForm = $state(false);
  let newUser = $state({
    name: "",
    email: "",
    username: "",
    role: "user" as const,
    bio: "",
  });

  function handleCreateUser() {
    if (newUser.name && newUser.email && newUser.username) {
      createUser(newUser);
      newUser = { name: "", email: "", username: "", role: "user", bio: "" };
      showCreateForm = false;
    }
  }

  function handleDeleteUser(userId: number) {
    deleteUser(userId);
  }

  function nextPage() {
    if (usersQuery.data?.meta && page < usersQuery.data.meta.totalPages) {
      page++;
    }
  }

  function prevPage() {
    if (page > 1) {
      page--;
    }
  }
</script>

<div class="users-section">
  <div class="section-header">
    <h2>Users Management</h2>
    <button
      onclick={() => (showCreateForm = !showCreateForm)}
      class="btn btn-primary"
    >
      {showCreateForm ? "Cancel" : "Add User"}
    </button>
  </div>

  {#if showCreateForm}
    <div class="create-form">
      <h3>Create New User</h3>
      <div class="form-grid">
        <div class="form-group">
          <label>
            Name:
            <input
              type="text"
              bind:value={newUser.name}
              placeholder="Full name"
            />
          </label>
        </div>
        <div class="form-group">
          <label>
            Email:
            <input
              type="email"
              bind:value={newUser.email}
              placeholder="email@example.com"
            />
          </label>
        </div>
        <div class="form-group">
          <label>
            Username:
            <input
              type="text"
              bind:value={newUser.username}
              placeholder="username"
            />
          </label>
        </div>
        <div class="form-group">
          <label>
            Role:
            <select bind:value={newUser.role}>
              <option value="user">User</option>
              <option value="admin">Admin</option>
              <option value="moderator">Moderator</option>
            </select>
          </label>
        </div>
        <div class="form-group full-width">
          <label>
            Bio:
            <textarea
              bind:value={newUser.bio}
              placeholder="User bio (optional)"
              rows="2"
            ></textarea>
          </label>
        </div>
      </div>
      <div class="form-actions">
        <button
          onclick={handleCreateUser}
          class="btn btn-primary"
          disabled={createUser.isLoading ||
            !newUser.name ||
            !newUser.email ||
            !newUser.username}
        >
          {createUser.isLoading ? "Creating..." : "Create User"}
        </button>
      </div>
    </div>
  {/if}

  <div class="filters">
    <div class="filter-group">
      <label>
        Role Filter:
        <select bind:value={roleFilter}>
          <option value="all">All Roles</option>
          <option value="admin">Admin</option>
          <option value="user">User</option>
          <option value="moderator">Moderator</option>
        </select>
      </label>
    </div>
    <div class="filter-group">
      <label>
        Per Page:
        <select bind:value={limit}>
          <option value={3}>3</option>
          <option value={5}>5</option>
          <option value={10}>10</option>
        </select>
      </label>
    </div>
  </div>

  {#if usersQuery.isLoading}
    <div class="loading">Loading users...</div>
  {:else if usersQuery.error}
    <div class="error">
      Error loading users: {JSON.stringify(usersQuery.error)}
    </div>
  {:else if usersQuery.data}
    <div class="users-grid">
      {#each usersQuery.data.data as user (user.id)}
        <div class="user-card">
          <div class="user-avatar">
            <img src={user.avatar} alt={user.name} />
          </div>
          <div class="user-info">
            <h3>{user.name}</h3>
            <p class="username">@{user.username}</p>
            <p class="email">{user.email}</p>
            <span class="role role-{user.role}">{user.role}</span>
            {#if user.bio}
              <p class="bio">{user.bio}</p>
            {/if}
          </div>
          <div class="user-actions">
            <button
              onclick={() => handleDeleteUser(user.id)}
              class="btn btn-danger btn-sm"
              disabled={deleteUser.isLoading}
            >
              {deleteUser.isLoading ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      {/each}
    </div>

    <div class="pagination">
      <div class="pagination-info">
        Showing {(page - 1) * limit + 1} to {Math.min(
          page * limit,
          usersQuery.data.meta.total
        )} of {usersQuery.data.meta.total} users
      </div>
      <div class="pagination-controls">
        <button
          onclick={prevPage}
          class="btn btn-outline"
          disabled={page <= 1 || usersQuery.isFetching}
        >
          Previous
        </button>
        <span class="page-info"
          >Page {page} of {usersQuery.data.meta.totalPages}</span
        >
        <button
          onclick={nextPage}
          class="btn btn-outline"
          disabled={page >= usersQuery.data.meta.totalPages ||
            usersQuery.isFetching}
        >
          Next
        </button>
      </div>
      <div class="cache-status">
        Cache: {usersQuery.isFetching ? "Refreshing" : "Fresh"}
        <button onclick={usersQuery.refetch} class="btn btn-sm">Refresh</button>
      </div>
    </div>
  {/if}

  {#if createUser.isSuccess}
    <div class="success">User created successfully!</div>
  {/if}

  {#if deleteUser.isSuccess}
    <div class="success">User deleted successfully!</div>
  {/if}
</div>

<style>
  .users-section {
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

  .form-group input:focus,
  .form-group select:focus,
  .form-group textarea:focus {
    outline: none;
    border-color: #007bff;
    box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
  }

  .form-actions {
    display: flex;
    gap: 1rem;
  }

  .filters {
    display: flex;
    gap: 1rem;
    margin-bottom: 1rem;
    align-items: center;
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

  .users-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .user-card {
    background: white;
    border: 1px solid #dee2e6;
    border-radius: 8px;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    transition: box-shadow 0.2s ease;
  }

  .user-card:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .user-avatar img {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    object-fit: cover;
  }

  .user-info h3 {
    margin: 0;
    color: #212529;
    font-size: 1.1rem;
  }

  .user-info .username {
    margin: 0;
    color: #6c757d;
    font-size: 0.9rem;
  }

  .user-info .email {
    margin: 0;
    color: #495057;
    font-size: 0.85rem;
  }

  .user-info .bio {
    margin: 0.5rem 0 0 0;
    color: #6c757d;
    font-size: 0.85rem;
    font-style: italic;
  }

  .role {
    display: inline-block;
    padding: 0.25rem 0.5rem;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .role-admin {
    background: #e3f2fd;
    color: #1976d2;
  }

  .role-moderator {
    background: #fff3e0;
    color: #f57c00;
  }

  .role-user {
    background: #e8f5e8;
    color: #388e3c;
  }

  .user-actions {
    margin-top: auto;
  }

  .pagination {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    background: #f8f9fa;
    border-radius: 8px;
    border: 1px solid #dee2e6;
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

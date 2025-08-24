<script lang="ts">
  import { store, actions, selectors } from "./index";
  import { 
    useGetUserQuery, 
    useGetTodosQuery, 
    useAddTodoMutation, 
    useUpdateTodoMutation, 
    useDeleteTodoMutation 
  } from "./api/hooks";
  import UserProfile from "./components/UserProfile.svelte";
  import TodoList from "./components/TodoList.svelte";
  import TodoFilters from "./components/TodoFilters.svelte";
  import TodoStats from "./components/TodoStats.svelte";
  import ThemeToggle from "./components/ThemeToggle.svelte";
  import TodoInput from "./components/TodoInput.svelte";

  // Use API hooks for data fetching
  const userQuery = useGetUserQuery(1);
  const todosQuery = useGetTodosQuery();
  
  // Mutation hooks
  const addTodoMutation = useAddTodoMutation();
  const updateTodoMutation = useUpdateTodoMutation();
  const deleteTodoMutation = useDeleteTodoMutation();

  // Local state for UI
  const state = $derived(store.state);
  const theme = $derived(selectors.ui.getTheme(state));
  
  // Derived values from API data
  const currentUser = $derived(userQuery.data);
  const isUserLoading = $derived(userQuery.isLoading);
  const userError = $derived(userQuery.error);
  
  const todos = $derived(todosQuery.data || []);
  const visibleTodos = $derived(
    todos.filter(todo => {
      const filter = state.todos.filter;
      if (filter === "active") return !todo.completed;
      if (filter === "completed") return todo.completed;
      return true;
    })
  );
  
  const todoStats = $derived({
    total: todos.length,
    completed: todos.filter(t => t.completed).length,
    active: todos.filter(t => !t.completed).length,
  });

  async function addTodo(text: string) {
    try {
      await addTodoMutation({ text });
    } catch (error) {
      console.error('Failed to add todo:', error);
    }
  }

  async function toggleTodo(id: number) {
    const todo = todos.find(t => t.id === id);
    if (todo) {
      try {
        await updateTodoMutation({ 
          id, 
          completed: !todo.completed 
        });
      } catch (error) {
        console.error('Failed to toggle todo:', error);
      }
    }
  }

  async function removeTodo(id: number) {
    try {
      await deleteTodoMutation(id);
    } catch (error) {
      console.error('Failed to remove todo:', error);
    }
  }

  function setFilter(filter: "all" | "active" | "completed") {
    store.dispatch(actions.todos.setFilter(filter));
  }

  function toggleTheme() {
    store.dispatch(actions.ui.toggleTheme());
  }

  function toggleSidebar() {
    store.dispatch(actions.ui.toggleSidebar());
  }

  function fetchUser() {
    userQuery.refetch();
  }

  function fetchTodos() {
    todosQuery.refetch();
  }
</script>

<div class="app" class:dark={theme === "dark"}>
  <header>
    <h1>🚀 Redux-esque Todo App</h1>
    <ThemeToggle
      {theme}
      sidebarOpen={state.ui.sidebarOpen}
      onToggleTheme={toggleTheme}
      onToggleSidebar={toggleSidebar}
    />
  </header>

  <div class="content">
    {#if state.ui.sidebarOpen}
      <aside class="sidebar">
        <UserProfile
          user={currentUser}
          isLoading={isUserLoading}
          error={userError}
          onFetchUser={fetchUser}
        />

        <TodoStats stats={todoStats} />
      </aside>
    {/if}

    <main class="main-content">
      <TodoInput onAddTodo={addTodo} />

      <TodoFilters
        currentFilter={state.todos.filter}
        onSetFilter={setFilter}
        onRefresh={fetchTodos}
      />

      <TodoList
        todos={visibleTodos || []}
        onToggleTodo={toggleTodo}
        onRemoveTodo={removeTodo}
      />
    </main>
  </div>
</div>

<style>
  .app {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
      sans-serif;
    min-height: 100vh;
    transition: all 0.3s ease;
    background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  }

  .app.dark {
    background: linear-gradient(135deg, #1a1a1a 0%, #2d3748 100%);
    color: #ffffff;
  }

  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem 2rem;
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
    border-bottom: 1px solid rgba(255, 255, 255, 0.2);
    position: sticky;
    top: 0;
    z-index: 100;
  }

  .dark header {
    background: rgba(0, 0, 0, 0.2);
    border-bottom-color: rgba(255, 255, 255, 0.1);
  }

  header h1 {
    margin: 0;
    font-size: 1.8rem;
    font-weight: 700;
    background: linear-gradient(45deg, #007bff, #6610f2);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .dark header h1 {
    background: linear-gradient(45deg, #4dabf7, #8e54e9);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .content {
    display: flex;
    min-height: calc(100vh - 100px);
    max-width: 1400px;
    margin: 0 auto;
    padding: 2rem;
    gap: 2rem;
  }

  .sidebar {
    width: 350px;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    height: fit-content;
    position: sticky;
    top: 120px;
  }

  .main-content {
    flex: 1;
    max-width: 800px;
    margin: 0 auto;
  }

  @media (max-width: 1024px) {
    .content {
      flex-direction: column;
      padding: 1rem;
    }

    .sidebar {
      width: 100%;
      position: static;
      order: 2;
    }

    .main-content {
      order: 1;
      max-width: none;
    }
  }

  @media (max-width: 640px) {
    header {
      padding: 1rem;
      flex-direction: column;
      gap: 1rem;
    }

    header h1 {
      font-size: 1.5rem;
    }

    .content {
      padding: 0.5rem;
      gap: 1rem;
    }
  }
</style>

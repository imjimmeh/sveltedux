# Getting Started

This guide will help you get up and running with the Redux-Esque state management library for Svelte 5.

## Installation

```bash
npm install sveltekitlibrary
```

## Quick Start

### 1. Define your store

```typescript
// store.ts
import {
  createSvelteStore,
  combineReducers,
  createSlice,
  applyMiddleware,
  thunkMiddleware,
} from "sveltekitlibrary/redux";
import { createAsyncThunk } from "sveltekitlibrary/redux/async";

// Define your state types
interface User {
  id: number;
  name: string;
  email: string;
}

interface Todo {
  id: number;
  text: string;
  completed: boolean;
}

interface AppState {
  user: User | null;
  todos: Todo[];
  loading: boolean;
}

// Create async actions
const fetchUser = createAsyncThunk<User, number>(
  "user/fetchUser",
  async (userId) => {
    const response = await fetch(`/api/users/${userId}`);
    return response.json();
  }
);

// Create slices
const userSlice = createSlice({
  name: "user",
  initialState: null as User | null,
  reducers: {
    clearUser: () => null,
  },
  extraReducers: (builder) => {
    builder.addCase(fetchUser.fulfilled, (state, action) => action.payload);
  },
});

const todosSlice = createSlice({
  name: "todos",
  initialState: [] as Todo[],
  reducers: {
    addTodo: (state, action) => {
      state.push({
        id: Date.now(),
        text: action.payload.text,
        completed: false,
      });
    },
    toggleTodo: (state, action) => {
      const todo = state.find((t) => t.id === action.payload.id);
      if (todo) {
        todo.completed = !todo.completed;
      }
    },
    removeTodo: (state, action) => {
      return state.filter((t) => t.id !== action.payload.id);
    },
  },
});

// Combine reducers
const rootReducer = combineReducers<AppState>({
  user: userSlice.reducer,
  todos: todosSlice.reducer,
  loading: (state = false, action) => {
    if (action.type === fetchUser.pending) return true;
    if (
      action.type === fetchUser.fulfilled ||
      action.type === fetchUser.rejected
    )
      return false;
    return state;
  },
});

// Create store with middleware
const store = createSvelteStore(
  rootReducer,
  undefined,
  applyMiddleware(thunkMiddleware)
);

// Export store and actions
export { store };
export const actions = {
  user: { ...userSlice.actions, fetchUser },
  todos: todosSlice.actions,
};
```

### 2. Use in your Svelte components

```svelte
<!-- App.svelte -->
<script lang="ts">
  import { store, actions } from './store';

  // Access state reactively
  let user = $derived(store.state.user);
  let todos = $derived(store.state.todos);
  let loading = $derived(store.state.loading);

  // Dispatch actions
  function addUser(text) {
    store.dispatch(actions.todos.addTodo({ text }));
  }

  function toggleTodo(id) {
    store.dispatch(actions.todos.toggleTodo({ id }));
  }

  function loadUser() {
    store.dispatch(actions.user.fetchUser(1));
  }
</script>

<div>
  <h1>Svelte Redux-Esque App</h1>

  {#if loading}
    <p>Loading user...</p>
  {:else if user}
    <h2>Welcome, {user.name}!</h2>
  {:else}
    <button on:click={loadUser}>Load User</button>
  {/if}

  <div>
    <h3>Todos</h3>
    <ul>
      {#each todos as todo}
        <li>
          <input
            type="checkbox"
            checked={todo.completed}
            on:change={() => toggleTodo(todo.id)}
          />
          <span class:completed={todo.completed}>{todo.text}</span>
        </li>
      {/each}
    </ul>
    <input placeholder="Add todo" on:keydown|enter={(e) => {
      if (e.target.value) {
        addUser(e.target.value);
        e.target.value = '';
      }
    }} />
  </div>
</div>

<style>
  .completed {
    text-decoration: line-through;
    opacity: 0.6;
  }
</style>
```

## Next Steps

Now that you have the basic setup, you can explore:

- [API Reference](./api-reference/store.md) - Learn about all available functions
- [Async State Management](./guides/async-state-management.md) - Handle API calls and async operations
- [Selectors](./api-reference/selectors.md) - Create memoized selectors for performance
- [Middleware](./api-reference/middleware.md) - Add logging, thunk support, and custom middleware

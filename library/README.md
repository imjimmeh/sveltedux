# Redux-Esque State Management Library for Svelte 5

A full-featured Redux-like state management solution for Svelte 5 with runes support. This library provides a familiar Redux API while leveraging Svelte 5's reactivity system for optimal performance.

## 📚 Documentation

The complete documentation has been reorganized into separate files for better navigation and maintainability. Please refer to the documentation in the [`docs/`](./docs/) folder:

### 🚀 Getting Started

- [Getting Started Guide](./docs/getting-started.md) - Installation and quick start guide
- [API Reference](./docs/api-reference/) - Complete API documentation
- [TypeScript Support](./docs/typescript.md) - TypeScript integration guide

### 📖 Guides

- [Async State Management](./docs/guides/async-state-management.md) - Handle async operations
- [API Data Fetching](./docs/guides/api-data-fetching.md) - API integration patterns
- [Advanced Patterns](./docs/guides/advanced-patterns.md) - Complex patterns and techniques
- [State Persistence](./docs/guides/state-persistence.md) - localStorage/sessionStorage integration

### 🛠️ Best Practices

- [Best Practices](./docs/best-practices.md) - Recommended patterns and practices
- [Comparison with Redux](./docs/comparison.md) - How this library compares to Redux
- [Contributing Guide](./docs/contributing.md) - Guidelines for contributing

## ✨ Features

- **Redux-like API**: Familiar patterns for developers coming from Redux
- **Svelte 5 Runes Integration**: Built specifically for Svelte 5's reactivity system
- **TypeScript Support**: Full TypeScript support with comprehensive type definitions
- **Async Actions**: Built-in support for async operations with `createAsyncThunk`
- **API Data Fetching**: Simple `{ data, loading, error }` pattern for API calls
- **Middleware**: Middleware support for logging, thunk, and custom middleware
- **Selectors**: Memoized selectors for efficient state derivation
- **DevTools**: Logger middleware for action logging
- **Utilities**: Immutability helpers, action creators, and more
- **State Persistence**: Built-in localStorage/sessionStorage integration

## 📦 Installation

```bash
npm install sveltekitlibrary
```

## 🚀 Quick Start

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

## 📖 Complete Documentation

For detailed information about all features, API reference, and advanced patterns, please visit the [documentation](./docs/README.md).

## 🎯 Key Concepts

### Store

- [`createStore()`](./docs/api-reference/store.md) - Standard Redux store
- [`createSvelteStore()`](./docs/api-reference/store.md) - Svelte-optimized store with reactive state access

### Actions

- [`createAction()`](./docs/api-reference/actions.md) - Create action creators
- [`createActions()`](./docs/api-reference/actions.md) - Create multiple action creators
- [`createAsyncThunk()`](./docs/api-reference/actions.md) - Handle async operations

### Reducers

- [`createReducer()`](./docs/api-reference/reducers.md) - Create reducer functions
- [`combineReducers()`](./docs/api-reference/reducers.md) - Combine multiple reducers
- [`createSlice()`](./docs/api-reference/reducers.md) - Create state slices with actions

### Selectors

- [`createSelector()`](./docs/api-reference/selectors.md) - Create memoized selectors
- [`createStructuredSelector()`](./docs/api-reference/selectors.md) - Create structured selectors

### Middleware

- [`applyMiddleware()`](./docs/api-reference/middleware.md) - Apply middleware to store
- [`thunkMiddleware`](./docs/api-reference/middleware.md) - Handle async operations
- [`loggerMiddleware`](./docs/api-reference/middleware.md) - Log actions and state changes

### Utilities

- [`bindActionCreators()`](./docs/api-reference/utilities.md) - Bind action creators to dispatch
- [`shallowEqual()`](./docs/api-reference/utilities.md) - Shallow equality check
- [`produce()`](./docs/api-reference/utilities.md) - Immutability helper

## 🚀 Advanced Features

### Async State Management

- Handle API calls and async operations
- Automatic loading and error state management
- [Learn more](./docs/guides/async-state-management.md)

### State Persistence

- Built-in localStorage/sessionStorage integration
- SSR-safe persistence
- [Learn more](./docs/guides/state-persistence.md)

### TypeScript Support

- Full TypeScript support with comprehensive type definitions
- Type-safe actions, reducers, and selectors
- [Learn more](./docs/typescript.md)

## 🛠️ Best Practices

- Use `createSlice` for most reducer creation
- Keep state minimal and focused
- Use selectors for derived state
- Handle errors properly in async operations
- Use `createSvelteStore` for Svelte components
- [Read best practices](./docs/best-practices.md)

## 🔄 Comparison with Redux

| Feature        | Redux               | Redux-Esque (Svelte 5)  |
| -------------- | ------------------- | ----------------------- |
| State Updates  | Immutable           | Svelte Runes            |
| Reactivity     | Manual subscription | Automatic with runes    |
| Bundle Size    | Larger              | Smaller                 |
| Learning Curve | Steeper             | Familiar to Redux users |
| Performance    | Good                | Optimized for Svelte    |

[Learn more about the differences](./docs/comparison.md)

## 🤝 Contributing

Contributions are welcome! Please read our [contributing guidelines](./docs/contributing.md) before submitting pull requests.

## 📄 License

MIT

## 🚀 Quick Links

- [Getting Started](./docs/getting-started.md)
- [API Reference](./docs/api-reference/store.md)
- [Async State Management](./docs/guides/async-state-management.md)
- [API Data Fetching](./docs/guides/api-data-fetching.md)
- [State Persistence](./docs/guides/state-persistence.md)
- [Best Practices](./docs/best-practices.md)
- [Comparison with Redux](./docs/comparison.md)
- [Contributing](./docs/contributing.md)

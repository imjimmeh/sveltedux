# Best Practices

This guide covers recommended patterns and practices for building robust and maintainable applications with the Redux-Esque state management library.

## Core Principles

### 1. Keep State Minimal

Only store in state what is necessary for rendering the UI and business logic. Avoid storing derived data, UI state, or temporary values in the global state.

```typescript
// Good: Minimal state
interface AppState {
  user: User | null;
  todos: Todo[];
  settings: Settings;
}

// Bad: Bloated state with derived data
interface BadAppState {
  user: User | null;
  todos: Todo[];
  settings: Settings;
  todoCount: number; // Derived from todos
  filteredTodos: Todo[]; // Derived from todos and filter
  loading: boolean;
  error: string | null;
  lastUpdated: Date;
  // ... lots of other derived state
}
```

### 2. Normalize State Structure

Keep your state flat for better performance and easier updates. Use entity-based patterns for related data.

```typescript
// Good: Normalized state
interface NormalizedState {
  entities: {
    users: { [id: string]: User };
    todos: { [id: string]: Todo };
    comments: { [id: string]: Comment };
  };
  results: {
    users: string[];
    todos: string[];
    comments: string[];
  };
}

// Bad: Nested state
interface BadState {
  currentUser: User | null;
  userTodos: Todo[];
  userComments: Comment[];
  // Hard to update and maintain
}
```

### 3. Use createSlice for Most Cases

`createSlice` is the recommended way to create reducers and actions together. It provides better organization and reduces boilerplate.

```typescript
// Good: Using createSlice
const todoSlice = createSlice({
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
  },
});

// Bad: Manual reducer creation
const ADD_TODO = "ADD_TODO";
const TOGGLE_TODO = "TOGGLE_TODO";

const todoReducer = createReducer([] as Todo[], {
  [ADD_TODO]: (state, action) => {
    state.push({
      id: Date.now(),
      text: action.payload.text,
      completed: false,
    });
  },
  [TOGGLE_TODO]: (state, action) => {
    const todo = state.find((t) => t.id === action.payload.id);
    if (todo) {
      todo.completed = !todo.completed;
    }
  },
});
```

## State Management Patterns

### 1. Use Selectors for Derived State

Create memoized selectors for computed state to prevent unnecessary re-renders and centralize business logic.

```typescript
// Good: Memoized selectors
const selectTodos = (state: AppState) => state.todos;
const selectFilter = (state: AppState) => state.filter;

const selectVisibleTodos = createSelector(
  selectTodos,
  selectFilter,
  (todos, filter) => {
    switch (filter) {
      case "active":
        return todos.filter((todo) => !todo.completed);
      case "completed":
        return todos.filter((todo) => todo.completed);
      default:
        return todos;
    }
  }
);

// In component
let visibleTodos = $derived(selectVisibleTodos(store.state));

// Bad: Inline computed values
let visibleTodos = $derived(
  store.state.todos.filter((todo) => {
    switch (store.state.filter) {
      case "active":
        return !todo.completed;
      case "completed":
        return todo.completed;
      default:
        return true;
    }
  })
);
```

### 2. Handle Async Operations Properly

Use `createAsyncThunk` for async operations and handle all three states (pending, fulfilled, rejected).

```typescript
// Good: Complete async handling
const fetchUser = createAsyncThunk<User, number>(
  "user/fetchUser",
  async (userId, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/users/${userId}`);
      if (!response.ok) {
        return rejectWithValue(`Failed to fetch user: ${response.status}`);
      }
      return response.json();
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const userSlice = createSlice({
  name: "user",
  initialState: {
    data: null as User | null,
    loading: false,
    error: null as string | null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUser.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
        state.error = null;
      })
      .addCase(fetchUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? "An unknown error occurred";
      });
  },
});

// Bad: Incomplete async handling
const badFetchUser = createAsyncThunk<User, number>(
  "user/fetchUser",
  async (userId) => {
    const response = await fetch(`/api/users/${userId}`);
    return response.json();
  }
);

// Missing error handling and loading states
```

### 3. Use Immutability Correctly

Always return new objects/arrays when state changes. Never mutate state directly.

```typescript
// Good: Immutable updates
const todosReducer = createReducer([] as Todo[], {
  ADD_TODO: (state, action) => [
    ...state,
    {
      id: Date.now(),
      text: action.payload.text,
      completed: false,
    },
  ],
  TOGGLE_TODO: (state, action) =>
    state.map((todo) =>
      todo.id === action.payload.id
        ? { ...todo, completed: !todo.completed }
        : todo
    ),
  REMOVE_TODO: (state, action) =>
    state.filter((todo) => todo.id !== action.payload.id),
});

// Bad: Direct mutation
const badTodosReducer = createReducer([] as Todo[], {
  ADD_TODO: (state, action) => {
    state.push({
      // Mutating state!
      id: Date.now(),
      text: action.payload.text,
      completed: false,
    });
  },
});
```

## Component Integration

### 1. Use createSvelteStore for Svelte Components

Use `createSvelteStore` for better integration with Svelte 5's reactivity system.

```typescript
// Good: Svelte-aware store
const store = createSvelteStore(rootReducer, initialState);

// In component
<script lang="ts">
  let user = $derived(store.state.user); let todos =
  $derived(store.state.todos);
</script>;

// Bad: Regular store
const store = createStore(rootReducer, initialState);

// In component - less reactive
<script lang="ts">
  let user = store.getState().user; let todos = store.getState().todos;
</script>;
```

### 2. Use Derived for Computed Values

Use Svelte 5's `$derived` rune for computed values in components.

```typescript
// Good: Using derived
<script lang="ts">
  let user = $derived(store.state.user);
  let todos = $derived(store.state.todos);
  let completedCount = $derived(todos.filter(todo => todo.completed).length);
  let totalCount = $derived(todos.length);
</script>

// Bad: Manual computation
<script lang="ts">
  let user = $derived(store.state.user);
  let todos = $derived(store.state.todos);
  let completedCount = 0;
  let totalCount = 0;

  $: {
    completedCount = todos.filter(todo => todo.completed).length;
    totalCount = todos.length;
  }
</script>
```

### 3. Use Selectors for Component Logic

Extract component logic into selectors for better reusability and testability.

```typescript
// Good: Component selectors
const todoSelectors = {
  getVisibleTodos: createSelector(
    (state: AppState) => state.todos,
    (state: AppState) => state.filter,
    (todos, filter) => {
      switch (filter) {
        case 'active': return todos.filter(todo => !todo.completed);
        case 'completed': return todos.filter(todo => todo.completed);
        default: return todos;
      }
    }
  ),

  getTodoStats: createSelector(
    (state: AppState) => state.todos,
    (todos) => ({
      total: todos.length,
      completed: todos.filter(todo => todo.completed).length,
      active: todos.filter(todo => !todo.completed).length,
    })
  ),
};

// In component
<script lang="ts">
  let visibleTodos = $derived(todoSelectors.getVisibleTodos(store.state));
  let todoStats = $derived(todoSelectors.getTodoStats(store.state));
</script>

// Bad: Inline component logic
<script lang="ts">
  let visibleTodos = $derived(
    store.state.todos.filter(todo => {
      switch (store.state.filter) {
        case 'active': return !todo.completed;
        case 'completed': return todo.completed;
        default: return true;
      }
    })
  );

  let todoStats = $derived({
    total: store.state.todos.length,
    completed: store.state.todos.filter(todo => todo.completed).length,
    active: store.state.todos.filter(todo => !todo.completed).length,
  });
</script>
```

## Error Handling

### 1. Handle Errors at All Levels

Handle errors at the API level, async thunk level, and reducer level.

```typescript
// Good: Comprehensive error handling
const fetchUser = createAsyncThunk<User, number, { rejectValue: string }>(
  "user/fetchUser",
  async (userId, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/users/${userId}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return rejectWithValue(
          errorData.message || `HTTP error! status: ${response.status}`
        );
      }
      return response.json();
    } catch (error) {
      return rejectWithValue(error.message || "Network error occurred");
    }
  }
);

const userSlice = createSlice({
  name: "user",
  initialState: {
    data: null as User | null,
    loading: false,
    error: null as string | null,
  },
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUser.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
        state.error = null;
      })
      .addCase(fetchUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "An unknown error occurred";
      });
  },
});

// Bad: No error handling
const badFetchUser = createAsyncThunk<User, number>(
  "user/fetchUser",
  async (userId) => {
    const response = await fetch(`/api/users/${userId}`);
    return response.json();
  }
);
```

### 2. Use Error Boundaries

Implement error boundaries to handle errors gracefully.

```typescript
// Global error slice
const errorSlice = createSlice({
  name: "error",
  initialState: {
    globalError: null as string | null,
    errors: [] as string[],
  },
  reducers: {
    setGlobalError: (state, action) => {
      state.globalError = action.payload;
    },
    addError: (state, action) => {
      state.errors.push(action.payload);
    },
    clearErrors: (state) => {
      state.globalError = null;
      state.errors = [];
    },
  },
});

// Error boundary component
<script lang="ts">
  import { store } from './store';
  import { errorSelectors } from './selectors';

  let hasError = $derived(errorSelectors.hasError(store.state));
  let errorMessage = $derived(errorSelectors.getErrorMessage(store.state));
</script>

{#if hasError}
  <div class="error-boundary">
    <h2>Error</h2>
    <p>{errorMessage}</p>
    <button on:click={() => store.dispatch(actions.clearErrors)}>
      Clear Error
    </button>
  </div>
{:else}
  <slot />
{/if}
```

## Performance Optimization

### 1. Use Memoization Wisely

Use memoized selectors for expensive computations but avoid over-memoization for simple operations.

```typescript
// Good: Memoizing expensive operations
const selectExpensiveComputation = createSelector(
  (state: AppState) => state.largeDataSet,
  (data) => {
    // Expensive computation
    return data.map((item) => ({
      ...item,
      processed: expensiveOperation(item),
    }));
  }
);

// Bad: Over-memoizing simple operations
const selectSimpleOperation = createSelector(
  (state: AppState) => state.counter,
  (counter) => counter + 1 // Simple operation, no need for memoization
);
```

### 2. Use Selectors for Component Props

Create selectors that accept component props for dynamic filtering.

```typescript
// Good: Parameterized selectors
const selectFilteredTodos = createSelector(
  (state: AppState) => state.todos,
  (state, props: { filter: 'all' | 'active' | 'completed' }) => props.filter,
  (todos, filter) => {
    switch (filter) {
      case 'active': return todos.filter(todo => !todo.completed);
      case 'completed': return todos.filter(todo => todo.completed);
      default: return todos;
    }
  }
);

// In component
<script lang="ts">
  let filter = $derived('active');
  let filteredTodos = $derived(selectFilteredTodos(store.state, { filter }));
</script>

// Bad: Hard-coded filters
<script lang="ts">
  let filteredTodos = $derived(
    store.state.todos.filter(todo => todo.completed) // Hard-coded
  );
</script>
```

### 3. Use Batch Updates for Multiple Changes

When making multiple state changes, consider batching them to reduce re-renders.

```typescript
// Good: Batch updates
const batchSlice = createSlice({
  name: "batch",
  initialState: {
    pendingUpdates: [] as any[],
    isBatching: false,
  },
  reducers: {
    startBatch: (state) => {
      state.isBatching = true;
    },
    addBatchUpdate: (state, action) => {
      state.pendingUpdates.push(action.payload);
    },
    commitBatch: (state) => {
      state.isBatching = false;
      // Process all updates at once
      state.pendingUpdates.forEach((update) => {
        // Apply update logic
      });
      state.pendingUpdates = [];
    },
  },
});

// Usage
store.dispatch(actions.startBatch());
store.dispatch(
  actions.addBatchUpdate({ type: "ADD_TODO", payload: { text: "Todo 1" } })
);
store.dispatch(
  actions.addBatchUpdate({ type: "ADD_TODO", payload: { text: "Todo 2" } })
);
store.dispatch(actions.commitBatch());
```

## Testing

### 1. Test Selectors

Test selectors to ensure they return the correct computed values.

```typescript
// selectors.test.ts
import { selectVisibleTodos } from "./selectors";
import { mockState } from "./test-utils";

describe("Selectors", () => {
  it("should return visible todos", () => {
    const state = mockState({
      todos: [
        { id: 1, text: "Todo 1", completed: false },
        { id: 2, text: "Todo 2", completed: true },
      ],
      filter: "active",
    });

    const result = selectVisibleTodos(state);

    expect(result).toEqual([{ id: 1, text: "Todo 1", completed: false }]);
  });
});
```

### 2. Test Async Thunks

Test async thunks to ensure they handle success and error cases properly.

```typescript
// asyncActions.test.ts
import { fetchUser } from "./asyncActions";
import { createAsyncThunk } from "sveltekitlibrary/redux/async";

describe("Async Actions", () => {
  it("should fetch user successfully", async () => {
    const thunk = fetchUser(1);
    const dispatch = jest.fn();
    const getState = jest.fn();

    // Mock fetch
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 1, name: "John" }),
    });

    const result = await thunk(dispatch, getState, {});

    expect(result.payload).toEqual({ id: 1, name: "John" });
  });

  it("should handle fetch error", async () => {
    const thunk = fetchUser(1);
    const dispatch = jest.fn();
    const getState = jest.fn();

    // Mock fetch error
    global.fetch = jest.fn().mockRejectedValue(new Error("Network error"));

    const result = await thunk(dispatch, getState, {});

    expect(result.meta.rejected).toBe(true);
    expect(result.payload).toBe("Network error");
  });
});
```

### 3. Test Middleware

Test middleware to ensure it intercepts and transforms actions correctly.

```typescript
// middleware.test.ts
import { loggerMiddleware } from "./middleware";
import { type Middleware } from "sveltekitlibrary/redux";

describe("Middleware", () => {
  it("should log actions and state", () => {
    const next = jest.fn();
    const dispatch = jest.fn();
    const getState = jest.fn(() => ({ counter: 1 }));

    const logger = loggerMiddleware({ dispatch, getState })(next);

    const action = { type: "INCREMENT", payload: 1 };
    logger(action);

    expect(console.log).toHaveBeenCalledWith("Dispatching:", action);
    expect(console.log).toHaveBeenCalledWith("Next state:", { counter: 1 });
  });
});
```

## Organization

### 1. Organize Files Logically

Organize your Redux-related files in a logical structure.

```
src/
├── lib/
│   └── redux/
│       ├── actions/
│       │   ├── user.actions.ts
│       │   └── todo.actions.ts
│       ├── reducers/
│       │   ├── user.reducer.ts
│       │   ├── todo.reducer.ts
│       │   └── index.ts
│       ├── selectors/
│       │   ├── user.selectors.ts
│       │   ├── todo.selectors.ts
│       │   └── index.ts
│       ├── middleware/
│       │   ├── logger.middleware.ts
│       │   └── index.ts
│       ├── store/
│       │   ├── index.ts
│       │   └── config.ts
│       ├── types/
│       │   ├── user.types.ts
│       │   ├── todo.types.ts
│       │   └── index.ts
│       └── utils/
│           ├── async.utils.ts
│           └── index.ts
```

### 2. Use Barrel Exports

Use barrel exports to clean up import paths.

```typescript
// reducers/index.ts
export * from "./user.reducer";
export * from "./todo.reducer";

// selectors/index.ts
export * from "./user.selectors";
export * from "./todo.selectors";

// actions/index.ts
export * from "./user.actions";
export * from "./todo.actions";
```

### 3. Separate Concerns

Keep actions, reducers, selectors, and types separate but related.

```typescript
// user.actions.ts
export const fetchUser = createAsyncThunk<User, number>('user/fetchUser', ...);

// user.reducer.ts
export const userSlice = createSlice({
  name: 'user',
  initialState: ...,
  reducers: { ... },
  extraReducers: (builder) => {
    builder.addCase(fetchUser.pending, ...);
    builder.addCase(fetchUser.fulfilled, ...);
    builder.addCase(fetchUser.rejected, ...);
  },
});

// user.selectors.ts
export const userSelectors = {
  getUser: (state: AppState) => state.user,
  isLoading: (state: AppState) => state.loading,
  getError: (state: AppState) => state.error,
};

// user.types.ts
export interface User {
  id: number;
  name: string;
  email: string;
}

export interface UserState {
  user: User | null;
  loading: boolean;
  error: string | null;
}
```

## Common Pitfalls to Avoid

### 1. Don't Put Everything in State

Only put data in state that is needed by multiple components or for business logic.

```typescript
// Bad: UI state in global state
interface BadAppState {
  user: User | null;
  todos: Todo[];
  isSidebarOpen: boolean; // UI state
  currentTheme: 'light' | 'dark'; // UI state
  formErrors: { [field: string]: string }; // Temporary UI state
}

// Good: UI state in local component state
// Component
<script lang="ts">
  let isSidebarOpen = false;
  let currentTheme = 'light';
  let formErrors = {} as { [field: string]: string };
</script>
```

### 2. Don't Overuse Selectors

Use selectors for expensive computations and derived state, but not for simple access.

```typescript
// Good: Selector for expensive computation
const selectExpensiveData = createSelector(
  (state: AppState) => state.largeDataSet,
  (data) => data.map((item) => heavyComputation(item))
);

// Bad: Selector for simple access
const selectUser = createSelector(
  (state: AppState) => state.user,
  (user) => user // Just returns the same value
);
```

### 3. Don't Forget Error Handling

Always handle errors in async operations and provide user feedback.

```typescript
// Bad: No error handling
const badFetchUser = createAsyncThunk<User, number>(
  "user/fetchUser",
  async (userId) => {
    const response = await fetch(`/api/users/${userId}`);
    return response.json();
  }
);

// Good: Complete error handling
const goodFetchUser = createAsyncThunk<User, number, { rejectValue: string }>(
  "user/fetchUser",
  async (userId, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/users/${userId}`);
      if (!response.ok) {
        return rejectWithValue("Failed to fetch user");
      }
      return response.json();
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);
```

### 4. Don't Mutate State

Always return new objects/arrays when updating state.

```typescript
// Bad: Direct mutation
const badReducer = createReducer(initialState, {
  ADD_TODO: (state, action) => {
    state.push({
      // Mutating state!
      id: Date.now(),
      text: action.payload.text,
      completed: false,
    });
  },
});

// Good: Immutable update
const goodReducer = createReducer(initialState, {
  ADD_TODO: (state, action) => [
    ...state,
    {
      id: Date.now(),
      text: action.payload.text,
      completed: false,
    },
  ],
});
```

For more information about specific features, see the relevant guides:

- [API Reference](./api-reference/) - Complete API documentation
- [Async State Management](./guides/async-state-management.md) - Async operations
- [TypeScript Support](./typescript.md) - TypeScript integration

# Advanced Patterns

This guide covers advanced patterns and techniques for building sophisticated applications with the Redux-Esque state management library.

## Complex Selectors

Create complex memoized selectors for efficient data derivation:

```typescript
import { createSelector } from "sveltekitlibrary/redux";

const selectUserTodos = createSelector(
  (state: AppState) => state.todos,
  (state: AppState) => state.currentUser?.id,
  (todos, userId) => todos.filter((todo) => todo.userId === userId)
);

const selectUserTodoStats = createSelector(selectUserTodos, (userTodos) => ({
  total: userTodos.length,
  completed: userTodos.filter((t) => t.completed).length,
  pending: userTodos.filter((t) => !t.completed).length,
}));
```

### Nested Selectors

```typescript
import { createSelector } from "sveltekitlibrary/redux";

// Level 1: Basic selectors
const selectUsers = (state) => state.users;
const selectPosts = (state) => state.posts;
const selectComments = (state) => state.comments;

// Level 2: Derived selectors
const selectUserPosts = createSelector(
  selectUsers,
  selectPosts,
  (users, posts) => posts.filter((post) => post.userId in users)
);

const selectPostComments = createSelector(
  selectPosts,
  selectComments,
  (posts, comments) =>
    posts.map((post) => ({
      ...post,
      comments: comments.filter((comment) => comment.postId === post.id),
    }))
);

// Level 3: Complex derived selector
const selectUserPostsWithComments = createSelector(
  selectUsers,
  selectPostComments,
  (users, postsWithComments) =>
    postsWithComments.map((post) => ({
      ...post,
      user: users[post.userId],
      commentCount: post.comments.length,
    }))
);
```

### Parameterized Selectors

```typescript
import { createSelector } from "sveltekitlibrary/redux";

const selectFilteredTodos = createSelector(
  (state) => state.todos,
  (state) => state.filter,
  (state) => state.searchTerm,
  (todos, filter, searchTerm) => {
    let filtered = todos;

    if (searchTerm) {
      filtered = filtered.filter((todo) =>
        todo.text.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filter === "active") {
      filtered = filtered.filter((todo) => !todo.completed);
    } else if (filter === "completed") {
      filtered = filtered.filter((todo) => todo.completed);
    }

    return filtered;
  }
);
```

## Custom Middleware

Create custom middleware for cross-cutting concerns:

```typescript
import { type Middleware } from "sveltekitlibrary/redux";

const customMiddleware: Middleware =
  ({ dispatch, getState }) =>
  (next) =>
  (action) => {
    console.log("Dispatching:", action);
    const result = next(action);
    console.log("Next state:", getState());
    return result;
  };
```

### Timing Middleware

```typescript
import { type Middleware } from "sveltekitlibrary/redux";

const timingMiddleware: Middleware =
  ({ dispatch }) =>
  (next) =>
  (action) => {
    const start = Date.now();

    try {
      const result = next(action);
      const end = Date.now();

      console.log(`Action ${action.type} took ${end - start}ms`);
      return result;
    } catch (error) {
      const end = Date.now();
      console.error(`Action ${action.type} failed after ${end - start}ms`);
      throw error;
    }
  };
```

### Error Handling Middleware

```typescript
import { type Middleware } from "sveltekitlibrary/redux";

const errorHandlingMiddleware: Middleware =
  ({ dispatch }) =>
  (next) =>
  (action) => {
    try {
      return next(action);
    } catch (error) {
      console.error("Action failed:", action, error);

      // Dispatch error action
      dispatch({
        type: "ACTION_ERROR",
        payload: error.message,
        error: true,
        originalAction: action,
      });

      throw error;
    }
  };
```

## Async State Management

### Multiple Async Operations

```typescript
import { createAsyncThunk } from "sveltekitlibrary/redux/async";

// Multiple async thunks
const fetchUsers = createAsyncThunk<User[], void>(
  "users/fetchUsers",
  async (_, { rejectWithValue }) => {
    const response = await fetch("/api/users");
    if (!response.ok) return rejectWithValue("Failed to fetch users");
    return response.json();
  }
);

const fetchPosts = createAsyncThunk<Post[], number>(
  "posts/fetchPosts",
  async (userId, { rejectWithValue }) => {
    const response = await fetch(`/api/users/${userId}/posts`);
    if (!response.ok) return rejectWithValue("Failed to fetch posts");
    return response.json();
  }
);

// Combined reducer
const appSlice = createSlice({
  name: "app",
  initialState: {
    users: createAsyncState<User[]>(),
    posts: createAsyncState<Post[]>(),
    selectedUserId: null as number | null,
  },
  reducers: {},
  extraReducers: (builder) => {
    // Users
    builder
      .addCase(fetchUsers.pending, (state) => {
        state.users.loading = true;
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.users.loading = false;
        state.users.data = action.payload;
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.users.loading = false;
        state.users.error = action.payload;
      });

    // Posts
    builder
      .addCase(fetchPosts.pending, (state) => {
        state.posts.loading = true;
      })
      .addCase(fetchPosts.fulfilled, (state, action) => {
        state.posts.loading = false;
        state.posts.data = action.payload;
      })
      .addCase(fetchPosts.rejected, (state, action) => {
        state.posts.loading = false;
        state.posts.error = action.payload;
      });

    // User selection
    builder.addCase(selectUser.fulfilled, (state, action) => {
      state.selectedUserId = action.payload.id;
    });
  },
});
```

### Conditional Async Operations

```typescript
import { createAsyncThunk } from "sveltekitlibrary/redux/async";

const fetchUserIfNotCached = createAsyncThunk<User, number>(
  "user/fetchUserIfNotCached",
  async (userId, { dispatch, getState, rejectWithValue }) => {
    const state = getState() as RootState;

    // Check if user is already loaded
    if (state.users.data && state.users.data.id === userId) {
      return state.users.data;
    }

    // Check if we're already loading this user
    if (state.users.loading && state.users.loadingUserId === userId) {
      return rejectWithValue("User already loading");
    }

    try {
      const response = await fetch(`/api/users/${userId}`);
      if (!response.ok) return rejectWithValue("User not found");
      return response.json();
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);
```

## State Persistence

### Basic Persistence

```typescript
import {
  createSvelteStore,
  combineReducers,
  applyMiddleware,
  compose,
  thunkMiddleware,
  createPersistEnhancer,
} from "sveltekitlibrary/redux";

const persistEnhancer = createPersistEnhancer<AppState>({
  key: "my-app",
  storageKind: "local",
  version: 2,
  throttle: 250,
  rehydrateStrategy: "replace",
  partialize: (s) => ({ todos: s.todos, ui: s.ui }),
});

const enhancedCreateStore = compose(
  persistEnhancer,
  applyMiddleware(thunkMiddleware)
);

const store = createSvelteStore(rootReducer, undefined, enhancedCreateStore);
```

### Persistence with Middleware

```typescript
import {
  createPersistMiddleware,
  PERSIST_PAUSE,
  PERSIST_RESUME,
  PERSIST_FLUSH,
  PERSIST_PURGE,
} from "sveltekitlibrary/redux";

// Only perform immediate writes for specific actions
const persistMiddleware = createPersistMiddleware<AppState>({
  key: "my-app",
  types: ["todos/addTodo", "todos/toggleTodo"],
});

// Compose enhancer + middleware
const enhancedCreateStore = compose(
  createPersistEnhancer<AppState>({
    key: "my-app",
    partialize: (s) => ({ todos: s.todos }),
  }),
  applyMiddleware(thunkMiddleware, persistMiddleware)
);

// Control examples:
store.dispatch({ type: PERSIST_PAUSE }); // temporarily pause writes
store.dispatch({ type: "todos/addTodo", payload: { text: "new" } });
store.dispatch({ type: PERSIST_RESUME }); // resume writes
store.dispatch({ type: PERSIST_FLUSH }); // force a write
store.dispatch({ type: PERSIST_PURGE }); // clear persisted data in storage
```

## Normalized State

### Normalized State Structure

```typescript
interface NormalizedState {
  entities: {
    users: { [id: string]: User };
    posts: { [id: string]: Post };
    comments: { [id: string]: Comment };
  };
  results: {
    users: string[];
    posts: string[];
    comments: string[];
  };
}

const initialState: NormalizedState = {
  entities: {
    users: {},
    posts: {},
    comments: {},
  },
  results: {
    users: [],
    posts: [],
    comments: [],
  },
};
```

### Normalized Reducer

```typescript
import { createSlice } from "sveltekitlibrary/redux";

const normalizedSlice = createSlice({
  name: "normalized",
  initialState: {
    entities: {
      users: {},
      posts: {},
      comments: {},
    },
    results: {
      users: [],
      posts: [],
      comments: [],
    },
  },
  reducers: {
    addEntities: (state, action) => {
      const { entities } = action.payload;
      state.entities = { ...state.entities, ...entities };
    },
    addResults: (state, action) => {
      const { entityType, ids } = action.payload;
      state.results[entityType] = [...state.results[entityType], ...ids];
    },
    removeEntity: (state, action) => {
      const { entityType, id } = action.payload;
      delete state.entities[entityType][id];
      state.results[entityType] = state.results[entityType].filter(
        (entityId) => entityId !== id
      );
    },
  },
});
```

### Selectors for Normalized State

```typescript
import { createSelector } from "sveltekitlibrary/redux";

const selectEntities = (state) => state.normalized.entities;
const selectResults = (state) => state.normalized.results;

const selectUsers = createSelector(
  selectEntities,
  selectResults,
  (entities, results) => results.users.map((id) => entities.users[id])
);

const selectUserPosts = createSelector(
  selectEntities,
  selectResults,
  (state, userId) => {
    const entities = selectEntities(state);
    const results = selectResults(state);
    const userPostIds = results.posts.filter(
      (id) => entities.posts[id].userId === userId
    );
    return userPostIds.map((id) => entities.posts[id]);
  }
);
```

## Performance Optimization

### Memoization Strategies

```typescript
import { shallowEqual, createSelector } from "sveltekitlibrary/redux";

const memoizedExpensiveFunction = createSelector(
  (state) => state.expensiveData,
  (data) => {
    // Expensive computation
    return data.map((item) => ({
      ...item,
      processed: expensiveOperation(item),
    }));
  }
);
```

### Component-Level Optimization

```typescript
// In Svelte component
<script lang="ts">
  import { store } from './store';
  import { selectVisibleTodos } from './selectors';

  // Use memoized selector
  let todos = $derived(selectVisibleTodos(store.state));

  // Use derived for computed values
  let todoCount = $derived(todos.length);
  let completedCount = $derived(todos.filter(todo => todo.completed).length);
</script>
```

### Batch Updates

```typescript
import { createSlice } from "sveltekitlibrary/redux";

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
      // Process all pending updates
      state.pendingUpdates.forEach((update) => {
        // Apply update logic
      });
      state.pendingUpdates = [];
    },
  },
});
```

## Error Boundaries

### Global Error Handling

```typescript
import { createSlice } from "sveltekitlibrary/redux";

const errorSlice = createSlice({
  name: "error",
  initialState: {
    globalError: null as string | null,
    errors: [] as Error[],
    errorBoundary: {
      hasError: false,
      error: null as Error | null,
      errorInfo: null as any,
    },
  },
  reducers: {
    setGlobalError: (state, action) => {
      state.globalError = action.payload;
    },
    addError: (state, action) => {
      state.errors.push(action.payload);
    },
    clearErrors: (state) => {
      state.errors = [];
    },
    setErrorBoundary: (state, action) => {
      state.errorBoundary = action.payload;
    },
    clearErrorBoundary: (state) => {
      state.errorBoundary = {
        hasError: false,
        error: null,
        errorInfo: null,
      };
    },
  },
});
```

### Error Boundary Component

```svelte
<!-- ErrorBoundary.svelte -->
<script lang="ts">
  import { store } from './store';
  import { errorSelectors } from './selectors';

  let hasError = $derived(errorSelectors.getErrorBoundary(store.state).hasError);
  let error = $derived(errorSelectors.getErrorBoundary(store.state).error);
</script>

{#if hasError}
  <div class="error-boundary">
    <h2>Something went wrong</h2>
    <p>{error?.message}</p>
    <button on:click={() => store.dispatch(actions.clearErrorBoundary)}>
      Try again
    </button>
  </div>
{:else}
  <slot />
{/if}

<style>
  .error-boundary {
    border: 2px solid red;
    padding: 1rem;
    margin: 1rem;
    background: #fee;
  }
</style>
```

## Hot Reloading

### Dynamic Reducer Loading

```typescript
import { createSlice } from "sveltekitlibrary/redux";

const dynamicSlice = createSlice({
  name: "dynamic",
  initialState: {
    loadedReducers: [] as string[],
    hotReloadEnabled: false,
  },
  reducers: {
    addLoadedReducer: (state, action) => {
      if (!state.loadedReducers.includes(action.payload)) {
        state.loadedReducers.push(action.payload);
      }
    },
    removeLoadedReducer: (state, action) => {
      state.loadedReducers = state.loadedReducers.filter(
        (name) => name !== action.payload
      );
    },
    enableHotReload: (state) => {
      state.hotReloadEnabled = true;
    },
    disableHotReload: (state) => {
      state.hotReloadEnabled = false;
    },
  },
});
```

### Hot Reload Middleware

```typescript
import { type Middleware } from "sveltekitlibrary/redux";

const hotReloadMiddleware: Middleware =
  ({ dispatch }) =>
  (next) =>
  (action) => {
    if (action.type === "HOT_RELOAD_MODULE") {
      // Handle hot reload logic
      dispatch({ type: "REMOVE_REDUCER", payload: action.payload.moduleName });
      dispatch({ type: "ADD_REDUCER", payload: action.payload.newReducer });
      dispatch({
        type: "ADD_LOADED_REDUCER",
        payload: action.payload.moduleName,
      });
    }

    return next(action);
  };
```

## Testing Patterns

### Testing Selectors

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

### Testing Async Thunks

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
});
```

### Testing Middleware

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

## Integration Patterns

### Integration with Svelte Stores

```typescript
// svelteStoreIntegration.ts
import { derived, writable } from "svelte/store";
import { store } from "./reduxStore";

// Create Svelte store from Redux state
export const reduxState = derived(store, ($store) => $store.state);

// Create specific derived stores
export const counter = derived(reduxState, ($state) => $state.counter);
export const user = derived(reduxState, ($state) => $state.user);

// Create action dispatcher
export const dispatch = store.dispatch;
```

### Integration with Router

```typescript
// routerMiddleware.ts
import { type Middleware } from "sveltekitlibrary/redux";

const routerMiddleware: Middleware =
  ({ dispatch }) =>
  (next) =>
  (action) => {
    if (action.type === "ROUTER_NAVIGATE") {
      // Handle navigation
      navigateTo(action.payload);
    }

    return next(action);
  };
```

### Integration with Forms

```typescript
// formSlice.ts
import { createSlice } from "sveltekitlibrary/redux";

interface FormState {
  values: Record<string, any>;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  submitting: boolean;
}

const formSlice = createSlice({
  name: "form",
  initialState: {
    values: {},
    errors: {},
    touched: {},
    submitting: false,
  } as FormState,
  reducers: {
    setFieldValue: (state, action) => {
      const { field, value } = action.payload;
      state.values[field] = value;
    },
    setFieldError: (state, action) => {
      const { field, error } = action.payload;
      state.errors[field] = error;
    },
    setFieldTouched: (state, action) => {
      const { field, touched } = action.payload;
      state.touched[field] = touched;
    },
    setSubmitting: (state, action) => {
      state.submitting = action.payload;
    },
    resetForm: (state) => {
      state.values = {};
      state.errors = {};
      state.touched = {};
      state.submitting = false;
    },
  },
});
```

For more information about specific features, see the relevant guides:

- [Async State Management](./async-state-management.md)
- [API Data Fetching](./api-data-fetching.md)
- [State Persistence](./state-persistence.md)

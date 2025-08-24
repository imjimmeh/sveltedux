# Comparison with Redux

While this library follows Redux patterns, it's specifically designed for Svelte 5. This guide compares the key differences and similarities between Redux and this Redux-Esque library.

## Overview

| Feature        | Redux               | Redux-Esque (Svelte 5)  |
| -------------- | ------------------- | ----------------------- |
| State Updates  | Immutable           | Svelte Runes            |
| Reactivity     | Manual subscription | Automatic with runes    |
| Bundle Size    | Larger              | Smaller                 |
| Learning Curve | Steeper             | Familiar to Redux users |
| Performance    | Good                | Optimized for Svelte    |
| Integration    | Framework-agnostic  | Svelte 5 specific       |

## Key Differences

### 1. State Management

#### Redux

```typescript
// Redux uses immutable updates
const counterReducer = (state = 0, action) => {
  switch (action.type) {
    case "INCREMENT":
      return state + 1;
    default:
      return state;
  }
};

// Manual subscription
const unsubscribe = store.subscribe(() => {
  console.log(store.getState());
});
```

#### Redux-Esque

```typescript
// Uses Svelte 5 runes for reactivity
const counterReducer = createReducer(0, {
  INCREMENT: (state) => state + 1,
});

// Automatic reactivity in Svelte components
<script lang="ts">let counter = $derived(store.state.counter);</script>;
```

### 2. Component Integration

#### Redux

```typescript
// Redux requires manual subscription
import { connect } from "react-redux";

const mapStateToProps = (state) => ({
  counter: state.counter,
});

const Counter = connect(mapStateToProps)(({ counter, dispatch }) => (
  <div>
    <span>{counter}</span>
    <button onClick={() => dispatch({ type: "INCREMENT" })}>Increment</button>
  </div>
));
```

#### Redux-Esque

```typescript
// Automatic reactivity with Svelte 5
<script lang="ts">
  let counter = $derived(store.state.counter);

  function increment() {
    store.dispatch({ type: 'INCREMENT' });
  }
</script>

<div>
  <span>{counter}</span>
  <button on:click={increment}>Increment</button>
</div>
```

### 3. Async Operations

#### Redux

```typescript
// Redux requires middleware for async operations
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

const fetchUser = createAsyncThunk("user/fetchUser", async (userId) => {
  const response = await fetch(`/api/users/${userId}`);
  return response.json();
});

const userSlice = createSlice({
  name: "user",
  initialState: { user: null, loading: false },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchUser.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
      })
      .addCase(fetchUser.rejected, (state) => {
        state.loading = false;
      });
  },
});
```

#### Redux-Esque

```typescript
// Similar API but optimized for Svelte 5
const fetchUser = createAsyncThunk<User, number>(
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

const userSlice = createSlice({
  name: "user",
  initialState: { user: null as User | null, loading: false },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchUser.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
      })
      .addCase(fetchUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});
```

### 4. Selectors

#### Redux

```typescript
// Redux selectors (reselect library)
import { createSelector } from "reselect";

const selectUser = (state) => state.user;
const selectTodos = (state) => state.todos;

const selectUserTodos = createSelector(selectUser, selectTodos, (user, todos) =>
  todos.filter((todo) => todo.userId === user.id)
);
```

#### Redux-Esque

```typescript
// Similar API with Svelte integration
const selectUser = (state: AppState) => state.user;
const selectTodos = (state: AppState) => state.todos;

const selectUserTodos = createSelector(selectUser, selectTodos, (user, todos) =>
  todos.filter((todo) => todo.userId === user.id)
);

// In Svelte component
<script lang="ts">
  let userTodos = $derived(selectUserTodos(store.state));
</script>;
```

### 5. Middleware

#### Redux

```typescript
// Redux middleware
const loggerMiddleware = (store) => (next) => (action) => {
  console.log("Dispatching:", action);
  const result = next(action);
  console.log("Next state:", store.getState());
  return result;
};

const store = createStore(rootReducer, applyMiddleware(loggerMiddleware));
```

#### Redux-Esque

```typescript
// Similar API with Svelte integration
const loggerMiddleware: Middleware =
  ({ dispatch, getState }) =>
  (next) =>
  (action) => {
    console.log("Dispatching:", action);
    const result = next(action);
    console.log("Next state:", getState());
    return result;
  };

const store = createSvelteStore(
  rootReducer,
  undefined,
  applyMiddleware(loggerMiddleware)
);
```

## Performance Comparison

### Bundle Size

| Library             | Size (minified + gzipped) |
| ------------------- | ------------------------- |
| Redux + React-Redux | ~9KB                      |
| Redux-Esque         | ~4KB                      |

### Reactivity Performance

| Scenario            | Redux                  | Redux-Esque            |
| ------------------- | ---------------------- | ---------------------- |
| Simple state update | Manual subscription    | Automatic              |
| Multiple components | Multiple subscriptions | Single source of truth |
| Derived state       | Manual computation     | Automatic with runes   |

### Memory Usage

| Scenario          | Redux                           | Redux-Esque               |
| ----------------- | ------------------------------- | ------------------------- |
| Large state       | Higher (immutable copies)       | Lower (Svelte reactivity) |
| Component updates | Higher (multiple subscriptions) | Lower (automatic updates) |

## Migration Guide

### From Redux to Redux-Esque

#### 1. Replace Store Creation

```typescript
// Redux
import { createStore } from "redux";
const store = createStore(rootReducer);

// Redux-Esque
import { createSvelteStore } from "sveltekitlibrary/redux";
const store = createSvelteStore(rootReducer);
```

#### 2. Update Component Integration

```typescript
// Redux with React
import { connect } from 'react-redux';

const mapStateToProps = (state) => ({
  counter: state.counter,
});

const Counter = connect(mapStateToProps)(({ counter, dispatch }) => (
  <div>
    <span>{counter}</span>
    <button onClick={() => dispatch({ type: 'INCREMENT' })}>
      Increment
    </button>
  </div>
));

// Redux-Esque with Svelte
<script lang="ts">
  let counter = $derived(store.state.counter);

  function increment() {
    store.dispatch({ type: 'INCREMENT' });
  }
</script>

<div>
  <span>{counter}</span>
  <button on:click={increment}>Increment</button>
</div>
```

#### 3. Update Async Operations

```typescript
// Redux with Redux Toolkit
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

const fetchUser = createAsyncThunk("user/fetchUser", async (userId) => {
  const response = await fetch(`/api/users/${userId}`);
  return response.json();
});

// Redux-Esque
import { createAsyncThunk } from "sveltekitlibrary/redux/async";

const fetchUser = createAsyncThunk<User, number>(
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

#### 4. Update Selectors

```typescript
// Redux with reselect
import { createSelector } from "reselect";

const selectUser = (state) => state.user;
const selectTodos = (state) => state.todos;

const selectUserTodos = createSelector(selectUser, selectTodos, (user, todos) =>
  todos.filter((todo) => todo.userId === user.id)
);

// Redux-Esque
import { createSelector } from "sveltekitlibrary/redux";

const selectUser = (state: AppState) => state.user;
const selectTodos = (state: AppState) => state.todos;

const selectUserTodos = createSelector(selectUser, selectTodos, (user, todos) =>
  todos.filter((todo) => todo.userId === user.id)
);
```

### Key Migration Points

1. **Remove React-Redux**: No need for `connect` HOC
2. **Use Svelte 5 runes**: Replace manual subscriptions with `$derived`
3. **Keep Redux patterns**: Actions, reducers, and selectors work similarly
4. **Update middleware**: Same API but with Svelte integration
5. **Leverage Svelte reactivity**: Automatic updates reduce boilerplate

## When to Use Redux vs Redux-Esque

### Choose Redux-Esque when:

- You're building a Svelte 5 application
- You want automatic reactivity
- You prefer smaller bundle size
- You're familiar with Redux patterns
- You want framework-specific optimizations

### Choose Redux when:

- You need framework-agnostic state management
- You're working with React or other frameworks
- You need extensive middleware ecosystem
- You require advanced time-travel debugging
- You need Redux DevTools integration

## Feature Comparison Table

| Feature              | Redux     | Redux-Esque        | Notes                      |
| -------------------- | --------- | ------------------ | -------------------------- |
| **Core Features**    |           |                    |                            |
| Actions              | ✅        | ✅                 | Similar API                |
| Reducers             | ✅        | ✅                 | Similar API                |
| Store                | ✅        | ✅                 | Svelte-optimized version   |
| Selectors            | ✅        | ✅                 | Similar API                |
| Middleware           | ✅        | ✅                 | Similar API                |
| **Async Operations** |           |                    |                            |
| Thunks               | ✅        | ✅                 | Similar API                |
| Sagas                | ✅        | ❌                 | Not implemented            |
| Observables          | ✅        | ❌                 | Not implemented            |
| **Reactivity**       |           |                    |                            |
| Manual Subscription  | ✅        | ❌                 | Automatic in Svelte        |
| Immutable Updates    | ✅        | ❌                 | Uses Svelte runes          |
| Batch Updates        | ✅        | ✅                 | Similar API                |
| **Development**      |           |                    |                            |
| DevTools             | ✅        | ❌                 | Not implemented            |
| Time Travel          | ✅        | ❌                 | Not implemented            |
| Hot Reloading        | ✅        | ✅                 | Similar API                |
| **Performance**      |           |                    |                            |
| Bundle Size          | Large     | Small              | 50% smaller                |
| Memory Usage         | Higher    | Lower              | Svelte optimization        |
| Update Speed         | Good      | Excellent          | Svelte reactivity          |
| **Ecosystem**        |           |                    |                            |
| Middleware           | Extensive | Growing            | Redux has more options     |
| Community            | Large     | Growing            | Redux has larger community |
| Integrations         | Many      | Framework-specific | Svelte-specific            |

## Advanced Comparisons

### State Persistence

#### Redux

```typescript
// Redux with redux-persist
import { persistStore, persistReducer } from "redux-persist";
import storage from "redux-persist/lib/storage";

const persistConfig = {
  key: "root",
  storage,
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

const store = createStore(persistedReducer);
const persistor = persistStore(store);
```

#### Redux-Esque

```typescript
// Built-in persistence
import { createPersistEnhancer } from "sveltekitlibrary/redux/persist";

const persistEnhancer = createPersistEnhancer<AppState>({
  key: "my-app",
  storageKind: "local",
  version: 2,
  throttle: 250,
});

const store = createSvelteStore(rootReducer, undefined, persistEnhancer);
```

### Error Handling

#### Redux

```typescript
// Redux error handling
const errorMiddleware = (store) => (next) => (action) => {
  try {
    return next(action);
  } catch (error) {
    console.error("Action failed:", action, error);
    // Dispatch error action
    store.dispatch({
      type: "ACTION_ERROR",
      payload: error.message,
      error: true,
    });
    throw error;
  }
};
```

#### Redux-Esque

```typescript
// Similar error handling
const errorHandlingMiddleware: Middleware =
  ({ dispatch }) =>
  (next) =>
  (action) => {
    try {
      return next(action);
    } catch (error) {
      console.error("Action failed:", action, error);

      dispatch({
        type: "ACTION_ERROR",
        payload: error.message,
        error: true,
      });

      throw error;
    }
  };
```

### Testing

#### Redux

```typescript
// Redux testing
import { configureStore } from "@reduxjs/toolkit";
import { render } from "@testing-library/react";

const store = configureStore({ reducer: rootReducer });

const renderWithRedux = (
  component,
  { initialState, store = createStore(initialState) } = {}
) => {
  return render(<Provider store={store}>{component}</Provider>);
};
```

#### Redux-Esque

```typescript
// Redux-Esque testing
import { createSvelteStore } from "sveltekitlibrary/redux";
import { render } from "@testing-library/svelte";

const store = createSvelteStore(rootReducer, initialState);

const renderWithRedux = (
  component,
  { initialState, store = createSvelteStore(rootReducer, initialState) } = {}
) => {
  return render(component, { store });
};
```

## Conclusion

The Redux-Esque library provides a familiar Redux experience while being optimized for Svelte 5. It maintains the core principles of Redux (single source of truth, state is read-only, changes are made with pure functions) while leveraging Svelte's reactivity system for better performance and developer experience.

For Svelte 5 applications, Redux-Esque offers:

- Smaller bundle size
- Better performance through automatic reactivity
- Familiar API for Redux developers
- Framework-specific optimizations
- Reduced boilerplate code

The choice between Redux and Redux-Esque ultimately depends on your specific needs and the framework you're using. For Svelte 5 applications, Redux-Esque is the recommended choice for its seamless integration and performance benefits.

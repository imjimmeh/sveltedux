# Middleware API

Middleware provides a third-party extension point between dispatching an action and the moment it reaches the reducer. Middleware can be used for logging, crash reporting, routing, asynchronous flows, and more.

## `applyMiddleware(...middlewares)`

Applies middleware to the store.

```typescript
import {
  applyMiddleware,
  thunkMiddleware,
  loggerMiddleware,
} from "sveltedux";

const store = createStore(
  reducer,
  initialState,
  applyMiddleware(thunkMiddleware, loggerMiddleware)
);
```

### Parameters

- `...middlewares` (Function): Middleware functions to apply.

### Returns

- `StoreEnhancer`: A store enhancer that applies the middleware.

### Example

```typescript
import { applyMiddleware } from "sveltedux";
import { thunkMiddleware, loggerMiddleware } from "sveltedux";

const enhancedCreateStore = applyMiddleware(thunkMiddleware, loggerMiddleware);

const store = createStore(reducer, initialState, enhancedCreateStore);
```

## `thunkMiddleware`

Middleware for handling thunk actions (async functions).

```typescript
import { thunkMiddleware } from "sveltedux";

const asyncAction = () => async (dispatch, getState) => {
  dispatch({ type: "LOADING_START" });
  const data = await fetchData();
  dispatch({ type: "LOADING_END", payload: data });
};

store.dispatch(asyncAction());
```

### Features

- Handles async functions that return promises
- Provides `dispatch` and `getState` to thunk functions
- Automatically handles promise lifecycle

### Example

```typescript
import { thunkMiddleware } from "sveltedux";

// Async action creator
const fetchUser = (userId) => async (dispatch, getState) => {
  dispatch({ type: "USER_FETCH_START" });

  try {
    const response = await fetch(`/api/users/${userId}`);
    const user = await response.json();
    dispatch({ type: "USER_FETCH_SUCCESS", payload: user });
  } catch (error) {
    dispatch({ type: "USER_FETCH_ERROR", payload: error.message });
  }
};

// Usage
store.dispatch(fetchUser(1));
```

## `loggerMiddleware`

Middleware for logging actions and state changes.

```typescript
import { loggerMiddleware } from "sveltedux";
```

### Features

- Logs all dispatched actions
- Logs state changes before and after action dispatch
- Configurable logging options

### Example

```typescript
import { loggerMiddleware } from "sveltedux";

// Custom logger with options
const store = createStore(
  reducer,
  initialState,
  applyMiddleware(
    thunkMiddleware,
    loggerMiddleware({
      level: "debug",
      logger: console,
      predicate: (getState, action) => action.type !== "USER_FETCH_START",
    })
  )
);
```

## Creating Custom Middleware

### Basic Middleware Structure

```typescript
import { type Middleware } from "sveltedux";

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

### Middleware Parameters

- `dispatch`: The store's dispatch function
- `getState`: The store's getState function

### Middleware Chain

Middleware functions are composed from right to left. Each middleware receives `next` and `action` parameters:

```typescript
// Middleware chain: logger -> thunk -> custom -> reducer
const store = createStore(
  reducer,
  initialState,
  applyMiddleware(loggerMiddleware, thunkMiddleware, customMiddleware)
);
```

### Advanced Middleware Example

```typescript
import { type Middleware } from "sveltedux";

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

### Conditional Middleware

```typescript
import { type Middleware } from "sveltedux";

const conditionalMiddleware: Middleware =
  ({ dispatch, getState }) =>
  (next) =>
  (action) => {
    // Only process certain actions
    if (action.type.startsWith("USER_")) {
      console.log("Processing user action:", action);
      return next(action);
    }

    // Pass through other actions unchanged
    return next(action);
  };
```

### Error Handling Middleware

```typescript
import { type Middleware } from "sveltedux";

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

### Async Action Middleware

```typescript
import { type Middleware } from "sveltedux";

const asyncActionMiddleware: Middleware =
  ({ dispatch }) =>
  (next) =>
  (action) => {
    if (typeof action === "function") {
      // Handle async functions
      return action(dispatch, getState);
    }

    return next(action);
  };
```

## Common Middleware Patterns

### 1. Logging Middleware

```typescript
import { type Middleware } from "sveltedux";

const loggerMiddleware: Middleware =
  ({ getState }) =>
  (next) =>
  (action) => {
    console.group(`Action: ${action.type}`);
    console.log("Previous state:", getState());
    console.log("Action:", action);

    const result = next(action);

    console.log("Next state:", getState());
    console.groupEnd();

    return result;
  };
```

### 2. Crash Reporting Middleware

```typescript
import { type Middleware } from "sveltedux";

const crashReportingMiddleware: Middleware =
  ({ getState }) =>
  (next) =>
  (action) => {
    try {
      return next(action);
    } catch (error) {
      console.error("Caught an exception!", error);

      // Report to error tracking service
      reportError(error, {
        action,
        state: getState(),
      });

      throw error;
    }
  };
```

### 3. Router Middleware

```typescript
import { type Middleware } from "sveltedux";

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

### 4. Thunk Middleware with Extra Arguments

```typescript
import { type Middleware } from "sveltedux";

const apiThunkMiddleware: Middleware =
  ({ dispatch, getState }) =>
  (next) =>
  (action) => {
    if (typeof action === "function") {
      // Pass extra arguments to thunk functions
      return action(dispatch, getState, apiClient);
    }

    return next(action);
  };
```

### 5. Batch Actions Middleware

```typescript
import { type Middleware } from "sveltedux";

const batchMiddleware: Middleware =
  ({ dispatch }) =>
  (next) =>
  (action) => {
    if (action.type === "BATCH_ACTIONS") {
      // Dispatch multiple actions at once
      return action.payload.forEach(next);
    }

    return next(action);
  };
```

## Middleware Composition

### Composing Multiple Middlewares

```typescript
import { applyMiddleware } from "sveltedux";

// Order matters: right to left execution
const middleware = applyMiddleware(
  loggerMiddleware,
  thunkMiddleware,
  crashReportingMiddleware,
  timingMiddleware
);

const store = createStore(reducer, initialState, middleware);
```

### Conditional Middleware Application

```typescript
import { applyMiddleware } from "sveltedux";

const createEnhancer = (middlewares) => {
  if (process.env.NODE_ENV === "development") {
    return applyMiddleware(...middlewares, loggerMiddleware);
  }
  return applyMiddleware(...middlewares);
};

const store = createStore(
  reducer,
  initialState,
  createEnhancer([thunkMiddleware, crashReportingMiddleware])
);
```

## Best Practices

### 1. Keep Middleware Simple

```typescript
// Good: Single responsibility
const loggingMiddleware =
  ({ getState }) =>
  (next) =>
  (action) => {
    console.log("Action:", action);
    return next(action);
  };

// Bad: Multiple responsibilities
const complexMiddleware =
  ({ dispatch, getState }) =>
  (next) =>
  (action) => {
    // Logging
    console.log("Action:", action);

    // Error handling
    try {
      return next(action);
    } catch (error) {
      dispatch({ type: "ERROR", payload: error });
      throw error;
    }

    // Performance tracking
    const start = Date.now();
    const result = next(action);
    console.log(`Action took ${Date.now() - start}ms`);
    return result;
  };
```

### 2. Use Middleware for Cross-Cutting Concerns

```typescript
// Good: Cross-cutting concerns
const authMiddleware =
  ({ dispatch }) =>
  (next) =>
  (action) => {
    if (action.type === "LOGIN_SUCCESS") {
      // Set auth token
      localStorage.setItem("authToken", action.payload.token);
    }

    return next(action);
  };
```

### 3. Handle Errors Gracefully

```typescript
const errorHandlingMiddleware =
  ({ dispatch }) =>
  (next) =>
  (action) => {
    try {
      return next(action);
    } catch (error) {
      // Log error but don't crash the app
      console.error("Middleware error:", error);

      // Dispatch error action
      dispatch({
        type: "MIDDLEWARE_ERROR",
        payload: error.message,
        error: true,
      });

      // Return original action to continue flow
      return action;
    }
  };
```

### 4. Use TypeScript for Middleware

```typescript
import {
  type Middleware,
  type Action,
  type Dispatch,
  type GetState,
} from "sveltedux";

interface MyState {
  user: User | null;
  loading: boolean;
}

const myMiddleware: Middleware<MyState> =
  ({ dispatch, getState }) =>
  (next) =>
  (action: Action) => {
    // TypeScript provides type safety
    const state = getState();

    if (action.type === "FETCH_USER") {
      console.log("Current user:", state.user);
    }

    return next(action);
  };
```

For more information about async operations, see the [Async State Management](../guides/async-state-management.md) guide.

## `createRetryMiddleware(thunkRegistry, options)`

Middleware that automatically retries failed async thunks. The middleware uses a thunk registry to re-execute the original thunk, which is more robust than dispatching separate retry actions.

```typescript
import { createRetryMiddleware } from "sveltedux";
import { createAsyncThunk } from "sveltedux/async";

const fetchUser = createAsyncThunk('user/fetchUser', async (id) => {...});
const fetchTodos = createAsyncThunk('todos/fetchTodos', async () => {...});

const thunkRegistry = new Map();
thunkRegistry.set('user/fetchUser', fetchUser);
thunkRegistry.set('todos/fetchTodos', fetchTodos);

const retryMiddleware = createRetryMiddleware(thunkRegistry, {
  maxRetries: 3,
  retryDelay: 1000,
  retryCondition: (error) => error.code === 'NETWORK_ERROR'
});

const store = createStore(
  reducer,
  initialState,
  applyMiddleware(thunkMiddleware, retryMiddleware)
);
```

### Parameters

- `thunkRegistry` (Map<string, AsyncThunkAction>): A map of thunk type prefixes to their corresponding async thunk actions. This parameter is mandatory.
- `options` (Object): Configuration options for the retry behavior
  - `maxRetries` (number): Maximum number of retry attempts (default: 3)
  - `retryDelay` (number): Base delay between retries in milliseconds (default: 1000)
  - `retryCondition` (Function): Function to determine if an error should trigger a retry (default: network errors)
  - `enabledThunks` (Set<string>): Optional set of thunk type prefixes to enable retry for (if not provided, all registered thunks are enabled)

### Features

- Automatically retries failed async thunks using the original thunk logic
- Configurable retry conditions and limits
- Exponential backoff for retry delays
- Selective retry enablement for specific thunks
- Works with the async thunk pattern

### Example with Selective Retry Enablement

```typescript
import { createRetryMiddleware } from "sveltedux";
import { createAsyncThunk } from "sveltedux/async";

const fetchUser = createAsyncThunk('user/fetchUser', async (id) => {...});
const updateUser = createAsyncThunk('user/updateUser', async (data) => {...});

const thunkRegistry = new Map();
thunkRegistry.set('user/fetchUser', fetchUser);
thunkRegistry.set('user/updateUser', updateUser);

// Only enable retry for fetch operations, not updates
const retryMiddleware = createRetryMiddleware(thunkRegistry, {
  maxRetries: 2,
  retryDelay: 1000,
  enabledThunks: new Set(['user/fetchUser'])
});
```

### Example with Custom Retry Condition

```typescript
import { createRetryMiddleware } from "sveltedux";

const retryMiddleware = createRetryMiddleware(thunkRegistry, {
  maxRetries: 3,
  retryDelay: 500,
  retryCondition: (error, action) => {
    // Retry on network errors or timeout errors
    return (
      error.name === "NetworkError" ||
      error.message?.includes("timeout") ||
      error.code === "ECONNABORTED"
    );
  },
});
```
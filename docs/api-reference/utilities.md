# Utilities API

The library provides various utility functions to help with common Redux-like patterns and state management tasks.

## `bindActionCreators(actionCreators, dispatch)`

Binds action creators to a dispatch function.

```typescript
import { bindActionCreators } from "sveltekitlibrary/redux";

const boundActions = bindActionCreators(actions, store.dispatch);
```

### Parameters

- `actionCreators` (Object or Function): An object of action creators or a single action creator.
- `dispatch` (Function): The dispatch function from the store.

### Returns

- `BoundActionCreators`: An object with action creators bound to the dispatch function.

### Example

```typescript
import { bindActionCreators } from "sveltekitlibrary/redux";

const actions = {
  increment: () => ({ type: "INCREMENT" }),
  decrement: () => ({ type: "DECREMENT" }),
  addTodo: (text) => ({ type: "ADD_TODO", payload: text }),
};

const boundActions = bindActionCreators(actions, store.dispatch);

// Usage
boundActions.increment();
boundActions.addTodo("Learn Redux");
```

## `shallowEqual(objA, objB)`

Performs a shallow equality check between two objects.

```typescript
import { shallowEqual } from "sveltekitlibrary/redux";

if (shallowEqual(state.todos, nextProps.todos)) {
  // Objects are shallowly equal
}
```

### Parameters

- `objA` (Object): First object to compare.
- `objB` (Object): Second object to compare.

### Returns

- `boolean`: True if objects are shallowly equal, false otherwise.

### Example

```typescript
import { shallowEqual } from "sveltekitlibrary/redux";

const oldTodos = [{ id: 1, text: "Task 1" }];
const newTodos = [...oldTodos]; // Shallow copy

console.log(shallowEqual(oldTodos, newTodos)); // true (same reference for nested objects)

const differentTodos = [{ id: 1, text: "Task 1" }];
console.log(shallowEqual(oldTodos, differentTodos)); // false (different references)
```

## `produce(baseState, recipe)`

Creates a new state based on a draft using Immer-like syntax.

```typescript
import { produce } from "sveltekitlibrary/redux";

const newState = produce(state, (draft) => {
  draft.user.name = "New Name";
});
```

### Parameters

- `baseState` (any): The initial state.
- `recipe` (Function): A function that receives a draft state and can be mutated freely.

### Returns

- `any`: The new immutable state.

### Example

```typescript
import { produce } from "sveltekitlibrary/redux";

const initialState = {
  user: { name: "John", age: 30 },
  todos: ["Task 1", "Task 2"],
};

// Update nested object
const newState = produce(initialState, (draft) => {
  draft.user.name = "Jane";
  draft.user.age = 31;
});

// Update array
const addTodoState = produce(initialState, (draft) => {
  draft.todos.push("Task 3");
});

// Remove from array
const removeTodoState = produce(initialState, (draft) => {
  draft.todos.pop();
});
```

## `createAsyncState<T>()`

Creates an async state object with loading, error, and data properties.

```typescript
import { createAsyncState } from "sveltekitlibrary/redux/async";

const userState = createAsyncState<User>();
// Returns: { data: null, loading: false, error: null }
```

### Type Parameters

- `T`: The type of data that will be stored.

### Returns

- `AsyncState<T>`: An async state object.

### Example

```typescript
import { createAsyncState } from "sveltekitlibrary/redux/async";

interface User {
  id: number;
  name: string;
  email: string;
}

const userState = createAsyncState<User>();
// { data: null, loading: false, error: null }

const postsState = createAsyncState<Post[]>();
// { data: null, loading: false, error: null }
```

## `createAsyncReducer(asyncThunk, handlers?)`

Creates a reducer that automatically handles async states.

```typescript
import { createAsyncReducer } from "sveltekitlibrary/redux/async";

const userReducer = createAsyncReducer(fetchUser, {
  pending: (state) => ({ ...state, loading: true }),
  fulfilled: (state, action) => ({
    ...state,
    loading: false,
    data: action.payload,
    error: null,
  }),
  rejected: (state, action) => ({
    ...state,
    loading: false,
    error: action.payload,
  }),
});
```

### Parameters

- `asyncThunk` (AsyncThunk): The async thunk to handle.
- `handlers` (Object): Optional custom handlers for pending, fulfilled, and rejected states.

### Returns

- `ReducerFunction`: A reducer function that handles async states.

### Example

```typescript
import { createAsyncReducer } from "sveltekitlibrary/redux/async";

const userReducer = createAsyncReducer(fetchUser, {
  pending: (state) => {
    state.loading = true;
    state.error = null;
  },
  fulfilled: (state, action) => {
    state.loading = false;
    state.data = action.payload;
    state.error = null;
  },
  rejected: (state, action) => {
    state.loading = false;
    state.error = action.payload ?? "An unknown error occurred";
  },
});
```

## `compose(...functions)`

Composes multiple functions from right to left.

```typescript
import { compose } from "sveltekitlibrary/redux";

const composed = compose(f, g, h);
// Equivalent to (x) => f(g(h(x)))
```

### Parameters

- `...functions` (Function): Functions to compose.

### Returns

- `Function`: A composed function.

### Example

```typescript
import { compose } from "sveltekitlibrary/redux";

const add = (x) => x + 1;
const multiply = (x) => x * 2;
const subtract = (x) => x - 3;

const composed = compose(add, multiply, subtract);
// Equivalent to: (x) => add(multiply(subtract(x)))

console.log(composed(5)); // ((5 - 3) * 2) + 1 = 5
```

## `createWebStorage(storageKind?)`

Creates a web storage helper that falls back to in-memory storage.

```typescript
import { createWebStorage } from "sveltekitlibrary/redux/persist";

const storage = createWebStorage("local"); // localStorage
const sessionStorage = createWebStorage("session"); // sessionStorage
const fallbackStorage = createWebStorage(); // in-memory fallback
```

### Parameters

- `storageKind` ('local' | 'session'): The type of storage to use.

### Returns

- `StorageLike`: A storage-like object with getItem, setItem, removeItem methods.

### Example

```typescript
import { createWebStorage } from "sveltekitlibrary/redux/persist";

const localStorage = createWebStorage("local");
const sessionStorage = createWebStorage("session");

// Usage
localStorage.setItem("key", "value");
const value = localStorage.getItem("key");
localStorage.removeItem("key");
```

## `createPersistEnhancer(config)`

Creates a persist enhancer for state persistence.

```typescript
import { createPersistEnhancer } from "sveltekitlibrary/redux/persist";

const persistEnhancer = createPersistEnhancer<AppState>({
  key: "my-app",
  storageKind: "local",
  version: 2,
  throttle: 250,
});
```

### Parameters

- `config` (PersistConfig): Configuration object for persistence.

### Returns

- `StoreEnhancer`: A store enhancer that adds persistence capabilities.

### Example

```typescript
import { createPersistEnhancer } from "sveltekitlibrary/redux/persist";

const persistEnhancer = createPersistEnhancer<AppState>({
  key: "my-app",
  storageKind: "local",
  version: 2,
  throttle: 250,
  rehydrateStrategy: "replace",
  partialize: (state) => ({ todos: state.todos, ui: state.ui }),
});
```

## `createPersistMiddleware(config)`

Creates a persist middleware for controlling persistence.

```typescript
import { createPersistMiddleware } from "sveltekitlibrary/redux/persist";

const persistMiddleware = createPersistMiddleware<AppState>({
  key: "my-app",
  types: ["todos/addTodo", "todos/toggleTodo"],
});
```

### Parameters

- `config` (PersistMiddlewareConfig): Configuration object for the middleware.

### Returns

- `Middleware`: A middleware function for persistence control.

### Example

```typescript
import { createPersistMiddleware } from "sveltekitlibrary/redux/persist";
import {
  PERSIST_PAUSE,
  PERSIST_RESUME,
  PERSIST_FLUSH,
} from "sveltekitlibrary/redux";

const persistMiddleware = createPersistMiddleware<AppState>({
  key: "my-app",
});

// Usage
store.dispatch({ type: PERSIST_PAUSE }); // Pause writes
store.dispatch({ type: PERSIST_RESUME }); // Resume writes
store.dispatch({ type: PERSIST_FLUSH }); // Force write
```

## Utility Constants

### Persist Action Types

```typescript
import {
  PERSIST_PAUSE,
  PERSIST_RESUME,
  PERSIST_FLUSH,
  PERSIST_PURGE,
} from "sveltekitlibrary/redux";

// Usage
store.dispatch({ type: PERSIST_PAUSE }); // Pause persistence
store.dispatch({ type: PERSIST_RESUME }); // Resume persistence
store.dispatch({ type: PERSIST_FLUSH }); // Force immediate write
store.dispatch({ type: PERSIST_PURGE }); // Clear persisted data
```

## Common Utility Patterns

### 1. Action Binding Pattern

```typescript
import { bindActionCreators } from "sveltekitlibrary/redux";

const actions = {
  increment: () => ({ type: 'INCREMENT' }),
  decrement: () => ({ type: 'DECREMENT' }),
  addTodo: (text) => ({ type: 'ADD_TODO', payload: text }),
};

// In component
<script lang="ts">
  import { store } from './store';
  import { bindActionCreators } from "sveltekitlibrary/redux";

  const boundActions = bindActionCreators(actions, store.dispatch);

  function handleAddTodo(text) {
    boundActions.addTodo(text);
  }
</script>
```

### 2. Immer Pattern for Complex Updates

```typescript
import { produce } from "sveltekitlibrary/redux";

const complexUpdate = produce(state, (draft) => {
  // Complex nested updates
  draft.nested.array.push(newItem);
  draft.nested.object.property = newValue;
  draft.nested.array = draft.nested.array.map((item) => ({
    ...item,
    updated: true,
  }));
});
```

### 3. Async State Pattern

```typescript
import {
  createAsyncState,
  createAsyncReducer,
} from "sveltekitlibrary/redux/async";

// Create async state
const userState = createAsyncState<User>();

// Create async reducer
const userReducer = createAsyncReducer(fetchUser, {
  pending: (state) => ({ ...state, loading: true }),
  fulfilled: (state, action) => ({
    ...state,
    loading: false,
    data: action.payload,
    error: null,
  }),
  rejected: (state, action) => ({
    ...state,
    loading: false,
    error: action.payload,
  }),
});
```

### 4. Persistence Pattern

```typescript
import {
  createPersistEnhancer,
  createPersistMiddleware,
  createWebStorage,
} from "sveltekitlibrary/redux/persist";

// Create storage
const storage = createWebStorage("local");

// Create enhancer
const persistEnhancer = createPersistEnhancer<AppState>({
  key: "my-app",
  storage,
  version: 2,
  throttle: 250,
});

// Create middleware
const persistMiddleware = createPersistMiddleware<AppState>({
  key: "my-app",
});

// Apply to store
const enhancedStore = createStore(
  rootReducer,
  initialState,
  compose(persistEnhancer, applyMiddleware(persistMiddleware))
);
```

### 5. Selector Memoization Pattern

```typescript
import { shallowEqual } from "sveltekitlibrary/redux";

const memoizedSelector = (state, props) => {
  const cached = cache.get(state, props);
  if (cached) return cached;

  const result = expensiveComputation(state, props);
  cache.set(state, props, result);
  return result;
};

// Use shallowEqual for comparison
const optimizedSelector = (state, props) => {
  if (
    shallowEqual(state.lastState, state) &&
    shallowEqual(state.lastProps, props)
  ) {
    return state.lastResult;
  }

  const result = expensiveComputation(state, props);
  state.lastState = state;
  state.lastProps = props;
  state.lastResult = result;
  return result;
};
```

## Best Practices

### 1. Use Utilities Appropriately

```typescript
// Good: Use bindActionCreators for cleaner code
const boundActions = bindActionCreators(actions, store.dispatch);

// Good: Use produce for complex state updates
const newState = produce(state, (draft) => {
  draft.complex.nested.property = newValue;
});

// Good: Use shallowEqual for performance optimization
if (shallowEqual(oldProps, newProps)) {
  return; // Skip re-render
}
```

### 2. Avoid Overusing Utilities

```typescript
// Bad: Overusing produce for simple updates
const newState = produce(state, (draft) => {
  draft.simpleProperty = newValue; // Could just use spread operator
});

// Good: Use simple spread for simple updates
const newState = { ...state, simpleProperty: newValue };
```

### 3. Cache Wisely

```typescript
// Good: Cache expensive computations
const memoizedExpensiveFunction = memoize(expensiveFunction);

// Bad: Cache simple computations
const memoizedSimpleFunction = memoize(simpleFunction); // Unnecessary overhead
```

For more information about async operations, see the [Async State Management](../guides/async-state-management.md) guide.

# Store API

The store is the heart of your state management system. This library provides two main store creators: `createStore` for standard Redux-like behavior and `createSvelteStore` for Svelte 5 reactive integration.

## `createStore(reducer, preloadedState?, enhancer?)`

Creates a Redux store that holds the complete state tree of your app.

```typescript
import { createStore } from "sveltekitlibrary/redux";

const store = createStore(reducer, initialState);
```

### Parameters

- `reducer` (Function): A reducing function that returns the next state tree, given the current state tree and an action to handle.
- `preloadedState` (any): The initial state. You may optionally specify it to hydrate the state from the server or persistent storage in universal apps.
- `enhancer` (Function): The store enhancer. You may optionally specify it to enhance the store with third-party capabilities like middleware, time travel, persistence, etc.

### Returns

- `Store`: A Redux store that lets you read the state, dispatch actions, and subscribe to changes.

### Example

```typescript
import { createStore } from "sveltekitlibrary/redux";
import { combineReducers } from "sveltekitlibrary/redux";

const rootReducer = combineReducers({
  counter: counterReducer,
  user: userReducer,
});

const store = createStore(rootReducer, initialState);
```

## `createSvelteStore(reducer, preloadedState?, enhancer?)`

Creates a Svelte-aware store that provides reactive state access. This is the recommended store creator for Svelte 5 applications.

```typescript
import { createSvelteStore } from "sveltekitlibrary/redux";

const store = createSvelteStore(reducer, initialState);
// Access state reactively: $derived(store.state)
```

### Parameters

- `reducer` (Function): A reducing function that returns the next state tree.
- `preloadedState` (any): The initial state.
- `enhancer` (Function): The store enhancer.

### Returns

- `SvelteStore`: A store with reactive state access for Svelte 5.

### Features

- **Reactive State**: Access state using Svelte 5's `$derived` rune
- **Automatic Subscriptions**: Components automatically re-render when state changes
- **Svelte Integration**: Built specifically for Svelte 5's reactivity system

### Example

```typescript
import { createSvelteStore } from "sveltekitlibrary/redux";
import { combineReducers } from "sveltekitlibrary/redux";

const rootReducer = combineReducers({
  counter: counterReducer,
  user: userReducer,
});

const store = createSvelteStore(rootReducer, initialState);

// In Svelte components:
<script lang="ts">
  import {store} from './store'; // Access state reactively let counter =
  $derived(store.state.counter); let user = $derived(store.state.user);
</script>;
```

## Store Methods

Both `createStore` and `createSvelteStore` return stores with the following methods:

### `dispatch(action)`

Dispatches an action. This is the only way to trigger a state change.

```typescript
store.dispatch({ type: "INCREMENT", payload: 1 });
```

### `getState()`

Returns the current state tree of your application. It's equal to the last value returned by the store's reducer.

```typescript
const currentState = store.getState();
```

### `subscribe(listener)`

Adds a change listener. It will be called any time an action is dispatched, and some part of the state tree may have changed. You may then call `getState()` to read the current state tree inside the callback.

```typescript
const unsubscribe = store.subscribe(() => {
  console.log("State changed:", store.getState());
});

// Later, to unsubscribe:
unsubscribe();
```

### `replaceReducer(nextReducer)`

Replaces the current reducer with a new one. This is an advanced API that is mainly used for hot reloading and code splitting.

```typescript
store.replaceReducer(newReducer);
```

### `[Symbol.observable]()`

Returns the observable object of the store. This is used by observable libraries like RxJS and Redux Observable.

```typescript
const observable = store[Symbol.observable]();
```

## SvelteStore Specific Methods

The `SvelteStore` extends the basic store with Svelte-specific functionality:

### `state`

A reactive property that provides access to the current state. Use with Svelte 5's `$derived` rune for reactive access.

```typescript
// In Svelte component
<script lang="ts">let state = $derived(store.state);</script>
```

## Best Practices

1. **Use `createSvelteStore` for Svelte apps**: It provides better integration with Svelte's reactivity system
2. **Keep reducers pure**: Reducers should not have side effects
3. **Use middleware for side effects**: Use middleware like `thunkMiddleware` for async operations
4. **Subscribe wisely**: Be careful with subscriptions to avoid memory leaks
5. **Use selectors for derived state**: Create memoized selectors for computed state

## Common Patterns

### Basic Store Setup

```typescript
import { createSvelteStore } from "sveltekitlibrary/redux";
import { combineReducers } from "sveltekitlibrary/redux";
import { applyMiddleware } from "sveltekitlibrary/redux";
import { thunkMiddleware } from "sveltekitlibrary/redux";

const rootReducer = combineReducers({
  counter: counterReducer,
  user: userReducer,
});

const store = createSvelteStore(
  rootReducer,
  initialState,
  applyMiddleware(thunkMiddleware)
);
```

### Store with Middleware

```typescript
import { createSvelteStore } from "sveltekitlibrary/redux";
import { applyMiddleware } from "sveltekitlibrary/redux";
import { thunkMiddleware, loggerMiddleware } from "sveltekitlibrary/redux";

const store = createSvelteStore(
  rootReducer,
  initialState,
  applyMiddleware(thunkMiddleware, loggerMiddleware)
);
```

### Store with Enhancer

```typescript
import { compose } from "sveltekitlibrary/redux";
import { persistEnhancer } from "sveltekitlibrary/redux/persist";

const enhancer = compose(
  persistEnhancer({ key: "my-app" }),
  applyMiddleware(thunkMiddleware)
);

const store = createSvelteStore(rootReducer, initialState, enhancer);
```

For more information about middleware and enhancers, see the [Middleware API](./middleware.md) and [State Persistence](../guides/state-persistence.md) guides.

# Selectors API

Selectors are functions that take the Redux state as an argument and return some data from that state. They can be used for computing derived data, such as filtering a list of items or computing total values.

## `createSelector(...selectors, combiner)`

Creates a memoized selector that only recalculates when its inputs change.

```typescript
import { createSelector } from "sveltekitlibrary/redux";

const selectTodos = (state) => state.todos;
const selectFilter = (state) => state.filter;

const selectVisibleTodos = createSelector(
  selectTodos,
  selectFilter,
  (todos, filter) => {
    switch (filter) {
      case "active":
        return todos.filter((t) => !t.completed);
      case "completed":
        return todos.filter((t) => t.completed);
      default:
        return todos;
    }
  }
);
```

### Parameters

- `...selectors` (Function): Selector functions that extract data from state.
- `combiner` (Function): A function that combines the extracted data into the final result.

### Returns

- `MemoizedSelector`: A memoized selector function.

### Example

```typescript
import { createSelector } from "sveltekitlibrary/redux";

// Basic selectors
const selectUser = (state) => state.user;
const selectPosts = (state) => state.posts;

// Derived selector
const selectUserPosts = createSelector(selectUser, selectPosts, (user, posts) =>
  posts.filter((post) => post.userId === user?.id)
);

// Usage
const userPosts = selectUserPosts(store.getState());
```

## `createStructuredSelector(selectors)`

Creates a selector that returns an object with selector results.

```typescript
import { createStructuredSelector } from "sveltekitlibrary/redux";

const selector = createStructuredSelector({
  todos: (state) => state.todos,
  user: (state) => state.user,
});

// Returns: { todos: [...], user: {...} }
```

### Parameters

- `selectors` (Object): An object where keys are output keys and values are selector functions.

### Returns

- `StructuredSelector`: A selector that returns an object with all selector results.

### Example

```typescript
import { createStructuredSelector } from "sveltekitlibrary/redux";

const appSelector = createStructuredSelector({
  user: (state) => state.user,
  todos: (state) => state.todos,
  stats: createSelector(
    (state) => state.todos,
    (todos) => ({
      total: todos.length,
      completed: todos.filter((t) => t.completed).length,
    })
  ),
});

// Usage
const { user, todos, stats } = appSelector(store.getState());
```

## Selector Best Practices

### 1. Keep Selectors Pure and Simple

```typescript
// Good: Simple, pure selector
const selectTodos = (state) => state.todos;

// Good: Derived but still pure
const selectCompletedTodos = createSelector(selectTodos, (todos) =>
  todos.filter((todo) => todo.completed)
);

// Bad: Side effects in selector
const badSelector = (state) => {
  console.log("Selector called"); // Side effect!
  return state.todos;
};
```

### 2. Use Memoization for Expensive Computations

```typescript
// Good: Memoized selector for expensive computation
const selectExpensiveData = createSelector(
  selectItems,
  selectSettings,
  (items, settings) => {
    // Expensive computation
    return items.map((item) => ({
      ...item,
      processed: processItem(item, settings),
    }));
  }
);
```

### 3. Create Resuable Selectors

```typescript
// Create base selectors
const selectUsers = (state) => state.users;
const selectPosts = (state) => state.posts;

// Create derived selectors
const selectUserById = createSelector(
  selectUsers,
  (users, userId) => users[userId]
);

const selectPostsByUser = createSelector(
  selectPosts,
  selectUserById,
  (posts, user) => posts.filter((post) => post.userId === user?.id)
);
```

## Advanced Selector Patterns

### 1. Parameterized Selectors

```typescript
import { createSelector } from "sveltekitlibrary/redux";

const selectTodosByFilter = createSelector(
  (state) => state.todos,
  (state) => state.filter,
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

// Usage
const activeTodos = selectTodosByFilter(store.getState(), "active");
```

### 2. Nested Selectors

```typescript
import { createSelector } from "sveltekitlibrary/redux";

// Level 1: Basic selectors
const selectUser = (state) => state.user;
const selectPosts = (state) => state.posts;

// Level 2: Derived selectors
const selectUserPosts = createSelector(selectUser, selectPosts, (user, posts) =>
  posts.filter((post) => post.userId === user?.id)
);

// Level 3: Complex derived selector
const selectUserPostStats = createSelector(selectUserPosts, (posts) => ({
  total: posts.length,
  completed: posts.filter((post) => post.completed).length,
  averageLength:
    posts.reduce((sum, post) => sum + post.title.length, 0) / posts.length,
}));
```

### 3. Memoized Selectors with Dependencies

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

### 4. Selectors with Custom Comparators

```typescript
import { createSelector } from "sveltekitlibrary/redux";

const selectUserWithCustomEquality = createSelector(
  (state) => state.user,
  (user) => user,
  {
    memoizeOptions: {
      equalityCheck: (prev, next) =>
        prev?.id === next?.id && prev?.name === next?.name,
    },
  }
);
```

## Using Selectors in Components

### Basic Usage

```typescript
// In Svelte component
<script lang="ts">
  import { store } from './store';
  import { selectVisibleTodos } from './selectors';

  // Use selector with reactive state
  let todos = $derived(selectVisibleTodos(store.state));
</script>

<div>
  {#each todos as todo}
    <div class:completed={todo.completed}>
      {todo.text}
    </div>
  {/each}
</div>
```

### Using Multiple Selectors

```typescript
// In Svelte component
<script lang="ts">
  import { store } from './store';
  import {
    selectUser,
    selectTodos,
    selectTodoStats
  } from './selectors';

  // Use multiple selectors
  let user = $derived(selectUser(store.state));
  let todos = $derived(selectTodos(store.state));
  let stats = $derived(selectTodoStats(store.state));
</script>

<div>
  {#if user}
    <h2>Welcome, {user.name}!</h2>
  {/if}

  <p>Total todos: {stats.total}</p>
  <p>Completed: {stats.completed}</p>

  <ul>
    {#each todos as todo}
      <li>{todo.text}</li>
    {/each}
  </ul>
</div>
```

### Using Structured Selectors

```typescript
// In Svelte component
<script lang="ts">
  import { store } from './store';
  import { appSelector } from './selectors';

  // Use structured selector
  let { user, todos, stats } = $derived(appSelector(store.state));
</script>

<div>
  <h1>Dashboard</h1>

  {#if user}
    <div class="user-info">
      <h2>{user.name}</h2>
      <p>{user.email}</p>
    </div>
  {/if}

  <div class="stats">
    <p>Total: {stats.total}</p>
    <p>Completed: {stats.completed}</p>
  </div>

  <ul class="todos">
    {#each todos as todo}
      <li class:completed={todo.completed}>
        {todo.text}
      </li>
    {/each}
  </ul>
</div>
```

## Selector Recipes

### 1. Todo List Selectors

```typescript
import { createSelector } from "sveltekitlibrary/redux";

// Basic selectors
const selectTodos = (state) => state.todos;
const selectFilter = (state) => state.filter;
const selectSearchTerm = (state) => state.searchTerm;

// Derived selectors
const selectFilteredTodos = createSelector(
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

const selectSearchedTodos = createSelector(
  selectFilteredTodos,
  selectSearchTerm,
  (todos, searchTerm) => {
    if (!searchTerm) return todos;
    return todos.filter((todo) =>
      todo.text.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }
);

const selectTodoStats = createSelector(selectTodos, (todos) => ({
  total: todos.length,
  completed: todos.filter((todo) => todo.completed).length,
  active: todos.filter((todo) => !todo.completed).length,
  completionRate:
    todos.length > 0
      ? Math.round(
          (todos.filter((todo) => todo.completed).length / todos.length) * 100
        )
      : 0,
}));
```

### 2. E-commerce Selectors

```typescript
import { createSelector } from "sveltekitlibrary/redux";

// Basic selectors
const selectProducts = (state) => state.products;
const selectCart = (state) => state.cart;
const selectUser = (state) => state.user;

// Derived selectors
const selectCartItems = createSelector(
  selectCart,
  selectProducts,
  (cart, products) =>
    cart.items.map((item) => ({
      ...item,
      product: products.find((p) => p.id === item.productId),
    }))
);

const selectCartTotal = createSelector(selectCartItems, (items) =>
  items.reduce(
    (total, item) => total + (item.product?.price || 0) * item.quantity,
    0
  )
);

const selectUserOrders = createSelector(
  selectUser,
  (state) => state.orders,
  (user, orders) => orders.filter((order) => order.userId === user?.id)
);
```

### 3. Form Selectors

```typescript
import { createSelector } from "sveltekitlibrary/redux";

// Basic selectors
const selectFormValues = (state) => state.form.values;
const selectFormErrors = (state) => state.form.errors;
const selectFormTouched = (state) => state.form.touched;

// Derived selectors
const selectFormValidity = createSelector(
  selectFormValues,
  selectFormErrors,
  (values, errors) => {
    const isValid = Object.keys(errors).every((key) => !errors[key]);
    return { isValid, errors };
  }
);

const selectFormDirty = createSelector(
  selectFormValues,
  selectFormTouched,
  (values, touched) => {
    const dirtyFields = Object.keys(touched).filter((key) => touched[key]);
    return dirtyFields.length > 0;
  }
);
```

## Performance Optimization

### 1. Use Memoization Wisely

```typescript
// Good: Memoize expensive computations
const selectExpensiveData = createSelector(
  selectItems,
  selectSettings,
  (items, settings) => {
    // Expensive computation
    return items.map((item) => expensiveOperation(item, settings));
  }
);

// Bad: Don't memoize simple operations
const selectSimpleData = createSelector(
  selectItems,
  (items) => items.map((item) => item.id) // Simple operation, no need for memoization
);
```

### 2. Select Only What You Need

```typescript
// Good: Select only required fields
const selectUserSummary = createSelector(selectUser, (user) => ({
  id: user.id,
  name: user.name,
  avatar: user.avatar,
}));

// Bad: Select entire user object
const selectUserFull = createSelector(
  selectUser,
  (user) => user // Unnecessary re-render if only some fields are used
);
```

### 3. Use Selector Composition

```typescript
// Good: Build selectors from smaller ones
const selectUser = (state) => state.user;
const selectPosts = (state) => state.posts;
const selectUserPosts = createSelector(selectUser, selectPosts, (user, posts) =>
  posts.filter((post) => post.userId === user?.id)
);

const selectUserPostCount = createSelector(
  selectUserPosts,
  (posts) => posts.length
);
```

For more information about async operations, see the [Async State Management](../guides/async-state-management.md) guide.

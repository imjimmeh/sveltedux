# Entity Adapter API

Entity adapters are utilities that help manage normalized state in Redux applications. They provide a standardized way to store and manipulate collections of entities with common CRUD operations and memoized selectors.

## Overview

Entity adapters provide:

- Standardized state structure (`{ ids: [], entities: {} }`)
- CRUD operations (add, remove, update, upsert)
- Memoized selectors for common queries
- Sorting capabilities
- Custom ID selection

## `createEntityAdapter<T, Id>(options?)`

Creates an entity adapter for managing a collection of entities.

```typescript
import { createEntityAdapter } from "sveltekitlibrary/redux";

interface User {
  id: number;
  name: string;
  email: string;
}

const userAdapter = createEntityAdapter<User>();
const initialState = userAdapter.getInitialState();
```

### Parameters

- `options` (Object, optional): Configuration options
  - `selectId` (Function, optional): Function to select the ID from an entity. Defaults to `entity => entity.id`.
  - `sortComparer` (Function, optional): Function to sort entities. Defaults to no sorting.

### Returns

- `EntityAdapter`: An object with selectors and reducer methods.

### Example with Custom Options

```typescript
import { createEntityAdapter } from "sveltekitlibrary/redux";

interface Book {
  isbn: string;
  title: string;
  author: string;
}

// Custom ID selector
const bookAdapter = createEntityAdapter<Book, string>({
  selectId: (book) => book.isbn,
  sortComparer: (a, b) => a.title.localeCompare(b.title),
});

const initialState = bookAdapter.getInitialState();
```

## Entity Adapter Methods

### Selectors

#### `selectCollection(state)`

Selects the entire entity state.

```typescript
const collection = userAdapter.selectCollection(state);
// Returns: { ids: [1, 2], entities: { 1: { id: 1, name: "John" }, 2: { id: 2, name: "Jane" } } }
```

#### `selectIds(state)`

Selects the array of entity IDs.

```typescript
const ids = userAdapter.selectIds(state);
// Returns: [1, 2]
```

#### `selectEntities(state)`

Selects the entities lookup table.

```typescript
const entities = userAdapter.selectEntities(state);
// Returns: { 1: { id: 1, name: "John" }, 2: { id: 2, name: "Jane" } }
```

#### `selectAll(state)`

Selects all entities as an array.

```typescript
const allUsers = userAdapter.selectAll(state);
// Returns: [{ id: 1, name: "John" }, { id: 2, name: "Jane" }]
```

#### `selectTotal(state)`

Selects the total number of entities.

```typescript
const total = userAdapter.selectTotal(state);
// Returns: 2
```

#### `selectById(state, id)`

Selects a single entity by ID.

```typescript
const user = userAdapter.selectById(state, 1);
// Returns: { id: 1, name: "John" }
```

### Reducer Methods

#### `addOne(state, action)`

Adds one entity to the state.

```typescript
const user = { id: 3, name: "Bob", email: "bob@example.com" };
const action = { type: "ADD_USER", payload: user };
const newState = userAdapter.addOne(state, action);
```

#### `addMany(state, action)`

Adds multiple entities to the state.

```typescript
const users = [
  { id: 3, name: "Bob", email: "bob@example.com" },
  { id: 4, name: "Alice", email: "alice@example.com" },
];
const action = { type: "ADD_USERS", payload: users };
const newState = userAdapter.addMany(state, action);
```

#### `setOne(state, action)`

Sets one entity in the state (adds if not present, replaces if present).

```typescript
const user = { id: 1, name: "Johnny", email: "johnny@example.com" };
const action = { type: "SET_USER", payload: user };
const newState = userAdapter.setOne(state, action);
```

#### `setMany(state, action)`

Sets multiple entities in the state.

```typescript
const users = [
  { id: 1, name: "Johnny", email: "johnny@example.com" },
  { id: 2, name: "Janet", email: "janet@example.com" },
];
const action = { type: "SET_USERS", payload: users };
const newState = userAdapter.setMany(state, action);
```

#### `removeOne(state, action)`

Removes one entity from the state.

```typescript
const action = { type: "REMOVE_USER", payload: 1 };
const newState = userAdapter.removeOne(state, action);
```

#### `removeMany(state, action)`

Removes multiple entities from the state.

```typescript
const action = { type: "REMOVE_USERS", payload: [1, 2] };
const newState = userAdapter.removeMany(state, action);
```

#### `updateOne(state, action)`

Updates one entity in the state.

```typescript
const action = {
  type: "UPDATE_USER",
  payload: { id: 1, changes: { name: "Johnny" } },
};
const newState = userAdapter.updateOne(state, action);
```

#### `updateMany(state, action)`

Updates multiple entities in the state.

```typescript
const action = {
  type: "UPDATE_USERS",
  payload: [
    { id: 1, changes: { name: "Johnny" } },
    { id: 2, changes: { email: "janet@example.com" } },
  ],
};
const newState = userAdapter.updateMany(state, action);
```

#### `upsertOne(state, action)`

Upserts one entity (adds if not present, updates if present).

```typescript
const user = { id: 3, name: "Bob", email: "bob@example.com" };
const action = { type: "UPSERT_USER", payload: user };
const newState = userAdapter.upsertOne(state, action);
```

#### `upsertMany(state, action)`

Upserts multiple entities.

```typescript
const users = [
  { id: 1, name: "Johnny", email: "johnny@example.com" },
  { id: 3, name: "Bob", email: "bob@example.com" },
];
const action = { type: "UPSERT_USERS", payload: users };
const newState = userAdapter.upsertMany(state, action);
```

#### `removeAll(state, action?)`

Removes all entities from the state.

```typescript
const newState = userAdapter.removeAll(state);
```

#### `getInitialState()`

Returns the initial state for the entity collection.

```typescript
const initialState = userAdapter.getInitialState();
// Returns: { ids: [], entities: {} }
```

## Using with createSlice

Entity adapters work seamlessly with `createSlice`:

```typescript
import { createSlice } from "sveltekitlibrary/redux";
import { createEntityAdapter } from "sveltekitlibrary/redux";

interface User {
  id: number;
  name: string;
  email: string;
}

const userAdapter = createEntityAdapter<User>();
const userSelectors = {
  selectAll: userAdapter.selectAll,
  selectById: userAdapter.selectById,
  selectTotal: userAdapter.selectTotal,
};

const userSlice = createSlice({
  name: "users",
  initialState: userAdapter.getInitialState(),
  reducers: {
    // Use adapter methods directly as reducers
    addUser: userAdapter.addOne,
    addUsers: userAdapter.addMany,
    removeUser: userAdapter.removeOne,
    removeUsers: userAdapter.removeMany,
    updateUser: userAdapter.updateOne,
    updateUsers: userAdapter.updateMany,
    upsertUser: userAdapter.upsertOne,
    upsertUsers: userAdapter.upsertMany,
    setUsers: userAdapter.setMany,
    clearUsers: userAdapter.removeAll,
  },
});

// Export actions
export const {
  addUser,
  addUsers,
  removeUser,
  removeUsers,
  updateUser,
  updateUsers,
  upsertUser,
  upsertUsers,
  setUsers,
  clearUsers,
} = userSlice.actions;

// Export selectors
export const { selectAll, selectById, selectTotal } = userSelectors;

// Export reducer
export default userSlice.reducer;
```

## Using Selectors

Selectors can be used with `createSelector` for more complex queries:

```typescript
import { createSelector } from "sveltekitlibrary/redux";

const selectUsers = (state: AppState) => state.users;

const selectActiveUsers = createSelector(userAdapter.selectAll, (users) =>
  users.filter((user) => user.active)
);

const selectUserByEmail = createSelector(
  userAdapter.selectEntities,
  (state: AppState, email: string) => email,
  (entities, email) => {
    return Object.values(entities).find((user) => user.email === email);
  }
);
```

## Sorting Entities

Entities can be automatically sorted by providing a `sortComparer`:

```typescript
const userAdapter = createEntityAdapter<User>({
  sortComparer: (a, b) => a.name.localeCompare(b.name),
});

// Entities will always be sorted by name
const users = userAdapter.selectAll(state);
// Returns users sorted alphabetically by name
```

## Custom ID Selection

For entities with non-standard ID properties:

```typescript
interface Book {
  isbn: string;
  title: string;
  author: string;
}

const bookAdapter = createEntityAdapter<Book, string>({
  selectId: (book) => book.isbn,
});

// Now entities are indexed by ISBN instead of ID
```

## Best Practices

### 1. Use with Immer

Entity adapters work well with Immer for complex state updates:

```typescript
const userSlice = createSlice({
  name: "users",
  initialState: userAdapter.getInitialState(),
  reducers: {
    // Complex update with additional logic
    promoteUser: (state, action) => {
      const { id } = action.payload;
      if (id in state.entities) {
        state.entities[id].role = "admin";
        // Re-sort if using sortComparer
        if (userAdapter.sortComparer) {
          state.ids = userAdapter.sortIds(state.ids, state.entities);
        }
      }
    },
  },
});
```

### 2. Combine with Async State

Use entity adapters with async state management:

```typescript
import { createAsyncThunk, createSlice } from "sveltekitlibrary/redux";
import { createEntityAdapter } from "sveltekitlibrary/redux";

const userAdapter = createEntityAdapter<User>();

const fetchUsers = createAsyncThunk("users/fetchUsers", async () => {
  const response = await fetch("/api/users");
  return response.json();
});

const userSlice = createSlice({
  name: "users",
  initialState: {
    ...userAdapter.getInitialState(),
    loading: false,
    error: null,
  },
  reducers: {
    // ... entity reducers
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUsers.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.loading = false;
        userAdapter.setMany(state, {
          type: "SET_USERS",
          payload: action.payload,
        });
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      });
  },
});
```

### 3. Performance Optimization

Use selectors for memoized access to entity data:

```typescript
// Good: Memoized selectors
const selectUserCount = createSelector(
  userAdapter.selectTotal,
  (total) => total
);

// Good: Composed selectors
const selectActiveUserCount = createSelector(
  userAdapter.selectAll,
  (users) => users.filter((user) => user.active).length
);
```

## Common Patterns

### 1. Entity Relationships

Manage related entities with separate adapters:

```typescript
const userAdapter = createEntityAdapter<User>();
const postAdapter = createEntityAdapter<Post>();

const rootReducer = combineReducers({
  users: userAdapter.getInitialState(),
  posts: postAdapter.getInitialState(),
});

// Selectors for relationships
const selectUserPosts = createSelector(
  postAdapter.selectAll,
  (state: AppState, userId: number) => userId,
  (posts, userId) => posts.filter((post) => post.userId === userId)
);
```

### 2. Pagination

Combine with pagination patterns:

```typescript
interface PaginatedState extends EntityState<User> {
  currentPage: number;
  totalPages: number;
  totalCount: number;
}

const userAdapter = createEntityAdapter<User>();

const fetchUsersPage = createAsyncThunk(
  "users/fetchPage",
  async (page: number) => {
    const response = await fetch(`/api/users?page=${page}`);
    return response.json();
  }
);

const userSlice = createSlice({
  name: "users",
  initialState: {
    ...userAdapter.getInitialState(),
    currentPage: 1,
    totalPages: 0,
    totalCount: 0,
  } as PaginatedState,
  reducers: {
    // ... entity reducers
  },
  extraReducers: (builder) => {
    builder.addCase(fetchUsersPage.fulfilled, (state, action) => {
      const { data, currentPage, totalPages, totalCount } = action.payload;
      userAdapter.setMany(state, { type: "SET_USERS", payload: data });
      state.currentPage = currentPage;
      state.totalPages = totalPages;
      state.totalCount = totalCount;
    });
  },
});
```

Entity adapters provide a powerful and standardized way to manage collections of entities in Redux applications, reducing boilerplate and improving performance through memoization.

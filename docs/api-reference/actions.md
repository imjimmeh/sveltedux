# Actions API

Actions are plain JavaScript objects that send data from your application to your store. They are the only source of information for the store. You send them to the store using `store.dispatch()`.

## `createAction(type)`

Creates an action creator function for the given action type.

```typescript
import { createAction } from "sveltekitlibrary/redux";

const increment = createAction<number>("INCREMENT");
const action = increment(1); // { type: 'INCREMENT', payload: 1 }
```

### Parameters

- `type` (string): The action type string.
- `payloadType` (optional): Type for the payload (inferred from usage).

### Returns

- `ActionCreator`: A function that creates actions with the specified type.

### Example

```typescript
import { createAction } from "sveltekitlibrary/redux";

const increment = createAction<number>("INCREMENT");
const decrement = createAction<number>("DECREMENT");

// Usage
const incrementAction = increment(5); // { type: 'INCREMENT', payload: 5 }
const decrementAction = decrement(3); // { type: 'DECREMENT', payload: 3 }
```

## `createActions(actionMap)`

Creates multiple action creators from an object map.

```typescript
import { createActions } from "sveltekitlibrary/redux";

const actions = createActions({
  increment: undefined,
  add: 0,
  setName: "",
});
```

### Parameters

- `actionMap` (Object): An object where keys are action names and values are default payloads.

### Returns

- `ActionsObject`: An object containing action creators.

### Example

```typescript
import { createActions } from "sveltekitlibrary/redux";

const actions = createActions({
  increment: undefined,
  add: 0,
  setName: "",
  toggleTodo: false,
});

// Usage
const incrementAction = actions.increment(); // { type: 'increment', payload: undefined }
const addAction = actions.add(5); // { type: 'add', payload: 5 }
const setNameAction = actions.setName("John"); // { type: 'setName', payload: 'John' }
```

## `createAsyncThunk(typePrefix, payloadCreator, options?)`

Creates an async action creator that handles promise lifecycle. This is the recommended way to handle async operations like API calls.

```typescript
import { createAsyncThunk } from "sveltekitlibrary/redux/async";

const fetchUser = createAsyncThunk<User, number>(
  "user/fetchUser",
  async (userId, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/users/${userId}`);
      return response.json();
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);
```

### Parameters

- `typePrefix` (string): A string prefix for the action types (e.g., "user/fetchUser").
- `payloadCreator` (Function): An async function that returns a promise or rejects with an error.
- `options` (Object): Optional configuration object.

### Options

- `condition` (Function): A function that determines if the thunk should be executed.
- `dispatch` (Function): Access to the store's dispatch function.
- `getState` (Function): Access to the store's state.
- `rejectWithValue` (Function): Function to reject with a custom value.
- `fulfillWithValue` (Function): Function to fulfill with a custom value.

### Returns

- `AsyncThunkActionCreator`: A function that can be dispatched to trigger the async operation.

### Example

```typescript
import { createAsyncThunk } from "sveltekitlibrary/redux/async";

const fetchUser = createAsyncThunk<User, number>(
  "user/fetchUser",
  async (userId, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/users/${userId}`);

      if (!response.ok) {
        return rejectWithValue(`Failed to fetch user: ${response.status}`);
      }

      const user = await response.json();
      return user;
    } catch (error) {
      return rejectWithValue(`Network error: ${error.message}`);
    }
  }
);

// Usage in reducer
const userSlice = createSlice({
  name: "user",
  initialState: null as User | null,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchUser.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchUser.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
      })
      .addCase(fetchUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});
```

## Action Structure

All actions created by these utilities follow this structure:

```typescript
{
  type: string,
  payload?: any,
  meta?: any,
  error?: any
}
```

### Action Types

The library generates three action types for async thunks:

- `pending`: When the async operation starts
- `fulfilled`: When the async operation succeeds
- `rejected`: When the async operation fails

### Example with Full Lifecycle

```typescript
import { createAsyncThunk } from "sveltekitlibrary/redux/async";

const fetchTodos = createAsyncThunk<Todo[], void>(
  "todos/fetchTodos",
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch("/api/todos");
      if (!response.ok) {
        throw new Error("Failed to fetch todos");
      }
      return response.json();
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// In reducer
const todosSlice = createSlice({
  name: "todos",
  initialState: [] as Todo[],
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchTodos.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTodos.fulfilled, (state, action) => {
        state.loading = false;
        state.todos = action.payload;
      })
      .addCase(fetchTodos.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});
```

## Best Practices

1. **Use meaningful type prefixes**: Use domain/action format like "user/fetchUser"
2. **Handle errors properly**: Use `rejectWithValue` for error handling
3. **Use createSlice for reducers**: It automatically handles action types
4. **Keep payload creators simple**: Focus on the async logic, not state management
5. **Use TypeScript**: Define clear interfaces for your data types

## Common Patterns

### Basic Action Creator

```typescript
import { createAction } from "sveltekitlibrary/redux";

const addTodo = createAction<{ text: string }>("ADD_TODO");

// Usage
store.dispatch(addTodo({ text: "Learn Redux" }));
```

### Async Action with Loading State

```typescript
import { createAsyncThunk } from "sveltekitlibrary/redux/async";

const fetchUser = createAsyncThunk<User, number>(
  "user/fetchUser",
  async (userId, { rejectWithValue }) => {
    const response = await fetch(`/api/users/${userId}`);
    if (!response.ok) {
      return rejectWithValue("User not found");
    }
    return response.json();
  }
);

// In component
function loadUser(userId: number) {
  store.dispatch(fetchUser(userId));
}
```

### Batch Actions

```typescript
import { createActions } from "sveltekitlibrary/redux";

const todoActions = createActions({
  add: { text: "" },
  toggle: { id: 0, completed: false },
  remove: { id: 0 },
});

// Usage
store.dispatch(todoActions.add({ text: "New todo" }));
store.dispatch(todoActions.toggle({ id: 1, completed: true }));
store.dispatch(todoActions.remove({ id: 1 }));
```

For more information about using actions with reducers, see the [Reducers API](./reducers.md) documentation.

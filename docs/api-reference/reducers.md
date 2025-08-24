# Reducers API

Reducers are functions that take the current state and an action as arguments, and return a new state. They are the only way to change state in a Redux-like application.

## `createReducer(initialState, handlers)`

Creates a reducer function with a map of action handlers.

```typescript
import { createReducer, createAction } from "sveltekitlibrary/redux";

const increment = createAction<number>("INCREMENT");

const counterReducer = createReducer(0, {
  [increment.type]: (state, action) => state + action.payload,
});
```

### Parameters

- `initialState` (any): The initial state for the reducer.
- `handlers` (Object): An object mapping action types to reducer functions.

### Returns

- `ReducerFunction`: A reducer function that can be used in your store.

### Example

```typescript
import { createReducer, createAction } from "sveltekitlibrary/redux";

const increment = createAction<number>("INCREMENT");
const decrement = createAction<number>("DECREMENT");
const reset = createAction("RESET");

const counterReducer = createReducer(0, {
  [increment.type]: (state, action) => state + action.payload,
  [decrement.type]: (state, action) => state - action.payload,
  [reset.type]: () => 0,
});
```

## `combineReducers(reducers)`

Combines multiple reducers into a single reducer function by each reducer maintaining its own independent state branch.

```typescript
import { combineReducers } from "sveltekitlibrary/redux";

const rootReducer = combineReducers({
  counter: counterReducer,
  user: userReducer,
});
```

### Parameters

- `reducers` (Object): An object where keys are state property names and values are reducer functions.

### Returns

- `ReducerFunction`: A reducer function that combines all provided reducers.

### Example

```typescript
import { combineReducers } from "sveltekitlibrary/redux";

const rootReducer = combineReducers({
  counter: counterReducer,
  user: userReducer,
  todos: todosReducer,
});

// State structure:
{
  counter: number,
  user: UserState,
  todos: TodoState[]
}
```

## `createSlice(config)`

Creates a slice of state with actions and a reducer. This is the recommended way to create reducers and actions together.

```typescript
import { createSlice } from "sveltekitlibrary/redux";

const todoSlice = createSlice({
  name: "todos",
  initialState: [] as string[],
  reducers: {
    add: (state, action) => {
      state.push(action.payload);
    },
    remove: (state, action) => {
      return state.filter((_, i) => i !== action.payload);
    },
  },
});
```

### Parameters

- `config` (Object): Configuration object for the slice.

### Configuration Options

- `name` (string): The name prefix for action types.
- `initialState` (any): The initial state for this slice.
- `reducers` (Object): An object mapping action names to reducer functions.
- `extraReducers` (Function): A function that receives a `builder` object to add cases for actions defined outside the slice.

### Returns

- `SliceObject`: An object containing the reducer and actions.

### Slice Object Properties

- `name`: The slice name.
- `reducer`: The reducer function for this slice.
- `actions`: An object containing action creators.
- `actionTypes`: An object containing action type strings.

### Example

```typescript
import { createSlice } from "sveltekitlibrary/redux";

interface Todo {
  id: number;
  text: string;
  completed: boolean;
}

interface TodoState {
  todos: Todo[];
  loading: boolean;
}

const todoSlice = createSlice({
  name: "todos",
  initialState: {
    todos: [] as Todo[],
    loading: false,
  } as TodoState,
  reducers: {
    addTodo: (state, action) => {
      state.todos.push({
        id: Date.now(),
        text: action.payload.text,
        completed: false,
      });
    },
    toggleTodo: (state, action) => {
      const todo = state.todos.find((t) => t.id === action.payload.id);
      if (todo) {
        todo.completed = !todo.completed;
      }
    },
    removeTodo: (state, action) => {
      state.todos = state.todos.filter((t) => t.id !== action.payload.id);
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTodos.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchTodos.fulfilled, (state, action) => {
        state.loading = false;
        state.todos = action.payload;
      })
      .addCase(fetchTodos.rejected, (state) => {
        state.loading = false;
      });
  },
});

// Exports:
// todoSlice.name: 'todos'
// todoSlice.reducer: Reducer function
// todoSlice.actions: { addTodo, toggleTodo, removeTodo, setLoading }
// todoSlice.actionTypes: { addTodo: 'todos/addTodo', toggleTodo: 'todos/toggleTodo', etc. }
```

## Reducer Best Practices

### 1. Keep Reducers Pure

Reducers must be pure functions:

```typescript
// Good: Pure reducer
const counterReducer = createReducer(0, {
  INCREMENT: (state, action) => state + action.payload,
});

// Bad: Impure reducer (modifies state directly)
const badReducer = createReducer(0, {
  INCREMENT: (state, action) => {
    state += action.payload; // Mutates state!
    return state;
  },
});
```

### 2. Handle Immutable Updates

Always return new objects/arrays when state changes:

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
});
```

### 3. Use Immer for Complex Updates

For complex state updates, consider using Immer:

```typescript
import { produce } from "sveltekitlibrary/redux";

const complexReducer = createReducer(initialState, {
  COMPLEX_UPDATE: (state, action) =>
    produce(state, (draft) => {
      // Mutate draft - Immer handles immutability
      draft.nested.property = action.payload;
    }),
});
```

### 4. Use createSlice for Most Cases

```typescript
const userSlice = createSlice({
  name: "user",
  initialState: null as User | null,
  reducers: {
    setUser: (state, action) => action.payload,
    clearUser: () => null,
  },
});
```

### 5. Handle Async Actions with extraReducers

```typescript
const userSlice = createSlice({
  name: "user",
  initialState: null as User | null,
  reducers: {
    clearUser: () => null,
  },
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

## Advanced Patterns

### Nested Reducers

```typescript
const appReducer = combineReducers({
  users: userReducer,
  posts: postReducer,
  comments: commentReducer,
});
```

### Dynamic Reducers

```typescript
const dynamicReducer = createReducer(initialState, {
  [action.type]: (state, action) => {
    // Handle dynamic action types
    return { ...state, [action.key]: action.value };
  },
});
```

### Conditional Updates

```typescript
const conditionalReducer = createReducer(initialState, {
  UPDATE_IF_EXISTS: (state, action) => {
    if (state[action.key] !== undefined) {
      return { ...state, [action.key]: action.payload };
    }
    return state;
  },
});
```

### Default Case Handling

```typescript
const robustReducer = createReducer(initialState, {
  [action.type]: (state, action) => {
    // Handle specific action types
    switch (action.type) {
      case "INCREMENT":
        return { ...state, count: state.count + 1 };
      case "DECREMENT":
        return { ...state, count: state.count - 1 };
      default:
        return state; // Always return state for unknown actions
    }
  },
});
```

## Common Reducer Patterns

### Counter Reducer

```typescript
import { createReducer, createAction } from "sveltekitlibrary/redux";

const increment = createAction<number>("INCREMENT");
const decrement = createAction<number>("DECREMENT");
const reset = createAction("RESET");

const counterReducer = createReducer(0, {
  [increment.type]: (state, action) => state + action.payload,
  [decrement.type]: (state, action) => state - action.payload,
  [reset.type]: () => 0,
});
```

### Todo List Reducer

```typescript
import { createSlice } from "sveltekitlibrary/redux";

interface Todo {
  id: number;
  text: string;
  completed: boolean;
}

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
    removeTodo: (state, action) => {
      return state.filter((t) => t.id !== action.payload.id);
    },
  },
});
```

### Form State Reducer

```typescript
import { createSlice } from "sveltekitlibrary/redux";

interface FormState {
  values: Record<string, any>;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
}

const formSlice = createSlice({
  name: "form",
  initialState: {
    values: {},
    errors: {},
    touched: {},
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
    resetForm: (state) => {
      state.values = {};
      state.errors = {};
      state.touched = {};
    },
  },
});
```

For more information about combining reducers, see the [Store API](./store.md) documentation.

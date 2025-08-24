# TypeScript Support

The library provides comprehensive TypeScript support. All functions are fully typed with proper generics and interfaces to ensure type safety throughout your application.

## Basic Type Definitions

### State Interfaces

```typescript
interface AppState {
  counter: number;
  user: { name: string } | null;
  todos: Todo[];
  loading: boolean;
}

interface Todo {
  id: number;
  text: string;
  completed: boolean;
}
```

### Action Types

```typescript
interface IncrementAction {
  type: "INCREMENT";
  payload: number;
}

interface AddTodoAction {
  type: "ADD_TODO";
  payload: { text: string };
}

type AppAction = IncrementAction | AddTodoAction;
```

## Typed Actions

### Using `createAction` with TypeScript

```typescript
import { createAction } from "sveltekitlibrary/redux";

const increment = createAction<number>("INCREMENT");
// Type of increment: (payload: number) => { type: 'INCREMENT', payload: number }

const action = increment(5); // { type: 'INCREMENT', payload: 5 }
```

### Using `createActions` with TypeScript

```typescript
import { createActions } from "sveltekitlibrary/redux";

const actions = createActions({
  increment: undefined,
  add: 0,
  setName: "",
});

// Types are inferred:
// actions.increment: () => { type: 'increment', payload: undefined }
// actions.add: (payload: number) => { type: 'add', payload: number }
// actions.setName: (payload: string) => { type: 'setName', payload: string }
```

### Using `createAsyncThunk` with TypeScript

```typescript
import { createAsyncThunk } from "sveltekitlibrary/redux/async";

interface User {
  id: number;
  name: string;
  email: string;
}

interface FetchUserParams {
  userId: number;
  includeDetails?: boolean;
}

const fetchUser = createAsyncThunk<User, FetchUserParams>(
  "user/fetchUser",
  async ({ userId, includeDetails = false }, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/users/${userId}`);
      if (!response.ok) {
        return rejectWithValue(`Failed to fetch user: ${response.status}`);
      }

      const user = await response.json();

      if (includeDetails) {
        // Fetch additional details
        const detailsResponse = await fetch(`/api/users/${userId}/details`);
        if (detailsResponse.ok) {
          user.details = await detailsResponse.json();
        }
      }

      return user;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);
```

## Typed Reducers

### Using `createReducer` with TypeScript

```typescript
import { createReducer, createAction } from "sveltekitlibrary/redux";

const increment = createAction<number>("INCREMENT");

interface CounterState {
  count: number;
}

const counterReducer = createReducer<CounterState>(
  { count: 0 },
  {
    [increment.type]: (state, action: ReturnType<typeof increment>) => ({
      count: state.count + action.payload,
    }),
  }
);
```

### Using `createSlice` with TypeScript

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
  error: string | null;
}

const todoSlice = createSlice({
  name: "todos",
  initialState: {
    todos: [] as Todo[],
    loading: false,
    error: null as string | null,
  } as TodoState,
  reducers: {
    addTodo: (state, action: { payload: { text: string } }) => {
      state.todos.push({
        id: Date.now(),
        text: action.payload.text,
        completed: false,
      });
    },
    toggleTodo: (state, action: { payload: { id: number } }) => {
      const todo = state.todos.find((t) => t.id === action.payload.id);
      if (todo) {
        todo.completed = !todo.completed;
      }
    },
    removeTodo: (state, action: { payload: { id: number } }) => {
      state.todos = state.todos.filter((t) => t.id !== action.payload.id);
    },
    setLoading: (state, action: { payload: boolean }) => {
      state.loading = action.payload;
    },
    setError: (state, action: { payload: string | null }) => {
      state.error = action.payload;
    },
  },
});
```

## Typed Selectors

### Basic Typed Selectors

```typescript
import { createSelector } from "sveltekitlibrary/redux";

interface AppState {
  todos: Todo[];
  filter: "all" | "active" | "completed";
}

const selectTodos = (state: AppState) => state.todos;
const selectFilter = (state: AppState) => state.filter;

const selectVisibleTodos = createSelector(
  selectTodos,
  selectFilter,
  (todos: Todo[], filter: "all" | "active" | "completed") => {
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
```

### Typed Structured Selectors

```typescript
import { createStructuredSelector } from "sveltekitlibrary/redux";

interface AppState {
  user: User | null;
  todos: Todo[];
  settings: AppSettings;
}

const selector = createStructuredSelector<AppState>({
  user: (state) => state.user,
  todos: (state) => state.todos,
  settings: (state) => state.settings,
});

// Usage:
const { user, todos, settings } = selector(store.getState());
```

## Typed Middleware

### Custom Typed Middleware

```typescript
import { type Middleware } from "sveltekitlibrary/redux";

interface MyState {
  user: User | null;
  loading: boolean;
}

const myMiddleware: Middleware<MyState> =
  ({ dispatch, getState }) =>
  (next) =>
  (action) => {
    const state = getState();

    if (action.type === "FETCH_USER") {
      console.log("Current user:", state.user);
    }

    return next(action);
  };
```

### Async Thunk Middleware

```typescript
import { type AsyncThunkMiddleware } from "sveltekitlibrary/redux/async";

interface RootState {
  user: UserState;
  loading: boolean;
}

const asyncThunkMiddleware: AsyncThunkMiddleware<RootState> =
  ({ dispatch, getState }) =>
  (next) =>
  (action) => {
    const state = getState();

    if (action.type.endsWith("/pending")) {
      console.log("Async operation started:", action.type);
    }

    return next(action);
  };
```

## Typed Store

### Creating Typed Store

```typescript
import { createSvelteStore } from "sveltekitlibrary/redux";

interface AppState {
  counter: number;
  user: User | null;
  todos: Todo[];
}

const rootReducer = combineReducers<AppState>({
  counter: counterReducer,
  user: userReducer,
  todos: todosReducer,
});

const store = createSvelteStore<AppState>(rootReducer, initialState);
```

### Using Typed Store in Components

```typescript
// In Svelte component
<script lang="ts">
  import {store} from './store'; import type {AppState} from './types'; // Typed
  state access let state = $derived(store.state) as AppState; let counter =
  $derived(store.state.counter); let user = $derived(store.state.user); let
  todos = $derived(store.state.todos);
</script>
```

## Advanced TypeScript Patterns

### Generic Actions

```typescript
import { createAction } from "sveltekitlibrary/redux";

interface GenericAction<T = any> {
  type: string;
  payload: T;
  meta?: any;
  error?: any;
}

const createGenericAction = <T>(type: string) => createAction<T>(type);

const setTodo = createGenericAction<{ text: string; completed: boolean }>(
  "SET_TODO"
);
const action = setTodo({ text: "Learn TypeScript", completed: false });
```

### Discriminated Unions for Actions

```typescript
type AppAction =
  | { type: "INCREMENT"; payload: number }
  | { type: "DECREMENT"; payload: number }
  | { type: "ADD_TODO"; payload: { text: string } }
  | { type: "TOGGLE_TODO"; payload: { id: number } }
  | { type: "SET_USER"; payload: User | null };

const actionReducer = createReducer<AppState, AppAction>(initialState, {
  INCREMENT: (state, action) => ({
    ...state,
    counter: state.counter + action.payload,
  }),
  DECREMENT: (state, action) => ({
    ...state,
    counter: state.counter - action.payload,
  }),
  ADD_TODO: (state, action) => ({
    ...state,
    todos: [
      ...state.todos,
      { id: Date.now(), text: action.payload.text, completed: false },
    ],
  }),
  TOGGLE_TODO: (state, action) => ({
    ...state,
    todos: state.todos.map((todo) =>
      todo.id === action.payload.id
        ? { ...todo, completed: !todo.completed }
        : todo
    ),
  }),
  SET_USER: (state, action) => ({ ...state, user: action.payload }),
});
```

### Async Thunk with Generics

```typescript
import { createAsyncThunk } from "sveltekitlibrary/redux/async";

interface PaginatedParams {
  page: number;
  limit: number;
}

interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  hasMore: boolean;
}

const fetchPaginatedData = createAsyncThunk<
  PaginatedResult<User>, // Return type
  PaginatedParams, // Thunk argument type
  { rejectValue: string } // Reject value type
>("users/fetchPaginated", async ({ page, limit }, { rejectWithValue }) => {
  try {
    const response = await fetch(`/api/users?page=${page}&limit=${limit}`);
    if (!response.ok) {
      return rejectWithValue("Failed to fetch users");
    }
    return response.json();
  } catch (error) {
    return rejectWithValue(error.message);
  }
});
```

### Typed Selectors with Generics

```typescript
import { createSelector } from "sveltekitlibrary/redux";

interface EntityState<T> {
  entities: { [id: string]: T };
  ids: string[];
  loading: boolean;
  error: string | null;
}

const selectEntities = <T>(state: EntityState<T>) => state.entities;
const selectIds = <T>(state: EntityState<T>) => state.ids;

const selectAllEntities = <T>(state: EntityState<T>) =>
  selectIds(state).map((id) => selectEntities(state)[id]);

const selectEntityById = <T>(state: EntityState<T>, id: string) =>
  selectEntities(state)[id];
```

## Utility Types

### Action Payload Types

```typescript
import { type Action } from "sveltekitlibrary/redux";

// Extract payload type from action type
type ExtractPayload<T extends Action> = T extends { payload: infer P }
  ? P
  : never;

// Extract action type from action creator
type ActionType<T extends (...args: any[]) => Action> = ReturnType<T>;

// Usage
const increment = createAction<number>("INCREMENT");
type IncrementAction = ActionType<typeof increment>;
type IncrementPayload = ExtractPayload<IncrementAction>; // number
```

### State Selector Types

```typescript
import { type Selector } from "sveltekitlibrary/redux";

// Extract return type from selector
type SelectorResult<T extends Selector<any, any>> = T extends Selector<
  infer S,
  infer R
>
  ? R
  : never;

// Usage
const selectUser = (state: AppState) => state.user;
type User = SelectorResult<typeof selectUser>; // User | null
```

### Reducer State Types

```typescript
import { type Reducer } from "sveltekitlibrary/redux";

// Extract state type from reducer
type ReducerState<T extends Reducer<any, any>> = T extends Reducer<infer S, any>
  ? S
  : never;

// Usage
type CounterState = ReducerState<typeof counterReducer>; // { count: number }
```

## Error Handling with TypeScript

### Typed Error Actions

```typescript
interface ErrorAction {
  type: string;
  payload: string;
  error: true;
}

const setError = (error: string): ErrorAction => ({
  type: "SET_ERROR",
  payload: error,
  error: true,
});

// In reducer
const errorReducer = createReducer(initialState, {
  [setError.type]: (state, action: ErrorAction) => ({
    ...state,
    error: action.payload,
  }),
});
```

### Async Thunk Error Handling

```typescript
import { createAsyncThunk } from "sveltekitlibrary/redux/async";

interface AsyncThunkError {
  message: string;
  code: string;
  timestamp: Date;
}

const fetchWithErrorHandling = createAsyncThunk<
  User,
  number,
  { rejectValue: AsyncThunkError }
>("user/fetchUser", async (userId, { rejectWithValue }) => {
  try {
    const response = await fetch(`/api/users/${userId}`);
    if (!response.ok) {
      return rejectWithValue({
        message: `Failed to fetch user: ${response.status}`,
        code: "FETCH_ERROR",
        timestamp: new Date(),
      });
    }
    return response.json();
  } catch (error) {
    return rejectWithValue({
      message: error.message,
      code: "NETWORK_ERROR",
      timestamp: new Date(),
    });
  }
});
```

## Testing with TypeScript

### Testing Typed Actions

```typescript
// actions.test.ts
import { increment } from "./actions";
import { ActionType } from "sveltekitlibrary/redux";

describe("Actions", () => {
  it("should create increment action with correct type and payload", () => {
    const action = increment(5);

    expect(action.type).toBe("INCREMENT");
    expect(action.payload).toBe(5);

    // Type test
    const typedAction: ActionType<typeof increment> = action;
    expect(typedAction.payload).toBe(5);
  });
});
```

### Testing Typed Selectors

```typescript
// selectors.test.ts
import { selectVisibleTodos } from "./selectors";
import { mockState } from "./test-utils";
import type { AppState } from "./types";

describe("Selectors", () => {
  it("should return visible todos", () => {
    const state: AppState = mockState({
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

### Testing Typed Reducers

```typescript
// reducers.test.ts
import { counterReducer } from "./reducers";
import type { AppState } from "./types";

describe("Reducers", () => {
  it("should handle increment action", () => {
    const initialState: AppState = { counter: 0, user: null, todos: [] };
    const action = { type: "INCREMENT", payload: 5 };

    const result = counterReducer(initialState, action);

    expect(result.counter).toBe(5);
  });
});
```

## Best Practices

### 1. Use Strong Typing

```typescript
// Good: Strong typing
interface AppState {
  user: User | null;
  todos: Todo[];
  settings: Settings;
}

// Bad: Weak typing
interface AppState {
  user: any;
  todos: any[];
  settings: any;
}
```

### 2. Use Generic Types for Reusability

```typescript
// Good: Generic types
interface EntityState<T> {
  entities: { [id: string]: T };
  ids: string[];
  loading: boolean;
}

// Bad: No generics
interface UserEntityState {
  entities: { [id: string]: User };
  ids: string[];
  loading: boolean;
}
```

### 3. Use Discriminated Unions for Actions

```typescript
// Good: Discriminated unions
type AppAction =
  | { type: "INCREMENT"; payload: number }
  | { type: "ADD_TODO"; payload: { text: string } };

// Bad: No discriminated unions
type AppAction = {
  type: string;
  payload: any;
};
```

### 4. Use Proper Error Handling

```typescript
// Good: Typed errors
interface AsyncError {
  message: string;
  code: string;
  timestamp: Date;
}

// Bad: Untyped errors
interface AsyncError {
  error: any;
}
```

### 5. Use Selectors for Derived State

```typescript
// Good: Typed selectors
const selectCompletedTodos = createSelector(selectTodos, (todos: Todo[]) =>
  todos.filter((todo) => todo.completed)
);

// Bad: No selectors
const selectCompletedTodos = (state: AppState) =>
  state.todos.filter((todo) => todo.completed);
```

For more information about specific features, see the relevant guides:

- [API Reference](./api-reference/) - Complete API documentation
- [Async State Management](./guides/async-state-management.md) - Async operations with TypeScript
- [Selectors](./api-reference/selectors.md) - Memoized selectors with TypeScript

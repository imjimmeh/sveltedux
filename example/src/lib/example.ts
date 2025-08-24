import {
  createSvelteStore,
  combineReducers,
  createSlice,
  applyMiddleware,
  compose,
  thunkMiddleware,
  loggerMiddleware,
  createSelector,
  createPersistEnhancer,
  createPersistMiddleware,
  type StoreEnhancer,
  createAsyncMiddleware,
  createCacheMiddleware,
} from "./index.js";
import { createAsyncThunk, createAsyncState } from "./async.js";
import type { AsyncState, CaseReducerBuilder, PayloadAction } from "./types.js";
import { createRetryMiddleware } from "./middleware/retryMiddleware.js";
import {
  createSearchAsyncThunk,
  createPollingAsyncThunk,
  asyncSelectors,
} from "./asyncUtils.js";

export interface User {
  id: number;
  name: string;
  email: string;
}

export interface Todo {
  id: number;
  text: string;
  completed: boolean;
}

type Filter = "all" | "active" | "completed";
interface AppState {
  user: AsyncState<User>;
  todos: TodosState;
  ui: UIState;
  notifications: AsyncState<string[]>;
}

type TodosState = {
  items: Todo[];
  filter: Filter;
  fetchTodos: AsyncState<Todo[]>;
  search: AsyncState<Todo[]> & { query: string };
};

type UIState = {
  sidebarOpen: boolean;
  theme: "light" | "dark";
};

// Enhanced async thunks with better error handling and features
const fetchUser = createAsyncThunk<User, number>(
  "user/fetchUser",
  async (userId: number, { signal, rejectWithValue }) => {
    try {
      const response = await fetch(`/api/users/${userId}`, {
        signal, // Support for cancellation
      });

      if (!response.ok) {
        if (response.status === 404) {
          return rejectWithValue({ message: "User not found", code: 404 });
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const user = await response.json();
      return user;
    } catch (error: any) {
      if (error.name === "AbortError") {
        return rejectWithValue({
          message: "Request was cancelled",
          code: "CANCELLED",
        });
      }
      return rejectWithValue({ message: error.message, code: "NETWORK_ERROR" });
    }
  },
  {
    condition: (userId, { getState }) => {
      const state = getState() as AppState;
      // Don't fetch if already loading or if we have recent data
      if (state.user.loading) return false;
      if (
        state.user.data?.id === userId &&
        state.user.lastFetch &&
        Date.now() - state.user.lastFetch < 30000
      ) {
        // 30 seconds cache
        return false;
      }
      return true;
    },
  }
);

const fetchTodos = createAsyncThunk<Todo[], void>(
  "todos/fetchTodos",
  async (_, { signal, rejectWithValue }) => {
    try {
      const response = await fetch("/api/todos", { signal });

      if (!response.ok) {
        throw new Error(`Failed to fetch todos: ${response.statusText}`);
      }

      const todos = await response.json();
      return todos;
    } catch (error: any) {
      if (error.name === "AbortError") {
        return rejectWithValue({
          message: "Fetch cancelled",
          code: "CANCELLED",
        });
      }
      return rejectWithValue({ message: error.message, code: "FETCH_ERROR" });
    }
  },
  {
    condition: (_, { getState }) => {
      const state = getState() as AppState;
      return !state.todos.fetchTodos.loading;
    },
  }
);

// Search todos with debouncing
const searchTodos = createSearchAsyncThunk<Todo>(
  "todos/search",
  async (query: string) => {
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Mock search results
    const mockTodos: Todo[] = [
      { id: 1, text: `Search result for "${query}"`, completed: false },
      { id: 2, text: `Another result for "${query}"`, completed: true },
    ];

    return mockTodos.filter((todo: Todo) =>
      todo.text.toLowerCase().includes(query.toLowerCase())
    );
  }
);

const createTodoOptimistic = createAsyncThunk<Todo, { text: string }>(
  "todos/createOptimistic",
  async ({ text }, { rejectWithValue }) => {
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Simulate occasional failure
      if (Math.random() < 0.3) {
        throw new Error("Server error");
      }

      const newTodo: Todo = {
        id: Date.now(),
        text,
        completed: false,
      };

      return newTodo;
    } catch (error: any) {
      return rejectWithValue({
        message: error.message,
        tempId: Date.now(),
      }) as any;
    }
  }
);

const userSlice = createSlice({
  name: "user",
  initialState: createAsyncState<User>(),
  reducers: {
    clearUser: (state: AsyncState<User>) => {
      state.data = null;
      state.error = null;
    },
  },
  extraReducers: (builder: CaseReducerBuilder<AsyncState<User>>) => {
    builder
      .addCase(fetchUser.pending, (state: AsyncState<User, any>) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        fetchUser.fulfilled,
        (state: AsyncState<User>, action: PayloadAction<User>) => {
          state.loading = false;
          state.data = action.payload;
          state.lastFetch = Date.now();
        }
      )
      .addCase(
        fetchUser.rejected,
        (state: AsyncState<User>, action: PayloadAction<any>) => {
          state.loading = false;
          state.error = action.payload;
        }
      );
  },
});

const todosSlice = createSlice({
  name: "todos",
  initialState: {
    items: [] as Todo[],
    filter: "all" as Filter,
    fetchTodos: createAsyncState<Todo[]>(),
    search: { ...createAsyncState<Todo[]>(), query: "" },
  } as TodosState,
  reducers: {
    // With improved type inference, PayloadAction types are automatically inferred
    addTodo: (state: TodosState, action: PayloadAction<{ text: string }>) => {
      state.items.push({
        id: Date.now(),
        text: action.payload.text,
        completed: false,
      });
    },
    toggleTodo: (state: TodosState, action: PayloadAction<{ id: number }>) => {
      const todo = state.items.find((todo) => todo.id === action.payload.id);
      if (todo) {
        todo.completed = !todo.completed;
      }
    },
    removeTodo: (state: TodosState, action: PayloadAction<{ id: number }>) => {
      state.items = state.items.filter(
        (todo: Todo) => todo.id !== action.payload.id
      );
    },
    setFilter: (state: TodosState, action: PayloadAction<Filter>) => {
      state.filter = action.payload;
    },
    setTodos: (state: TodosState, action: PayloadAction<Todo[]>) => {
      state.items = action.payload;
    },
    setSearchQuery: (state: TodosState, action: PayloadAction<string>) => {
      state.search.query = action.payload;
    },
  },
  extraReducers: (builder: CaseReducerBuilder<TodosState>) => {
    builder
      // Handle fetchTodos async thunk
      .addCase(fetchTodos.pending, (state: TodosState) => {
        state.fetchTodos.loading = true;
        state.fetchTodos.error = null;
      })
      .addCase(
        fetchTodos.fulfilled,
        (state: TodosState, action: PayloadAction<Todo[]>) => {
          state.fetchTodos.loading = false;
          state.fetchTodos.data = action.payload;
          state.fetchTodos.lastFetch = Date.now();
          // Update items with fetched data
          state.items = action.payload;
        }
      )
      .addCase(
        fetchTodos.rejected,
        (state: TodosState, action: PayloadAction<any>) => {
          state.fetchTodos.loading = false;
          state.fetchTodos.error = action.payload;
        }
      )
      // Handle searchTodos async thunk
      .addCase(searchTodos.pending, (state: TodosState) => {
        state.search.loading = true;
        state.search.error = null;
      })
      .addCase(
        searchTodos.fulfilled,
        (state: TodosState, action: PayloadAction<Todo[]>) => {
          state.search.loading = false;
          state.search.data = action.payload;
          state.search.lastFetch = Date.now();
        }
      )
      .addCase(
        searchTodos.rejected,
        (state: TodosState, action: PayloadAction<any>) => {
          state.search.loading = false;
          state.search.error = action.payload;
        }
      )
      // Handle createTodoOptimistic async thunk
      .addCase(
        createTodoOptimistic.pending,
        (state: TodosState, action: any) => {
          // Optimistically add todo
          const tempTodo: Todo = {
            id: Date.now(), // Temporary ID
            text: action.meta.arg.text,
            completed: false,
          };
          state.items.push(tempTodo);
        }
      )
      .addCase(
        createTodoOptimistic.fulfilled,
        (state: TodosState, action: PayloadAction<Todo>) => {
          // Replace temp todo with real one from server
          const index = state.items.findIndex(
            (todo: Todo) =>
              todo.text === (action as any).meta.arg.text && !todo.id
          );
          if (index !== -1) {
            state.items[index] = action.payload;
          }
        }
      )
      .addCase(
        createTodoOptimistic.rejected,
        (state: TodosState, action: PayloadAction<any>) => {
          // Remove optimistic todo on failure
          const tempId = action.payload?.tempId;
          if (tempId) {
            state.items = state.items.filter(
              (todo: Todo) => todo.id !== tempId
            );
          }
        }
      );
  },
});

const uiSlice = createSlice({
  name: "ui",
  initialState: {
    sidebarOpen: false,
    theme: "light" as "light" | "dark",
  } as UIState,
  reducers: {
    // No payload - Action type is inferred automatically  
    toggleSidebar: (state: UIState) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    // PayloadAction<boolean> is inferred from parameter
    setSidebar: (state: UIState, action: PayloadAction<boolean>) => {
      state.sidebarOpen = action.payload;
    },
    // No payload - Action type is inferred automatically
    toggleTheme: (state: UIState) => {
      state.theme = state.theme === "light" ? "dark" : "light";
    },
    // PayloadAction<"light" | "dark"> is inferred from parameter
    setTheme: (state: UIState, action: PayloadAction<"light" | "dark">) => {
      state.theme = action.payload;
    },
  },
});

// Polling for notifications
const pollNotifications = createPollingAsyncThunk<string[]>(
  "notifications/poll",
  async () => {
    // Simulate API call for notifications
    const notifications = [
      `New notification at ${new Date().toLocaleTimeString()}`,
      "You have 3 pending tasks",
      "System update available",
    ];

    return notifications.slice(0, Math.floor(Math.random() * 4));
  },
  {
    interval: 10000, // Poll every 10 seconds
    maxAttempts: 100,
    condition: (state: AppState) => state.ui.sidebarOpen, // Only poll when sidebar is open
  }
);

// Create notifications slice
const notificationsSlice = createSlice({
  name: "notifications",
  initialState: createAsyncState<string[]>([]),
  reducers: {
    clearNotifications: (state: AsyncState<string[]>) => {
      state.data = [];
    },
    markAsRead: (
      state: AsyncState<string[]>,
      action: PayloadAction<string>
    ) => {
      if (state.data) {
        state.data = state.data.filter((n: string) => n !== action.payload);
      }
    },
  },
  extraReducers: (builder: CaseReducerBuilder<AsyncState<string[]>>) => {
    builder
      .addCase(pollNotifications.pending, (state: AsyncState<string[]>) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        pollNotifications.fulfilled,
        (state: AsyncState<string[]>, action: PayloadAction<string[]>) => {
          state.loading = false;
          state.data = action.payload;
          state.lastFetch = Date.now();
        }
      )
      .addCase(
        pollNotifications.rejected,
        (state: AsyncState<string[]>, action: PayloadAction<any>) => {
          state.loading = false;
          state.error = action.payload;
        }
      );
  },
});

// Enhanced reducers with async handling
const userReducer = userSlice.reducer;
const todosReducer = todosSlice.reducer;
const notificationsReducer = notificationsSlice.reducer;

const rootReducer = combineReducers<AppState>({
  user: userReducer,
  todos: todosReducer,
  ui: uiSlice.reducer,
  notifications: notificationsReducer,
});

// Persistence enhancer demo (persist only todos and ui slices)
const persistEnhancer = createPersistEnhancer<AppState>({
  key: "my-app",
  storageKind: "local",
  version: 2,
  throttle: 250,
  rehydrateStrategy: "replace",
  partialize: (s) => ({ todos: s.todos, ui: s.ui }),
});

// Enhanced store with persistence + async middleware
const enhancedCreateStore = (compose as any)(
  persistEnhancer,
  applyMiddleware<AppState>(
    thunkMiddleware,
    createAsyncMiddleware({
      trackGlobalLoading: true,
      onAsyncStart: (action: any) =>
        console.log("Async operation started:", action.type),
      onAsyncEnd: (action: any) =>
        console.log("Async operation ended:", action.type),
      onAsyncError: (error: any, action: any) =>
        console.error("Async operation failed:", action.type, error),
    }),
    createRetryMiddleware(
      (() => {
        const thunkRegistry = new Map();
        thunkRegistry.set("user/fetchUser", fetchUser);
        thunkRegistry.set("todos/fetchTodos", fetchTodos);
        return thunkRegistry;
      })(),
      {
        maxRetries: 2,
        retryDelay: 1000,
        retryCondition: (error: any) => error.code === "NETWORK_ERROR",
      }
    ),
    createCacheMiddleware({
      ttl: 5 * 60 * 1000, // 5 minutes
      maxSize: 50,
    }),
    loggerMiddleware,
    createPersistMiddleware<AppState>({ key: "my-app" })
  )
) as StoreEnhancer<AppState>;

export const store = createSvelteStore(
  rootReducer,
  undefined,
  enhancedCreateStore
);

export const actions = {
  user: {
    ...userSlice.actions,
    fetchUser,
  },
  todos: {
    ...todosSlice.actions,
    fetchTodos,
    searchTodos,
    createTodoOptimistic,
  },
  ui: uiSlice.actions,
  notifications: {
    ...notificationsSlice.actions,
    pollNotifications,
  },
};

export const selectors = {
  user: {
    getCurrentUser: (state: AppState) => state.user.data,
    isUserLoading: (state: AppState) => asyncSelectors.isLoading(state.user),
    getUserError: (state: AppState) => state.user.error,
    hasUserData: (state: AppState) => asyncSelectors.hasData(state.user),
    isUserStale: (state: AppState) => asyncSelectors.isStale(state.user, 30000), // 30 seconds
  },
  todos: {
    getAllTodos: (state: AppState) => state.todos.items,
    getTodoFilter: (state: AppState) => state.todos.filter,
    isFetchingTodos: (state: AppState) =>
      asyncSelectors.isLoading(state.todos.fetchTodos),
    getTodosFetchError: (state: AppState) => state.todos.fetchTodos.error,

    // Search selectors
    getSearchQuery: (state: AppState) => state.todos.search.query,
    getSearchResults: (state: AppState) => state.todos.search.data || [],
    isSearching: (state: AppState) =>
      asyncSelectors.isLoading(state.todos.search),
    getSearchError: (state: AppState) => state.todos.search.error,

    getVisibleTodos: createSelector(
      (state: AppState) => state.todos.items,
      (state: AppState) => state.todos.filter,
      (todos: Todo[], filter: Filter) => {
        switch (filter) {
          case "active":
            return todos.filter((todo: Todo) => !todo.completed);
          case "completed":
            return todos.filter((todo: Todo) => todo.completed);
          default:
            return todos;
        }
      }
    ),
    getTodoStats: createSelector(
      (state: AppState) => state.todos.items,
      (todos: Todo[]) => ({
        total: todos.length,
        completed: todos.filter((t: Todo) => t.completed).length,
        active: todos.filter((t: Todo) => !t.completed).length,
      })
    ),
  },
  ui: {
    isSidebarOpen: (state: AppState) => state.ui.sidebarOpen,
    getTheme: (state: AppState) => state.ui.theme,
  },
  notifications: {
    getNotifications: (state: AppState) => state.notifications.data || [],
    isLoadingNotifications: (state: AppState) =>
      asyncSelectors.isLoading(state.notifications),
    getNotificationError: (state: AppState) => state.notifications.error,
    hasNewNotifications: (state: AppState) => {
      const notifications = state.notifications.data;
      return notifications && notifications.length > 0;
    },
  },
  global: {
    isAnyAsyncPending: (state: AppState) => {
      return (
        state.user.loading ||
        state.todos.fetchTodos.loading ||
        state.todos.search.loading ||
        state.notifications.loading
      );
    },
    getAllErrors: (state: AppState) => {
      const errors = [];
      if (state.user.error) errors.push(state.user.error);
      if (state.todos.fetchTodos.error)
        errors.push(state.todos.fetchTodos.error);
      if (state.todos.search.error) errors.push(state.todos.search.error);
      if (state.notifications.error) errors.push(state.notifications.error);
      return errors;
    },
  },
};

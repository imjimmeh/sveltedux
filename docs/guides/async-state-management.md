# Async State Management

The library provides comprehensive tools for managing asynchronous operations in your Redux-like state management system. This guide covers the various patterns and utilities available for handling async operations.

## Async Actions with `createAsyncThunk`

`createAsyncThunk` is the recommended way to handle async operations like API calls. It automatically generates action types for the pending, fulfilled, and rejected states of your async operation.

### Basic Async Thunk

```typescript
import { createAsyncThunk } from "sveltekitlibrary/redux/async";

interface User {
  id: number;
  name: string;
  email: string;
}

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
```

### Async Thunk with Loading State

```typescript
const userSlice = createSlice({
  name: "user",
  initialState: {
    data: null as User | null,
    loading: false,
    error: null as string | null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUser.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
        state.error = null;
      })
      .addCase(fetchUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? "An unknown error occurred";
      });
  },
});
```

## Async State with `createAsyncState`

For a more concise approach, you can use `createAsyncState` to create standardized async state objects.

### Using `createAsyncState`

```typescript
import { createAsyncState } from "sveltekitlibrary/redux/async";

interface User {
  id: number;
  name: string;
  email: string;
}

// Create async state
const userState = createAsyncState<User>();
// Returns: { data: null, loading: false, error: null }

// In reducer
const userSlice = createSlice({
  name: "user",
  initialState: {
    user: createAsyncState<User>(),
  } as UserState,
  reducers: {
    clearUser: (state) => {
      state.user = createAsyncState<User>();
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUser.pending, (state) => {
        state.user.loading = true;
        state.user.error = null;
      })
      .addCase(fetchUser.fulfilled, (state, action) => {
        state.user.loading = false;
        state.user.data = action.payload;
        state.user.error = null;
      })
      .addCase(fetchUser.rejected, (state, action) => {
        state.user.loading = false;
        state.user.error = action.payload ?? "An unknown error occurred";
      });
  },
});
```

## Async Reducer with `createAsyncReducer`

For an even more concise approach, use `createAsyncReducer` which automatically handles the async states.

### Using `createAsyncReducer`

```typescript
import { createAsyncReducer } from "sveltekitlibrary/redux/async";

interface UserState {
  user: ReturnType<typeof createAsyncState<User>>;
}

const initialState: UserState = {
  user: createAsyncState<User>(),
};

// Create a reducer that automatically handles the async states
const userReducer = createAsyncReducer(
  fetchUser, // The async thunk
  {
    // Optional custom handlers (defaults are usually sufficient)
    pending: (state) => {
      state.user.loading = true;
      state.user.error = null;
      // Keep existing data while loading
    },
    fulfilled: (state, action) => {
      state.user.loading = false;
      state.user.data = action.payload;
      state.user.error = null;
    },
    rejected: (state, action) => {
      state.user.loading = false;
      state.user.error = action.payload ?? "An unknown error occurred";
      // Keep existing data even when there's an error
    },
  }
);

export { userReducer, initialState };
```

## Multiple Async Operations

### Handling Multiple Async Thunks

```typescript
import { createAsyncThunk } from "sveltekitlibrary/redux/async";

// Multiple async thunks
const fetchUsers = createAsyncThunk<User[], void>(
  "users/fetchUsers",
  async (_, { rejectWithValue }) => {
    const response = await fetch("/api/users");
    if (!response.ok) return rejectWithValue("Failed to fetch users");
    return response.json();
  }
);

const fetchPosts = createAsyncThunk<Post[], number>(
  "posts/fetchPosts",
  async (userId, { rejectWithValue }) => {
    const response = await fetch(`/api/users/${userId}/posts`);
    if (!response.ok) return rejectWithValue("Failed to fetch posts");
    return response.json();
  }
);

// Combined reducer
const appSlice = createSlice({
  name: "app",
  initialState: {
    users: createAsyncState<User[]>(),
    posts: createAsyncState<Post[]>(),
    selectedUserId: null as number | null,
  },
  reducers: {},
  extraReducers: (builder) => {
    // Users
    builder
      .addCase(fetchUsers.pending, (state) => {
        state.users.loading = true;
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.users.loading = false;
        state.users.data = action.payload;
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.users.loading = false;
        state.users.error = action.payload;
      });

    // Posts
    builder
      .addCase(fetchPosts.pending, (state) => {
        state.posts.loading = true;
      })
      .addCase(fetchPosts.fulfilled, (state, action) => {
        state.posts.loading = false;
        state.posts.data = action.payload;
      })
      .addCase(fetchPosts.rejected, (state, action) => {
        state.posts.loading = false;
        state.posts.error = action.payload;
      });

    // User selection
    builder.addCase(selectUser.fulfilled, (state, action) => {
      state.selectedUserId = action.payload.id;
    });
  },
});
```

## Async Operations in Components

### Basic Component Usage

```svelte
<!-- UserProfile.svelte -->
<script lang="ts">
  import { store } from './store';
  import { actions } from './userSlice';
  import { fetchUser } from './apiActions';

  // Access the user state reactively
  let userState = $derived(store.state.user.user); // { data, loading, error }

  // Function to fetch user data
  function loadUser(userId: number) {
    store.dispatch(fetchUser(userId));
  }

  // Function to clear user data
  function clearUser() {
    store.dispatch(actions.clearUser());
  }
</script>

<div>
  <h2>User Profile</h2>

  <button on:click={() => loadUser(1)}>Load User 1</button>
  <button on:click={clearUser}>Clear User</button>

  {#if userState.loading}
    <p>Loading user data...</p>
  {:else if userState.error}
    <p>Error: {userState.error}</p>
  {:else if userState.data}
    <div>
      <h3>{userState.data.name}</h3>
      <p>Email: {userState.data.email}</p>
      <p>ID: {userState.data.id}</p>
    </div>
  {:else}
    <p>No user data loaded</p>
  {/if}
</div>
```

### Component with Multiple Async Operations

```svelte
<!-- UserDashboard.svelte -->
<script lang="ts">
  import { store } from './store';
  import { userSelectors } from './selectors';
  import { fetchUser, fetchPosts } from './apiActions';

  // Use selectors for cleaner access
  let userData = $derived(userSelectors.getUserData(store.state));
  let isLoading = $derived(userSelectors.getIsLoading(store.state));
  let error = $derived(userSelectors.getError(store.state));
  let posts = $derived(store.state.posts.data);
  let postsLoading = $derived(store.state.posts.loading);

  function loadUser(userId: number) {
    store.dispatch(fetchUser(userId));
    store.dispatch(fetchPosts(userId));
  }
</script>

<div>
  <h2>User Dashboard</h2>

  <button on:click={() => loadUser(1)}>Load User & Posts</button>

  {#if isLoading}
    <p>Loading user data...</p>
  {:else if error}
    <p>Error: {error}</p>
  {:else if userData}
    <div class="user-info">
      <h3>{userData.name}</h3>
      <p>Email: {userData.email}</p>
    </div>
  {/if}

  {#if postsLoading}
    <p>Loading posts...</p>
  {:else if posts}
    <div class="posts">
      <h4>Posts</h4>
      <ul>
        {#each posts as post}
          <li>
            <h5>{post.title}</h5>
            <p>{post.body}</p>
          </li>
        {/each}
      </ul>
    </div>
  {/if}
</div>

<style>
  .user-info {
    border: 1px solid #ccc;
    padding: 1rem;
    margin-bottom: 1rem;
  }

  .posts {
    border: 1px solid #ddd;
    padding: 1rem;
  }
</style>
```

## Error Handling Patterns

### Global Error Handling

```typescript
import { createAsyncThunk } from "sveltekitlibrary/redux/async";

// Global error handler
const globalErrorHandler = (error: any) => {
  console.error("Global error handler:", error);
  // You could dispatch a global error action here
  return {
    message: error.message || "An unknown error occurred",
    code: error.code || "UNKNOWN_ERROR",
    timestamp: new Date().toISOString(),
  };
};

const fetchWithGlobalError = createAsyncThunk<User, number>(
  "user/fetchUser",
  async (userId, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/users/${userId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    } catch (error) {
      const errorInfo = globalErrorHandler(error);
      return rejectWithValue(errorInfo);
    }
  }
);
```

### Retry Logic

```typescript
import { createAsyncThunk } from "sveltekitlibrary/redux/async";

const fetchWithRetry = createAsyncThunk<User, number>(
  "user/fetchUser",
  async (userId, { rejectWithValue }) => {
    const maxRetries = 3;
    let retryCount = 0;

    while (retryCount < maxRetries) {
      try {
        const response = await fetch(`/api/users/${userId}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      } catch (error) {
        retryCount++;
        if (retryCount >= maxRetries) {
          return rejectWithValue(
            `Failed after ${maxRetries} attempts: ${error.message}`
          );
        }
        // Wait before retry (exponential backoff)
        await new Promise((resolve) => setTimeout(resolve, 1000 * retryCount));
      }
    }

    return rejectWithValue("Unexpected error in retry logic");
  }
);
```

## Loading States

### Global Loading State

```typescript
import { createSlice } from "sveltekitlibrary/redux";

const globalSlice = createSlice({
  name: "global",
  initialState: {
    loading: false,
    loadingMessage: "",
    errors: [] as string[],
  },
  reducers: {
    setLoading: (state, action) => {
      state.loading = action.payload;
      state.loadingMessage = action.payload ? action.payload.message : "";
    },
    addError: (state, action) => {
      state.errors.push(action.payload);
    },
    clearErrors: (state) => {
      state.errors = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addMatcher(
        (action) => action.type.endsWith("/pending"),
        (state, action) => {
          state.loading = true;
          state.loadingMessage = `Loading ${action.type.split("/")[1]}...`;
        }
      )
      .addMatcher(
        (action) =>
          action.type.endsWith("/fulfilled") ||
          action.type.endsWith("/rejected"),
        (state) => {
          state.loading = false;
          state.loadingMessage = "";
        }
      );
  },
});
```

### Loading Bar Component

```svelte
<!-- LoadingBar.svelte -->
<script lang="ts">
  import { store } from './store';
  import { globalSelectors } from './selectors';

  let loading = $derived(globalSelectors.getLoading(store.state));
  let loadingMessage = $derived(globalSelectors.getLoadingMessage(store.state));
</script>

{#if loading}
  <div class="loading-bar">
    <div class="loading-content">
      <div class="spinner"></div>
      <span>{loadingMessage}</span>
    </div>
  </div>
{/if}

<style>
  .loading-bar {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: rgba(0, 0, 0, 0.1);
    z-index: 1000;
  }

  .loading-content {
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: white;
    padding: 12px 24px;
    border-radius: 4px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    display: flex;
    align-items: center;
    gap: 12px;
    z-index: 1001;
  }

  .spinner {
    width: 16px;
    height: 16px;
    border: 2px solid #f3f3f3;
    border-top: 2px solid #3498db;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
</style>
```

## Caching Strategies

### Simple Caching

```typescript
import { createAsyncThunk } from "sveltekitlibrary/redux/async";

// Cache in memory
const userCache = new Map<number, User>();

const fetchUserWithCache = createAsyncThunk<User, number>(
  "user/fetchUser",
  async (userId, { rejectWithValue }) => {
    // Check cache first
    if (userCache.has(userId)) {
      return userCache.get(userId)!;
    }

    try {
      const response = await fetch(`/api/users/${userId}`);
      if (!response.ok) {
        return rejectWithValue("User not found");
      }

      const user = await response.json();
      userCache.set(userId, user);
      return user;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);
```

### Time-based Cache

```typescript
import { createAsyncThunk } from "sveltekitlibrary/redux/async";

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

const userCache = new Map<number, CacheEntry<User>>();

const fetchUserWithTimeCache = createAsyncThunk<User, number>(
  "user/fetchUser",
  async (userId, { rejectWithValue }) => {
    const now = Date.now();
    const cached = userCache.get(userId);

    // Check if cache is valid
    if (cached && now - cached.timestamp < cached.ttl) {
      return cached.data;
    }

    try {
      const response = await fetch(`/api/users/${userId}`);
      if (!response.ok) {
        return rejectWithValue("User not found");
      }

      const user = await response.json();
      userCache.set(userId, {
        data: user,
        timestamp: now,
        ttl: 5 * 60 * 1000, // 5 minutes
      });
      return user;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);
```

## Advanced Patterns

### Conditional Async Operations

```typescript
import { createAsyncThunk } from "sveltekitlibrary/redux/async";

const fetchUserIfNotCached = createAsyncThunk<User, number>(
  "user/fetchUserIfNotCached",
  async (userId, { dispatch, getState, rejectWithValue }) => {
    const state = getState() as RootState;

    // Check if user is already loaded
    if (state.users.data && state.users.data.id === userId) {
      return state.users.data;
    }

    // Check if we're already loading this user
    if (state.users.loading && state.users.loadingUserId === userId) {
      return rejectWithValue("User already loading");
    }

    try {
      const response = await fetch(`/api/users/${userId}`);
      if (!response.ok) {
        return rejectWithValue("User not found");
      }
      return response.json();
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);
```

### Batch Async Operations

```typescript
import { createAsyncThunk } from "sveltekitlibrary/redux/async";

const fetchMultipleUsers = createAsyncThunk<User[], number[]>(
  "users/fetchMultipleUsers",
  async (userIds, { rejectWithValue }) => {
    try {
      const promises = userIds.map((userId) =>
        fetch(`/api/users/${userId}`).then((res) => {
          if (!res.ok) throw new Error(`User ${userId} not found`);
          return res.json();
        })
      );

      const results = await Promise.allSettled(promises);

      const users: User[] = [];
      const errors: string[] = [];

      results.forEach((result, index) => {
        if (result.status === "fulfilled") {
          users.push(result.value);
        } else {
          errors.push(`User ${userIds[index]}: ${result.reason.message}`);
        }
      });

      if (errors.length > 0) {
        console.warn("Some users failed to load:", errors);
      }

      return users;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);
```

For more information about API data fetching, see the [API Data Fetching](./api-data-fetching.md) guide.

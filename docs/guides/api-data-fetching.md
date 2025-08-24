# API Data Fetching

The library provides built-in support for fetching data from APIs with automatic loading and error state management using the familiar `{ data, loading, error }` pattern.

## Basic API Fetching Example

### Creating Async Thunks for API Calls

```typescript
// apiActions.ts
import { createAsyncThunk } from "sveltekitlibrary/redux/async";

// Define your data type
interface User {
  id: number;
  name: string;
  email: string;
}

// Create an async thunk for fetching user data
const fetchUser = createAsyncThunk<User, number>(
  "user/fetchUser",
  async (userId, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/users/${userId}`);

      // Handle HTTP errors
      if (!response.ok) {
        return rejectWithValue(`Failed to fetch user: ${response.status}`);
      }

      const user = await response.json();
      return user;
    } catch (error) {
      // Handle network errors
      return rejectWithValue(`Network error: ${error.message}`);
    }
  }
);

// Create an async thunk for fetching multiple users
const fetchUsers = createAsyncThunk<User[], void>(
  "users/fetchUsers",
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch("/api/users");
      if (!response.ok) {
        return rejectWithValue("Failed to fetch users");
      }
      return response.json();
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);
```

### Creating API Slice

```typescript
// userSlice.ts
import { createSlice } from "sveltekitlibrary/redux";
import { createAsyncState } from "sveltekitlibrary/redux/async";
import type { User } from "./apiActions";
import { fetchUser, fetchUsers } from "./apiActions";

// Define the state structure with async state
interface UserState {
  user: ReturnType<typeof createAsyncState<User>>;
  users: ReturnType<typeof createAsyncState<User[]>>;
  selectedUserId: number | null;
}

const userSlice = createSlice({
  name: "user",
  initialState: {
    user: createAsyncState<User>(), // { data: null, loading: false, error: null }
    users: createAsyncState<User[]>(),
    selectedUserId: null,
  } as UserState,
  reducers: {
    clearUser: (state) => {
      state.user = createAsyncState<User>();
    },
    selectUser: (state, action) => {
      state.selectedUserId = action.payload;
    },
  },
  extraReducers: (builder) => {
    // Single user
    builder
      .addCase(fetchUser.pending, (state) => {
        state.user.loading = true;
        state.user.error = null;
      })
      .addCase(fetchUser.fulfilled, (state, action) => {
        state.user.loading = false;
        state.user.data = action.payload;
        state.user.error = null;
        state.selectedUserId = action.payload.id;
      })
      .addCase(fetchUser.rejected, (state, action) => {
        state.user.loading = false;
        state.user.error = action.payload ?? "An unknown error occurred";
      });

    // Multiple users
    builder
      .addCase(fetchUsers.pending, (state) => {
        state.users.loading = true;
        state.users.error = null;
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.users.loading = false;
        state.users.data = action.payload;
        state.users.error = null;
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.users.loading = false;
        state.users.error = action.payload ?? "Failed to fetch users";
      });
  },
});

export const { actions, reducer } = userSlice;
```

### Using in Components

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

## Advanced Pattern with createAsyncReducer

For a more concise approach, you can use `createAsyncReducer`:

```typescript
// userReducer.ts
import { createAsyncReducer } from "sveltekitlibrary/redux/asyncReducers";
import { createAsyncState } from "sveltekitlibrary/redux/async";
import { fetchUser } from "./apiActions";

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
    rejected: (state, action) => => {
      state.user.loading = false;
      state.user.error = action.payload ?? "An unknown error occurred";
      // Keep existing data even when there's an error
    },
  }
);

export { userReducer, initialState };
```

## Using with Selectors

You can also create memoized selectors for cleaner component code:

```typescript
// selectors.ts
import { createSelector } from "sveltekitlibrary/redux";
import type { AppState } from "./store";

const selectUserState = (state: AppState) => state.user.user;

export const userSelectors = {
  getUserData: createSelector(selectUserState, (userState) => userState.data),

  getIsLoading: createSelector(
    selectUserState,
    (userState) => userState.loading
  ),

  getError: createSelector(selectUserState, (userState) => userState.error),

  // Combined selector that returns the entire async state
  getUserAsyncState: selectUserState,
};
```

Then in your component:

```svelte
<!-- UserProfile.svelte -->
<script lang="ts">
  import { store } from './store';
  import { userSelectors } from './selectors';
  import { fetchUser } from './apiActions';

  // Use selectors for cleaner access
  let userData = $derived(userSelectors.getUserData(store.state));
  let isLoading = $derived(userSelectors.getIsLoading(store.state));
  let error = $derived(userSelectors.getError(store.state));

  function loadUser(userId: number) {
    store.dispatch(fetchUser(userId));
  }
</script>

<div>
  <h2>User Profile</h2>

  <button on:click={() => loadUser(1)}>Load User 1</button>

  {#if isLoading}
    <p>Loading user data...</p>
  {:else if error}
    <p>Error: {error}</p>
  {:else if userData}
    <div>
      <h3>{userData.name}</h3>
      <p>Email: {userData.email}</p>
    </div>
  {:else}
    <p>No user data loaded</p>
  {/if}
</div>
```

## API Data Fetching Best Practices

### 1. Handle All Error Cases

```typescript
const fetchUser = createAsyncThunk<User, number>(
  "user/fetchUser",
  async (userId, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/users/${userId}`);

      // Handle HTTP errors
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return rejectWithValue({
          message:
            errorData.message || `HTTP error! status: ${response.status}`,
          status: response.status,
          details: errorData,
        });
      }

      const user = await response.json();
      return user;
    } catch (error) {
      // Handle network errors
      return rejectWithValue({
        message: error.message || "Network error occurred",
        type: "NETWORK_ERROR",
      });
    }
  }
);
```

### 2. Implement Loading States

```typescript
const userSlice = createSlice({
  name: "user",
  initialState: {
    user: createAsyncState<User>(),
    users: createAsyncState<User[]>(),
    loading: false,
    loadingMessage: "",
  },
  reducers: {
    setLoading: (state, action) => {
      state.loading = action.payload.loading;
      state.loadingMessage = action.payload.message;
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

### 3. Use Caching for Performance

```typescript
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

const apiCache = new Map<string, CacheEntry<any>>();

const fetchWithCache = createAsyncThunk<User, number>(
  "user/fetchUser",
  async (userId, { rejectWithValue }) => {
    const cacheKey = `user_${userId}`;
    const now = Date.now();
    const cached = apiCache.get(cacheKey);

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

      // Cache the result
      apiCache.set(cacheKey, {
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

### 4. Implement Retry Logic

```typescript
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
        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * Math.pow(2, retryCount - 1))
        );
      }
    }

    return rejectWithValue("Unexpected error in retry logic");
  }
);
```

### 5. Handle Authentication

```typescript
const fetchWithAuth = createAsyncThunk<User, number>(
  "user/fetchUser",
  async (userId, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem("authToken");

      const response = await fetch(`/api/users/${userId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.status === 401) {
        return rejectWithValue("Authentication required");
      }

      if (!response.ok) {
        return rejectWithValue(`Failed to fetch user: ${response.status}`);
      }

      return response.json();
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);
```

### 6. Handle Pagination

```typescript
interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
}

const fetchPaginatedUsers = createAsyncThunk<
  PaginatedResponse<User>,
  {
    page: number;
    limit: number;
  }
>("users/fetchPaginatedUsers", async ({ page, limit }, { rejectWithValue }) => {
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

### 7. Handle File Uploads

```typescript
const uploadUserAvatar = createAsyncThunk<string, FormData>(
  "user/uploadAvatar",
  async (formData, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem("authToken");

      const response = await fetch("/api/user/avatar", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        return rejectWithValue("Failed to upload avatar");
      }

      const { avatarUrl } = await response.json();
      return avatarUrl;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);
```

## Real-world Example: Complete User Management

```typescript
// userApi.ts
import { createAsyncThunk } from "sveltekitlibrary/redux/async";

interface User {
  id: number;
  name: string;
  email: string;
  avatar?: string;
}

interface CreateUserDto {
  name: string;
  email: string;
}

interface UpdateUserDto {
  name?: string;
  email?: string;
  avatar?: string;
}

// CRUD operations
const fetchUsers = createAsyncThunk<User[], void>(
  "users/fetchUsers",
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch("/api/users");
      if (!response.ok) return rejectWithValue("Failed to fetch users");
      return response.json();
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const fetchUser = createAsyncThunk<User, number>(
  "user/fetchUser",
  async (userId, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/users/${userId}`);
      if (!response.ok) return rejectWithValue("User not found");
      return response.json();
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const createUser = createAsyncThunk<User, CreateUserDto>(
  "user/createUser",
  async (userData, { rejectWithValue }) => {
    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
      });
      if (!response.ok) return rejectWithValue("Failed to create user");
      return response.json();
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const updateUser = createAsyncThunk<User, { id: number; data: UpdateUserDto }>(
  "user/updateUser",
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/users/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) return rejectWithValue("Failed to update user");
      return response.json();
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const deleteUser = createAsyncThunk<void, number>(
  "user/deleteUser",
  async (userId, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: "DELETE",
      });
      if (!response.ok) return rejectWithValue("Failed to delete user");
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export { fetchUsers, fetchUser, createUser, updateUser, deleteUser };
```

```typescript
// userSlice.ts
import { createSlice } from "sveltekitlibrary/redux";
import { createAsyncState } from "sveltekitlibrary/redux/async";
import type { User } from "./userApi";
import {
  fetchUsers,
  fetchUser,
  createUser,
  updateUser,
  deleteUser,
} from "./userApi";

interface UserState {
  users: ReturnType<typeof createAsyncState<User[]>>;
  currentUser: ReturnType<typeof createAsyncState<User>>;
  selectedUserId: number | null;
  creating: boolean;
  updating: boolean;
  deleting: boolean;
}

const userSlice = createSlice({
  name: "user",
  initialState: {
    users: createAsyncState<User[]>(),
    currentUser: createAsyncState<User>(),
    selectedUserId: null,
    creating: false,
    updating: false,
    deleting: false,
  } as UserState,
  reducers: {
    selectUser: (state, action) => {
      state.selectedUserId = action.payload;
    },
    clearCurrentUser: (state) => {
      state.currentUser = createAsyncState<User>();
      state.selectedUserId = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch users
    builder
      .addCase(fetchUsers.pending, (state) => {
        state.users.loading = true;
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.users.loading = false;
        state.users.data = action.payload;
        state.users.error = null;
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.users.loading = false;
        state.users.error = action.payload;
      });

    // Fetch single user
    builder
      .addCase(fetchUser.pending, (state) => {
        state.currentUser.loading = true;
      })
      .addCase(fetchUser.fulfilled, (state, action) => {
        state.currentUser.loading = false;
        state.currentUser.data = action.payload;
        state.currentUser.error = null;
        state.selectedUserId = action.payload.id;
      })
      .addCase(fetchUser.rejected, (state, action) => {
        state.currentUser.loading = false;
        state.currentUser.error = action.payload;
      });

    // Create user
    builder
      .addCase(createUser.pending, (state) => {
        state.creating = true;
      })
      .addCase(createUser.fulfilled, (state, action) => {
        state.creating = false;
        if (state.users.data) {
          state.users.data.push(action.payload);
        }
      })
      .addCase(createUser.rejected, (state) => {
        state.creating = false;
      });

    // Update user
    builder
      .addCase(updateUser.pending, (state) => {
        state.updating = true;
      })
      .addCase(updateUser.fulfilled, (state, action) => {
        state.updating = false;
        if (state.users.data) {
          const index = state.users.data.findIndex(
            (u) => u.id === action.payload.id
          );
          if (index !== -1) {
            state.users.data[index] = action.payload;
          }
        }
        if (state.currentUser.data?.id === action.payload.id) {
          state.currentUser.data = action.payload;
        }
      })
      .addCase(updateUser.rejected, (state) => {
        state.updating = false;
      });

    // Delete user
    builder
      .addCase(deleteUser.pending, (state) => {
        state.deleting = true;
      })
      .addCase(deleteUser.fulfilled, (state, action, meta) => {
        state.deleting = false;
        if (state.users.data) {
          state.users.data = state.users.data.filter((u) => u.id !== meta.arg);
        }
        if (state.selectedUserId === meta.arg) {
          state.currentUser = createAsyncState<User>();
          state.selectedUserId = null;
        }
      })
      .addCase(deleteUser.rejected, (state) => {
        state.deleting = false;
      });
  },
});

export const { actions, reducer } = userSlice;
```

For more information about async state management, see the [Async State Management](./async-state-management.md) guide.

# State Persistence

This library provides a simple, SSR-safe way to persist your Redux-like state to web storage with an enhancer and an optional middleware.

## Overview

The state persistence system consists of several components:

- **Enhancer**: [`createPersistEnhancer()`](../../persist.ts:188) hydrates initial state and persists updates (debounced)
- **Middleware**: [`createPersistMiddleware()`](../../persist.ts:310) offers control actions (pause/resume/flush/purge) and optional gating of writes
- **SSR-safe storage helper**: [`createWebStorage()`](../../persist.ts:77) returns localStorage/sessionStorage or an in-memory fallback
- **Utility**: [`purgePersistedState()`](../../persist.ts:387) clears persisted state for a given key

## Installation and Setup

### Basic Setup

```typescript
import {
  createSvelteStore,
  combineReducers,
  applyMiddleware,
  compose,
  thunkMiddleware,
  createPersistEnhancer,
} from "sveltekitlibrary/redux";

const persistEnhancer = createPersistEnhancer<AppState>({
  key: "my-app", // storage key
  storageKind: "local", // 'local' or 'session' (default: 'local')
  version: 2, // persisted record version
  throttle: 250, // debounce interval for writes
  rehydrateStrategy: "replace", // 'replace' | 'merge'
  // Persist only the slices you want:
  partialize: (state) => ({ todos: state.todos, ui: state.ui }),
});

const enhancedCreateStore = compose(
  persistEnhancer,
  applyMiddleware(thunkMiddleware)
);

const store = createSvelteStore(rootReducer, undefined, enhancedCreateStore);
```

### With Optional Middleware

```typescript
import {
  createPersistMiddleware,
  PERSIST_PAUSE,
  PERSIST_RESUME,
  PERSIST_FLUSH,
  PERSIST_PURGE,
} from "sveltekitlibrary/redux";

// Only perform immediate writes for specific actions
const persistMiddleware = createPersistMiddleware<AppState>({
  key: "my-app",
  types: ["todos/addTodo", "todos/toggleTodo"],
});

// Compose enhancer + middleware
const enhancedCreateStore = compose(
  createPersistEnhancer<AppState>({
    key: "my-app",
    partialize: (s) => ({ todos: s.todos }),
  }),
  applyMiddleware(thunkMiddleware, persistMiddleware)
);

// Control examples:
store.dispatch({ type: PERSIST_PAUSE }); // temporarily pause writes
store.dispatch({ type: "todos/addTodo", payload: { text: "new" } });
store.dispatch({ type: PERSIST_RESUME }); // resume writes
store.dispatch({ type: PERSIST_FLUSH }); // force a write
store.dispatch({ type: PERSIST_PURGE }); // clear persisted data in storage
```

## Configuration Options

### `createPersistEnhancer` Options

| Option              | Type                                                | Default          | Description                                                   |
| ------------------- | --------------------------------------------------- | ---------------- | ------------------------------------------------------------- |
| `key`               | `string`                                            | `'my-app'`       | Storage key                                                   |
| `storage`           | `StorageLike`                                       | `undefined`      | Custom storage implementation                                 |
| `storageKind`       | `'local' \| 'session'`                              | `'local'`        | Storage type to use                                           |
| `serialize`         | `(data: any) => string`                             | `JSON.stringify` | Serialization function                                        |
| `deserialize`       | `(raw: string) => any`                              | `JSON.parse`     | Deserialization function                                      |
| `partialize`        | `(state: any) => any`                               | `undefined`      | Function to select subset of state to persist                 |
| `whitelist`         | `string[]`                                          | `undefined`      | Persist only these root keys (ignored if partialize provided) |
| `blacklist`         | `string[]`                                          | `undefined`      | Exclude these root keys (ignored if partialize provided)      |
| `throttle`          | `number`                                            | `250`            | Debounce interval for writes in milliseconds                  |
| `version`           | `number`                                            | `2`              | Persisted record version                                      |
| `migrate`           | `(persistedState: any, fromVersion: number) => any` | `undefined`      | Migration function when version changes                       |
| `rehydrateStrategy` | `'replace' \| 'merge'`                              | `'replace'`      | How to handle rehydration                                     |

### `createPersistMiddleware` Options

| Option  | Type       | Default     | Description                           |
| ------- | ---------- | ----------- | ------------------------------------- |
| `key`   | `string`   | `'my-app'`  | Storage key                           |
| `types` | `string[]` | `undefined` | Only persist actions with these types |
| `pause` | `boolean`  | `false`     | Whether to pause writes initially     |

## Usage Examples

### Basic Persistence

```typescript
import { createPersistEnhancer } from "sveltekitlibrary/redux/persist";

const persistEnhancer = createPersistEnhancer<AppState>({
  key: "my-app",
  storageKind: "local",
  version: 2,
  throttle: 250,
  rehydrateStrategy: "replace",
});

const store = createSvelteStore(rootReducer, undefined, persistEnhancer);
```

### Selective Persistence

```typescript
const persistEnhancer = createPersistEnhancer<AppState>({
  key: "my-app",
  partialize: (state) => ({
    // Only persist these parts of state
    todos: state.todos,
    user: {
      id: state.user.id,
      name: state.user.name,
    },
    settings: state.settings,
  }),
});
```

### Whitelist/Blacklist

```typescript
// Using whitelist
const persistEnhancer = createPersistEnhancer<AppState>({
  key: "my-app",
  whitelist: ["todos", "user"],
});

// Using blacklist
const persistEnhancer = createPersistEnhancer<AppState>({
  key: "my-app",
  blacklist: ["temp", "cache"],
});
```

### Custom Serialization

```typescript
const persistEnhancer = createPersistEnhancer<AppState>({
  key: "my-app",
  serialize: (data) => {
    // Custom serialization for Date objects, Maps, Sets, etc.
    return JSON.stringify(data, (key, value) => {
      if (value instanceof Date) {
        return { __type: "Date", value: value.toISOString() };
      }
      if (value instanceof Map) {
        return { __type: "Map", value: Array.from(value.entries()) };
      }
      if (value instanceof Set) {
        return { __type: "Set", value: Array.from(value) };
      }
      return value;
    });
  },
  deserialize: (raw) => {
    // Custom deserialization
    return JSON.parse(raw, (key, value) => {
      if (value && typeof value === "object" && value.__type) {
        switch (value.__type) {
          case "Date":
            return new Date(value.value);
          case "Map":
            return new Map(value.value);
          case "Set":
            return new Set(value.value);
        }
      }
      return value;
    });
  },
});
```

### Migration Strategy

```typescript
const persistEnhancer = createPersistEnhancer<AppState>({
  key: "my-app",
  version: 3,
  migrate: (persistedState, fromVersion) => {
    console.log(`Migrating from version ${fromVersion} to 3`);

    switch (fromVersion) {
      case 1:
        // Migration from version 1 to 2
        persistedState = migrateV1ToV2(persistedState);
      // Fall through to version 2 migration
      case 2:
        // Migration from version 2 to 3
        persistedState = migrateV2ToV3(persistedState);
        break;
    }

    return persistedState;
  },
});
```

## Storage Helpers

### `createWebStorage`

```typescript
import { createWebStorage } from "sveltekitlibrary/redux/persist";

// Create localStorage with fallback
const localStorage = createWebStorage("local");

// Create sessionStorage with fallback
const sessionStorage = createWebStorage("session");

// Create custom storage
const customStorage = createWebStorage({
  getItem: (key) => customStorageBackend.getItem(key),
  setItem: (key, value) => customStorageBackend.setItem(key, value),
  removeItem: (key) => customStorageBackend.removeItem(key),
});
```

### `purgePersistedState`

```typescript
import { purgePersistedState } from "sveltekitlibrary/redux/persist";

// Clear persisted state for a specific key
purgePersistedState("my-app");

// Clear all persisted states
purgePersistedState();
```

## SSR Support

The persistence system is SSR-safe and automatically falls back to in-memory storage when `window` is not available.

### SSR Example

```typescript
import { createWebStorage } from "sveltekitlibrary/redux/persist";

// This will automatically use localStorage in browser and fallback in SSR
const storage = createWebStorage("local");

// In your store setup
const persistEnhancer = createPersistEnhancer<AppState>({
  key: "my-app",
  storage, // SSR-safe storage
  storageKind: "local",
});
```

### Hydration Strategy

```typescript
const persistEnhancer = createPersistEnhancer<AppState>({
  key: "my-app",
  rehydrateStrategy: "merge", // or "replace"
});

// "replace" - completely replace initial state with persisted state
// "merge" - merge persisted state with initial state
```

## Performance Considerations

### Throttling Writes

```typescript
const persistEnhancer = createPersistEnhancer<AppState>({
  key: "my-app",
  throttle: 500, // 500ms debounce interval
});
```

### Selective Persistence

```typescript
// Only persist essential state to reduce storage size
const persistEnhancer = createPersistEnhancer<AppState>({
  key: "my-app",
  partialize: (state) => ({
    user: state.user,
    settings: state.settings,
    // Don't persist large arrays or temporary data
    // todos: state.todos, // Skip large arrays
    // cache: state.cache, // Skip temporary cache
  }),
});
```

### Version Control

```typescript
const persistEnhancer = createPersistEnhancer<AppState>({
  key: "my-app",
  version: 2,
  migrate: (persistedState, fromVersion) => {
    // Handle schema changes between versions
    if (fromVersion === 1) {
      // Migrate old schema to new schema
      persistedState.newField = persistedState.oldField;
      delete persistedState.oldField;
    }
    return persistedState;
  },
});
```

## Error Handling

### Error Boundaries

```typescript
const persistEnhancer = createPersistEnhancer<AppState>({
  key: "my-app",
  // Custom error handling
  serialize: (data) => {
    try {
      return JSON.stringify(data);
    } catch (error) {
      console.error("Serialization error:", error);
      return "{}"; // Return empty object on error
    }
  },
  deserialize: (raw) => {
    try {
      return JSON.parse(raw);
    } catch (error) {
      console.error("Deserialization error:", error);
      return {}; // Return empty object on error
    }
  },
});
```

### Storage Quota Handling

```typescript
const persistEnhancer = createPersistEnhancer<AppState>({
  key: "my-app",
  async: true, // Use async storage operations
  onStorageError: (error) => {
    console.error("Storage quota exceeded:", error);
    // Implement fallback strategy
    purgePersistedState("my-app");
  },
});
```

## Integration Patterns

### With Authentication

```typescript
const persistEnhancer = createPersistEnhancer<AppState>({
  key: "my-app",
  partialize: (state) => {
    // Only persist state when user is authenticated
    if (state.user?.isAuthenticated) {
      return {
        user: {
          id: state.user.id,
          preferences: state.user.preferences,
        },
        todos: state.todos,
      };
    }
    return { user: null, todos: [] };
  },
});
```

### With Time-based Expiration

```typescript
const persistEnhancer = createPersistEnhancer<AppState>({
  key: "my-app",
  partialize: (state) => {
    const now = Date.now();
    const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;

    // Only persist recent data
    return {
      user: state.user,
      todos: state.todos.filter((todo) => todo.updatedAt > oneWeekAgo),
    };
  },
});
```

### Multi-tab Synchronization

```typescript
const persistEnhancer = createPersistEnhancer<AppState>({
  key: "my-app",
  onStorageUpdate: (newState) => {
    // Broadcast to other tabs
    window.dispatchEvent(
      new CustomEvent("redux-state-update", {
        detail: newState,
      })
    );
  },
});

// In your app setup
window.addEventListener("redux-state-update", (event) => {
  // Update store when another tab changes state
  store.dispatch({ type: "STORAGE_UPDATE", payload: event.detail });
});
```

## Testing

### Testing Persistence

```typescript
// persistence.test.ts
import { createPersistEnhancer } from "sveltekitlibrary/redux/persist";
import { createSvelteStore } from "sveltekitlibrary/redux";

describe("Persistence", () => {
  it("should persist state to storage", () => {
    const mockStorage = {
      storage: {} as Record<string, string>,
      getItem: jest.fn((key) => mockStorage.storage[key]),
      setItem: jest.fn((key, value) => {
        mockStorage.storage[key] = value;
      }),
      removeItem: jest.fn((key) => {
        delete mockStorage.storage[key];
      }),
    };

    const persistEnhancer = createPersistEnhancer<TestState>({
      key: "test-app",
      storage: mockStorage,
    });

    const store = createSvelteStore(rootReducer, undefined, persistEnhancer);

    // Dispatch action
    store.dispatch({ type: "INCREMENT", payload: 1 });

    // Verify storage was called
    expect(mockStorage.setItem).toHaveBeenCalled();
  });
});
```

### Testing Migration

```typescript
describe("Migration", () => {
  it("should migrate state from version 1 to 2", () => {
    const oldState = {
      version: 1,
      todos: [{ id: 1, text: "Old format" }],
    };

    const persistEnhancer = createPersistEnhancer<TestState>({
      key: "test-app",
      version: 2,
      migrate: (state, fromVersion) => {
        if (fromVersion === 1) {
          return {
            version: 2,
            todos: state.todos.map((todo) => ({
              ...todo,
              completed: false, // Add new field
            })),
          };
        }
        return state;
      },
    });

    const store = createSvelteStore(rootReducer, oldState, persistEnhancer);

    // Verify migration worked
    expect(store.getState().todos[0].completed).toBe(false);
  });
});
```

## Best Practices

### 1. Use Selective Persistence

```typescript
// Good: Only persist essential data
const persistEnhancer = createPersistEnhancer<AppState>({
  key: "my-app",
  partialize: (state) => ({
    user: state.user,
    settings: state.settings,
    // Don't persist large arrays or temporary data
  }),
});

// Bad: Persist everything
const persistEnhancer = createPersistEnhancer<AppState>({
  key: "my-app",
  // No partialize - persists everything
});
```

### 2. Handle Version Changes

```typescript
// Good: Always include version and migration
const persistEnhancer = createPersistEnhancer<AppState>({
  key: "my-app",
  version: 2,
  migrate: (persistedState, fromVersion) => {
    // Handle schema changes
    return migratedState;
  },
});

// Bad: No version control
const persistEnhancer = createPersistEnhancer<AppState>({
  key: "my-app",
  // No version or migration
});
```

### 3. Use Appropriate Throttling

```typescript
// Good: Balance between responsiveness and performance
const persistEnhancer = createPersistEnhancer<AppState>({
  key: "my-app",
  throttle: 250, // Good balance
});

// Bad: No throttling or too aggressive
const persistEnhancer = createPersistEnhancer<AppState>({
  key: "my-app",
  throttle: 0, // Too frequent writes
  // or
  throttle: 5000, // Too infrequent
});
```

### 4. Handle Storage Errors Gracefully

```typescript
// Good: Error handling
const persistEnhancer = createPersistEnhancer<AppState>({
  key: "my-app",
  onStorageError: (error) => {
    console.error("Storage error:", error);
    // Implement fallback strategy
  },
});

// Bad: No error handling
const persistEnhancer = createPersistEnhancer<AppState>({
  key: "my-app",
  // No error handling
});
```

For more information about async operations, see the [Async State Management](./async-state-management.md) guide.

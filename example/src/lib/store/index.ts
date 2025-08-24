import {
  createSvelteStore,
  combineReducers,
  applyMiddleware,
  compose,
  thunkMiddleware,
  loggerMiddleware,
  createPersistEnhancer,
  createPersistMiddleware,
  type StoreEnhancer,
  createAsyncMiddleware,
  createCacheMiddleware,
  createRetryMiddleware,
} from "../../../../library/dist/index";

import type { AppState } from "./types";

import userReducer from "./user/slice";
import todosReducer from "./todos/slice";
import uiReducer from "./ui/slice";
import notificationsReducer from "./notifications/slice";
import postsReducer from "./posts/slice";
import { todoApi } from "../api";

import { fetchUser } from "./user/thunks";
import { fetchTodos, searchTodos, createTodoOptimistic } from "./todos/thunks";
import { pollNotifications } from "./notifications/thunks";
import { fetchPostsToStore, createPostWithOptimisticUpdate, updatePostInStore, deletePostFromStore } from "./posts/thunks";

import { clearUser } from "./user/slice";
import { addTodo, toggleTodo, removeTodo, setFilter, setTodos, setSearchQuery } from "./todos/slice";
import { toggleSidebar, setSidebar, toggleTheme, setTheme } from "./ui/slice";
import { clearNotifications, markAsRead } from "./notifications/slice";
import { addPost, updatePost, removePost, setPosts, setFilter as setPostsFilter, clearPosts } from "./posts/slice";

import * as userSelectors from "./user/selectors";
import * as todosSelectors from "./todos/selectors";
import * as uiSelectors from "./ui/selectors";
import * as notificationsSelectors from "./notifications/selectors";
import * as postsSelectors from "./posts/selectors";
import * as globalSelectors from "./selectors";

const rootReducer = combineReducers<AppState>({
  user: userReducer,
  todos: todosReducer,
  ui: uiReducer,
  notifications: notificationsReducer,
  posts: postsReducer,
  [todoApi.reducerPath]: todoApi.reducer,
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

// Enhanced store with persistence + async middleware + API middleware
const enhancedCreateStore = (compose as any)(
  persistEnhancer,
  applyMiddleware<AppState>(
    thunkMiddleware,
    todoApi.middleware, // Add API middleware for cache management
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
    clearUser,
    fetchUser,
  },
  todos: {
    addTodo,
    toggleTodo,
    removeTodo,
    setFilter,
    setTodos,
    setSearchQuery,
    fetchTodos,
    searchTodos,
    createTodoOptimistic,
  },
  ui: {
    toggleSidebar,
    setSidebar,
    toggleTheme,
    setTheme,
  },
  notifications: {
    clearNotifications,
    markAsRead,
    pollNotifications,
  },
  posts: {
    addPost,
    updatePost,
    removePost,
    setPosts,
    setPostsFilter,
    clearPosts,
    fetchPostsToStore,
    createPostWithOptimisticUpdate,
    updatePostInStore,
    deletePostFromStore,
  },
};

export const selectors = {
  user: userSelectors,
  todos: todosSelectors,
  ui: uiSelectors,
  notifications: notificationsSelectors,
  posts: postsSelectors,
  global: globalSelectors,
};
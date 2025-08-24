import { createSelector, asyncSelectors } from "../../../../../library/dist/index";
import type { AppState } from "../types";
import type { Todo, Filter } from "./types";

export const getAllTodos = (state: AppState) => state.todos.items;
export const getTodoFilter = (state: AppState) => state.todos.filter;
export const isFetchingTodos = (state: AppState) =>
  asyncSelectors.isLoading(state.todos.fetchTodos);
export const getTodosFetchError = (state: AppState) => state.todos.fetchTodos.error;

// Search selectors
export const getSearchQuery = (state: AppState) => state.todos.search.query;
export const getSearchResults = (state: AppState) => state.todos.search.data || [];
export const isSearching = (state: AppState) =>
  asyncSelectors.isLoading(state.todos.search);
export const getSearchError = (state: AppState) => state.todos.search.error;

export const getVisibleTodos = createSelector(
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
);

export const getTodoStats = createSelector(
  (state: AppState) => state.todos.items,
  (todos: Todo[]) => ({
    total: todos.length,
    completed: todos.filter((t: Todo) => t.completed).length,
    active: todos.filter((t: Todo) => !t.completed).length,
  })
);

import type { AppState } from "./types";

export const isAnyAsyncPending = (state: AppState) => {
  return (
    state.user.loading ||
    state.todos.fetchTodos.loading ||
    state.todos.search.loading ||
    state.notifications.loading
  );
};

export const getAllErrors = (state: AppState) => {
  const errors = [];
  if (state.user.error) errors.push(state.user.error);
  if (state.todos.fetchTodos.error)
    errors.push(state.todos.fetchTodos.error);
  if (state.todos.search.error) errors.push(state.todos.search.error);
  if (state.notifications.error) errors.push(state.notifications.error);
  return errors;
};

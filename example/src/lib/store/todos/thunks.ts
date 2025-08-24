import { createAsyncThunk, createSearchAsyncThunk } from "../../../../../library/dist/index";
import type { Todo } from "./types";
import type { AppState } from "../types";

export const fetchTodos = createAsyncThunk<Todo[], void>(
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
export const searchTodos = createSearchAsyncThunk<Todo>(
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

export const createTodoOptimistic = createAsyncThunk<Todo, { text: string }>(
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
      });
    }
  }
);

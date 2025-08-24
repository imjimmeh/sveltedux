import { createSlice, createAsyncState, type CaseReducerBuilder, type PayloadAction } from "../../../../../library/dist/index";
import type { Todo, TodosState, Filter } from "./types";
import { fetchTodos, searchTodos, createTodoOptimistic } from "./thunks";

export const todosSlice = createSlice({
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

export const { addTodo, toggleTodo, removeTodo, setFilter, setTodos, setSearchQuery } = todosSlice.actions;
export default todosSlice.reducer;

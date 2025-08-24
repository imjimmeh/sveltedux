import type { AsyncState } from "../../../../../library/dist/index";

export interface Todo {
  id: number;
  text: string;
  completed: boolean;
}

export type Filter = "all" | "active" | "completed";

export type TodosState = {
  items: Todo[];
  filter: Filter;
  fetchTodos: AsyncState<Todo[]>;
  search: AsyncState<Todo[]> & { query: string };
};

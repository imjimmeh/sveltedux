import type { AsyncState } from '../../../../library/dist/index';
import type { User } from "./user/types";
import type { TodosState } from "./todos/types";
import type { UIState } from "./ui/types";
import type { todoApi } from "../api";

export interface AppState {
  user: AsyncState<User>;
  todos: TodosState;
  ui: UIState;
  notifications: AsyncState<string[]>;
  api: ReturnType<typeof todoApi.reducer>;
}

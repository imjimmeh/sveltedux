import { createApiHooks } from "../../../../library/dist/api/index";
import { store } from "../store";
import { api } from "./index";

// Generate hooks
export const {
  useGetUserQuery,
  useLazyGetUserQuery,
  useGetUsersQuery,
  useLazyGetUsersQuery,
  useCreateUserMutation,
  useDeleteUserMutation,
  useGetTodosQuery,
  useLazyGetTodosQuery,
  useAddTodoMutation,
  useUpdateTodoMutation,
  useDeleteTodoMutation,
  useSearchTodosQuery,
  useLazySearchTodosQuery,
  useGetPostsQuery,
  useLazyGetPostsQuery,
  useCreatePostMutation,
  useUpdatePostMutation,
  useDeletePostMutation,
} = createApiHooks(store, api);
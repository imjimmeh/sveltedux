import { createAsyncThunk } from "./thunks.js";

export function createOptimisticAsyncThunk<TData, TArg, TState = unknown>(
  typePrefix: string,
  optimisticUpdate: (arg: TArg) => TData,
  asyncFunction: (arg: TArg) => Promise<TData>,
  revertFunction?: (originalData: TData, arg: TArg) => TData
) {
  type TResult = { data: TData; isOptimistic: boolean };
  return createAsyncThunk<TResult, TArg, TState>(
    typePrefix,
    async (arg, { rejectWithValue, getState }): Promise<TResult> => {
      try {
        optimisticUpdate(arg);

        const actualData = await asyncFunction(arg);

        return { data: actualData, isOptimistic: false };
      } catch (error) {
        // Revert optimistic update on error
        if (revertFunction) {
          const currentState = getState() as TState & { data: TData };
          const originalData = currentState.data;
          const revertedData = revertFunction(originalData, arg);
          return rejectWithValue({
            data: revertedData,
            isOptimistic: true,
            error: error as string,
          }) as unknown as TResult;
        }
        return rejectWithValue({
          data: optimisticUpdate(arg),
          isOptimistic: true,
          error: error as string,
        }) as unknown as TResult;
      }
    }
  );
}

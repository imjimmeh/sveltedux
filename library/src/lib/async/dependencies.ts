import type { AsyncThunkAction } from "./types.js";
import { createAsyncThunk } from "./thunks.js";

export function createDependentAsyncThunk<TData, TDep, TState = unknown>(
  typePrefix: string,
  dependencies: (() => AsyncThunkAction<TData, TState>)[],
  asyncFunction: (deps: TDep[]) => Promise<TData>
) {
  return createAsyncThunk<TData, void, TState>(
    typePrefix,
    async (_, { dispatch }) => {
      // Wait for all dependencies to complete
      const depResults = await Promise.all(
        dependencies.map((dep) => dispatch(dep() as any))
      );

      // Extract the payloads from fulfilled actions
      const depData = depResults.map((result) => {
        if (
          typeof result === "object" &&
          result !== null &&
          "payload" in result
        ) {
          return (result as { payload: TDep }).payload;
        }
        throw new Error(
          "Dependency result does not have expected payload structure"
        );
      });

      return await asyncFunction(depData);
    }
  );
}

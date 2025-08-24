import { createSlice, createAsyncState, type CaseReducerBuilder, type PayloadAction, type AsyncState } from "../../../../../library/dist/index";
import { fetchUser } from "./thunks";
import type { User } from "./types";

export const userSlice = createSlice({
  name: "user",
  initialState: createAsyncState<User>(),
  reducers: {
    clearUser: (state: AsyncState<User>) => {
      state.data = null;
      state.error = null;
    },
  },
  extraReducers: (builder: CaseReducerBuilder<AsyncState<User>>) => {
    builder
      .addCase(fetchUser.pending, (state: AsyncState<User, any>) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        fetchUser.fulfilled,
        (state: AsyncState<User>, action: PayloadAction<User>) => {
          state.loading = false;
          state.data = action.payload;
          state.lastFetch = Date.now();
        }
      )
      .addCase(
        fetchUser.rejected,
        (state: AsyncState<User>, action: PayloadAction<any>) => {
          state.loading = false;
          state.error = action.payload;
        }
      );
  },
});

export const { clearUser } = userSlice.actions;
export default userSlice.reducer;

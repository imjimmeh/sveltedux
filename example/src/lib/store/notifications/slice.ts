import { createSlice, createAsyncState, type CaseReducerBuilder, type PayloadAction, type AsyncState } from "../../../../../library/dist/index";
import { pollNotifications } from "./thunks";

// Create notifications slice
export const notificationsSlice = createSlice({
  name: "notifications",
  initialState: createAsyncState<string[]>([]),
  reducers: {
    clearNotifications: (state: AsyncState<string[]>) => {
      state.data = [];
    },
    markAsRead: (
      state: AsyncState<string[]>,
      action: PayloadAction<string>
    ) => {
      if (state.data) {
        state.data = state.data.filter((n: string) => n !== action.payload);
      }
    },
  },
  extraReducers: (builder: CaseReducerBuilder<AsyncState<string[]>>) => {
    builder
      .addCase(pollNotifications.pending, (state: AsyncState<string[]>) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        pollNotifications.fulfilled,
        (state: AsyncState<string[]>, action: PayloadAction<string[]>) => {
          state.loading = false;
          state.data = action.payload;
          state.lastFetch = Date.now();
        }
      )
      .addCase(
        pollNotifications.rejected,
        (state: AsyncState<string[]>, action: PayloadAction<any>) => {
          state.loading = false;
          state.error = action.payload;
        }
      );
  },
});

export const { clearNotifications, markAsRead } = notificationsSlice.actions;
export default notificationsSlice.reducer;

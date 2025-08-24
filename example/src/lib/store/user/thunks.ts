import { createAsyncThunk } from "../../../../../library/dist/index";
import type { User } from "./types";
import type { AppState } from "../types";

// Enhanced async thunks with better error handling and features
export const fetchUser = createAsyncThunk<User, number>(
  "user/fetchUser",
  async (userId: number, { signal, rejectWithValue }) => {
    try {
      const response = await fetch(`/api/users/${userId}`, {
        signal, // Support for cancellation
      });

      if (!response.ok) {
        if (response.status === 404) {
          return rejectWithValue({ message: "User not found", code: 404 });
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const user = await response.json();
      return user;
    } catch (error: any) {
      if (error.name === "AbortError") {
        return rejectWithValue({
          message: "Request was cancelled",
          code: "CANCELLED",
        });
      }
      return rejectWithValue({ message: error.message, code: "NETWORK_ERROR" });
    }
  },
  {
    condition: (userId, { getState }) => {
      const state = getState() as AppState;
      // Don't fetch if already loading or if we have recent data
      if (state.user.loading) return false;
      if (
        state.user.data?.id === userId &&
        state.user.lastFetch &&
        Date.now() - state.user.lastFetch < 30000
      ) {
        // 30 seconds cache
        return false;
      }
      return true;
    },
  }
);

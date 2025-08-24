import { createSlice, type PayloadAction } from "../../../../../library/dist/index";
import type { UIState } from "./types";

export const uiSlice = createSlice({
  name: "ui",
  initialState: {
    sidebarOpen: false,
    theme: "light" as "light" | "dark",
  } as UIState,
  reducers: {
    // No payload - Action type is inferred automatically
    toggleSidebar: (state: UIState) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    // PayloadAction<boolean> is inferred from parameter
    setSidebar: (state: UIState, action: PayloadAction<boolean>) => {
      state.sidebarOpen = action.payload;
    },
    // No payload - Action type is inferred automatically
    toggleTheme: (state: UIState) => {
      state.theme = state.theme === "light" ? "dark" : "light";
    },
    // PayloadAction<"light" | "dark"> is inferred from parameter
    setTheme: (state: UIState, action: PayloadAction<"light" | "dark">) => {
      state.theme = action.payload;
    },
  },
});

export const { toggleSidebar, setSidebar, toggleTheme, setTheme } = uiSlice.actions;
export default uiSlice.reducer;

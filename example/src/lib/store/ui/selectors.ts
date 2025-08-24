import type { AppState } from "../types";

export const isSidebarOpen = (state: AppState) => state.ui.sidebarOpen;
export const getTheme = (state: AppState) => state.ui.theme;

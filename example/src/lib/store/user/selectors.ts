import { asyncSelectors } from "../../../../../library/dist/index";
import type { AppState } from "../types";

export const getCurrentUser = (state: AppState) => state.user.data;
export const isUserLoading = (state: AppState) => asyncSelectors.isLoading(state.user);
export const getUserError = (state: AppState) => state.user.error;
export const hasUserData = (state: AppState) => asyncSelectors.hasData(state.user);
export const isUserStale = (state: AppState) => asyncSelectors.isStale(state.user, 30000); // 30 seconds

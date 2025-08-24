import { asyncSelectors } from "../../../../../library/dist/index";
import type { AppState } from "../types";

export const getNotifications = (state: AppState) => state.notifications.data || [];
export const isLoadingNotifications = (state: AppState) =>
  asyncSelectors.isLoading(state.notifications);
export const getNotificationError = (state: AppState) => state.notifications.error;
export const hasNewNotifications = (state: AppState) => {
  const notifications = state.notifications.data;
  return notifications && notifications.length > 0;
};

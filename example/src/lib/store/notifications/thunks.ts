import { createPollingAsyncThunk } from "../../../../../library/dist/index";
import type { AppState } from "../types";

// Polling for notifications
export const pollNotifications = createPollingAsyncThunk<string[], AppState>(
  "notifications/poll",
  async () => {
    // Simulate API call for notifications
    const notifications = [
      `New notification at ${new Date().toLocaleTimeString()}`,
      "You have 3 pending tasks",
      "System update available",
    ];

    return notifications.slice(0, Math.floor(Math.random() * 4));
  },
  {
    interval: 10000, // Poll every 10 seconds
    maxAttempts: 100,
    condition: (state: AppState) => state.ui.sidebarOpen, // Only poll when sidebar is open
  }
);

import type { Middleware } from "../types.js";

export const loggerMiddleware: Middleware<any> =
  ({ getState }) =>
  (next) =>
  (action) => {
    if (typeof action === "object" && action?.type) {
      console.group(`action ${action.type}`);
      console.log("prev state", getState());
      console.log("action", action);
      const result = next(action);
      console.log("next state", getState());
      console.groupEnd();
      return result;
    }
    return next(action);
  };

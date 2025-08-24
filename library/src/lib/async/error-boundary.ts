import { createAsyncThunk } from "./thunks.js";

export function createErrorBoundaryAsyncThunk<TData, TArg, TState = unknown>(
  typePrefix: string,
  asyncFunction: (arg: TArg) => Promise<TData>,
  errorBoundary: {
    fallbackData?: TData;
    onError?: (error: unknown, arg: TArg) => void;
    shouldRetry?: (error: unknown, attempt: number) => boolean;
    maxRetries?: number;
  } = {}
) {
  const { fallbackData, onError, shouldRetry, maxRetries = 3 } = errorBoundary;

  return createAsyncThunk<TData, TArg, TState>(typePrefix, async (arg) => {
    let lastError: unknown;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await asyncFunction(arg);
      } catch (error) {
        lastError = error;

        if (onError) {
          onError(error, arg);
        }

        if (attempt < maxRetries && shouldRetry?.(error, attempt)) {
          // Wait before retry with exponential backoff
          await new Promise((resolve) =>
            setTimeout(resolve, Math.pow(2, attempt) * 1000)
          );
          continue;
        }

        break;
      }
    }

    // If all retries failed, return fallback data or reject
    if (fallbackData !== undefined) {
      return fallbackData;
    }

    throw lastError;
  });
}

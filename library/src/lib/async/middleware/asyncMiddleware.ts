import type { Middleware } from "../../types.js";
import {
  isPending,
  isFulfilled,
  isRejected,
  isAsyncThunkAction,
  type AsyncLoadingState,
  type AsyncMiddlewareOptions,
} from "../index.js";

const DEFAULT_OPTIONS = {
  trackGlobalLoading: true,
  trackByType: true,
  trackByRequestId: true,
} as const;

const TYPE_SEPARATOR = "/";

class AsyncStateManager {
  constructor(private readonly loadingState: AsyncLoadingState) {}

  updateGlobalLoading(isLoading: boolean): void {
    this.loadingState.global = isLoading;
  }

  updateTypeLoading(typePrefix: string, isLoading: boolean): void {
    this.loadingState.byType[typePrefix] = isLoading;
  }

  updateRequestLoading(requestId: string, isLoading: boolean): void {
    if (isLoading) {
      this.loadingState.byRequestId[requestId] = true;
      this.loadingState.requestIds.add(requestId);
    } else {
      this.loadingState.byRequestId[requestId] = false;
      this.loadingState.requestIds.delete(requestId);
    }
  }

  recalculateGlobalLoading(): void {
    const hasAnyLoading =
      Object.values(this.loadingState.byType).some(Boolean) ||
      Object.values(this.loadingState.byRequestId).some(Boolean);
    this.loadingState.global = hasAnyLoading;
  }

  hasActiveLoading(): boolean {
    return this.loadingState.global;
  }
}

interface ActionWithMeta {
  type: string;
  meta?: { requestId?: string };
}

function extractActionMetadata(action: ActionWithMeta): {
  requestId?: string;
  typePrefix: string;
} {
  const { requestId } = action.meta || {};
  const typePrefix = action.type
    .split(TYPE_SEPARATOR)
    .slice(0, -1)
    .join(TYPE_SEPARATOR);
  return { requestId, typePrefix };
}

interface ActionWithError {
  error?: unknown;
  payload?: unknown;
}

function extractErrorFromAction(action: ActionWithError): unknown {
  return action.error || action.payload;
}

export function createAsyncMiddleware<TState = unknown>(
  options: AsyncMiddlewareOptions<TState> = {}
): Middleware<TState> {
  const {
    trackGlobalLoading,
    trackByType,
    trackByRequestId,
    onAsyncStart,
    onAsyncEnd,
    onAsyncError,
  } = { ...DEFAULT_OPTIONS, ...options };

  const loadingState: AsyncLoadingState = {
    global: false,
    byType: {},
    byRequestId: {},
    requestIds: new Set(),
  };

  const stateManager = new AsyncStateManager(loadingState);

  const handlePendingAction = (
    action: ActionWithMeta,
    getState: () => TState
  ): void => {
    const { requestId, typePrefix } = extractActionMetadata(action);

    if (trackGlobalLoading && !stateManager.hasActiveLoading()) {
      stateManager.updateGlobalLoading(true);
    }

    if (trackByType) {
      stateManager.updateTypeLoading(typePrefix, true);
    }

    if (trackByRequestId && requestId) {
      stateManager.updateRequestLoading(requestId, true);
    }

    onAsyncStart?.(action, getState());
  };

  const handleCompletedAction = (
    action: ActionWithMeta & ActionWithError,
    getState: () => TState
  ): void => {
    const { requestId, typePrefix } = extractActionMetadata(action);

    if (trackByType) {
      stateManager.updateTypeLoading(typePrefix, false);
    }

    if (trackByRequestId && requestId) {
      stateManager.updateRequestLoading(requestId, false);
    }

    if (trackGlobalLoading) {
      stateManager.recalculateGlobalLoading();
    }

    if (isRejected(action) && onAsyncError) {
      const error = extractErrorFromAction(action);
      onAsyncError(error, action, getState());
    }

    onAsyncEnd?.(action, getState());
  };

  return ({ getState }) =>
    (next) =>
    (action) => {
      if (isAsyncThunkAction(action)) {
        if (isPending(action)) {
          handlePendingAction(action, getState);
        } else if (isFulfilled(action) || isRejected(action)) {
          handleCompletedAction(action, getState);
        }
      }

      return next(action);
    };
}

export function createAsyncLoadingSelector<TState>(
  getAsyncState: (state: TState) => AsyncLoadingState
) {
  return {
    isGlobalLoading: (state: TState) => getAsyncState(state).global,
    isTypeLoading: (state: TState, type: string) =>
      getAsyncState(state).byType[type] || false,
    isRequestLoading: (state: TState, requestId: string) =>
      getAsyncState(state).byRequestId[requestId] || false,
    getActiveRequestIds: (state: TState) =>
      Array.from(getAsyncState(state).requestIds),
    getLoadingTypes: (state: TState) =>
      Object.keys(getAsyncState(state).byType).filter(
        (type) => getAsyncState(state).byType[type]
      ),
  };
}

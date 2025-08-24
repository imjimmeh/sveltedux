import type { ThunkDispatch, ThunkAction, Action } from "$lib/types.js";

export type AsyncThunkPayloadCreator<TReturn, TArg = void, TState = unknown> = (
  arg: TArg,
  thunkAPI: AsyncThunkAPI<TState>
) => Promise<TReturn> | TReturn;

export interface AsyncThunkAPI<TState> {
  dispatch: ThunkDispatch<TState, undefined, Action>;
  getState: () => TState;
  requestId: string;
  signal: AbortSignal;
  rejectWithValue: <TRejectedValue>(
    value: TRejectedValue
  ) => RejectWithValue<TRejectedValue>;
  fulfillWithValue: <TFulfilledValue>(
    value: TFulfilledValue
  ) => FulfillWithValue<TFulfilledValue>;
}

export interface RejectWithValue<TRejectedValue> {
  payload: TRejectedValue;
  meta: {
    rejectedWithValue: true;
  };
}

export interface FulfillWithValue<TFulfilledValue> {
  payload: TFulfilledValue;
  meta: {
    fulfilledWithValue: true;
  };
}

export interface AsyncThunkOptions<TArg, TState> {
  condition?: (
    arg: TArg,
    api: Pick<AsyncThunkAPI<TState>, "getState" | "dispatch">
  ) => boolean | Promise<boolean>;
  dispatchConditionRejection?: boolean;
  serializeError?: (error: Error) => {
    message: string;
    name: string;
    stack?: string;
  };
  idGenerator?: (arg: TArg) => string;
}

export interface AsyncThunkAction<TArg, TState> {
  (arg: TArg): ThunkAction<Promise<Action>, TState, undefined, Action>;
  pending: string;
  fulfilled: string;
  rejected: string;
  settled: string;
  typePrefix: string;
  requestId: () => string;
  abort: (reason?: string) => {
    type: string;
    payload: { requestId: string; reason?: string };
  };
}

export interface AsyncState<TData = unknown, TError = unknown> {
  data: TData | null;
  loading: boolean;
  error: TError | null;
  lastFetch: number | null;
  requestId: string | null;
}

export interface AsyncLoadingState {
  global: boolean;
  byType: Record<string, boolean>;
  byRequestId: Record<string, boolean>;
  requestIds: Set<string>;
}

export interface AsyncMiddlewareOptions<TState> {
  trackGlobalLoading?: boolean;
  trackByType?: boolean;
  trackByRequestId?: boolean;
  onAsyncStart?: (action: Action, state: TState) => void;
  onAsyncEnd?: (action: Action, state: TState) => void;
  onAsyncError?: (error: unknown, action: Action, state: TState) => void;
}

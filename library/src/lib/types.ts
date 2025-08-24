export interface Action<T = any> {
  type: string;
  payload?: T;
}
export type PayloadAction<T = any> = Action<T> & {
  payload: T;
};

export type CaseReducer<TState, TAction extends Action> = (
  state: TState,
  action: TAction
) => TState | void;

export type CaseReducerBuilder<TState> = {
  addCase<TAction extends Action>(
    actionCreator: ActionCreator<TAction["payload"]> | string,
    reducer: CaseReducer<TState, TAction>
  ): CaseReducerBuilder<TState>;
};

// Enhanced case reducer types for better type inference in createSlice
export type SliceCaseReducer<TState, TPayload = any> = (
  state: TState,
  action: PayloadAction<TPayload>
) => TState | void;

export type SliceCaseReducerNoPayload<TState> = (
  state: TState,
  action: Action
) => TState | void;

export type ValidateSliceCaseReducers<TState, TCaseReducers> = {
  [K in keyof TCaseReducers]: TCaseReducers[K] extends SliceCaseReducer<
    TState,
    infer TPayload
  >
    ? SliceCaseReducer<TState, TPayload>
    : TCaseReducers[K] extends SliceCaseReducerNoPayload<TState>
    ? SliceCaseReducerNoPayload<TState>
    : never;
};

export interface ActionCreator<TPayload = any> {
  (payload?: TPayload): Action<TPayload>;
  type: string;
}

export type Reducer<TState = any, TAction extends Action = Action> = (
  state: TState | undefined,
  action: TAction
) => TState;

export interface Store<TState = any> {
  state: TState;
  getState(): TState;
  subscribe(listener: () => void): () => void;
  dispatch: ThunkDispatch<TState, undefined, Action>;
  replaceReducer: (nextReducer: Reducer<TState>) => void;
}

export type StoreEnhancer<TState = any> = (
  next: StoreCreator<TState>
) => StoreCreator<TState>;

export type StoreCreator<TState = any> = (
  reducer: Reducer<TState>,
  preloadedState?: TState
) => Store<TState>;

export type Middleware<TState = any> = (
  store: MiddlewareAPI<TState>
) => (next: Dispatch) => Dispatch;

export interface MiddlewareAPI<TState = any> {
  dispatch: EnhancedDispatch<TState>;
  getState(): TState;
}

export type Dispatch<TAction extends Action = Action> = <T extends TAction>(
  action: T
) => T;

export interface EnhancedDispatch<TState = any> {
  <TAction extends Action>(action: TAction): TAction;
  <TReturn>(
    thunkAction: ThunkAction<TReturn, TState, undefined, Action>
  ): TReturn;
}

export type ThunkAction<
  TReturn = void,
  TState = any,
  TExtraArgument = undefined,
  TAction extends Action = Action
> = (
  dispatch: ThunkDispatch<TState, TExtraArgument, TAction>,
  getState: () => TState,
  extraArgument: TExtraArgument
) => TReturn;

export interface ThunkDispatch<TState, TExtraArgument, TAction extends Action> {
  <TReturn, TAction extends Action>(
    thunkAction: ThunkAction<TReturn, TState, TExtraArgument, TAction>
  ): TReturn;
  <T extends TAction>(action: T): T;
}

export type AsyncThunkPayloadCreator<TReturn, TArg = void, TState = any> = (
  arg: TArg,
  thunkAPI: AsyncThunkAPI<TState>
) => Promise<TReturn> | TReturn;

export interface AsyncThunkAPI<TState = any> {
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

export interface AsyncThunkAction<TReturn, TArg, TState> {
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

export interface AsyncMiddlewareOptions<TState = unknown> {
  trackGlobalLoading?: boolean;
  trackByType?: boolean;
  trackByRequestId?: boolean;
  onAsyncStart?: (action: Action, state: TState) => void;
  onAsyncEnd?: (action: Action, state: TState) => void;
  onAsyncError?: (error: unknown, action: Action, state: TState) => void;
}

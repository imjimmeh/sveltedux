export interface Action<T = unknown> {
  type: string;
  payload?: T;
}
export type PayloadAction<T = unknown> = Action<T> & {
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
export type SliceCaseReducer<TState, TPayload = unknown> = (
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

export interface ActionCreator<TPayload = unknown> {
  (payload?: TPayload): Action<TPayload>;
  type: string;
}

export type Reducer<TState, TAction extends Action = Action> = (
  state: TState | undefined,
  action: TAction
) => TState;

export interface Store<TState> {
  state: TState;
  getState(): TState;
  subscribe(listener: () => void): () => void;
  dispatch: ThunkDispatch<TState, undefined, Action>;
  replaceReducer: (nextReducer: Reducer<TState>) => void;
}

export type StoreEnhancer<TState> = (
  next: StoreCreator<TState>
) => StoreCreator<TState>;

export type StoreCreator<TState> = (
  reducer: Reducer<TState>,
  preloadedState?: TState
) => Store<TState>;

export type Middleware<TState> = (
  store: MiddlewareAPI<TState>
) => (next: Dispatch) => Dispatch;

export interface MiddlewareAPI<TState> {
  dispatch: EnhancedDispatch<TState>;
  getState(): TState;
}

export type Dispatch<TAction extends Action = Action> = <T extends TAction>(
  action: T
) => T;

export interface EnhancedDispatch<TState> {
  <TAction extends Action>(action: TAction): TAction;
  <TReturn>(
    thunkAction: ThunkAction<TReturn, TState, undefined, Action>
  ): TReturn;
}

export type ThunkAction<
  TReturn = void,
  TState = unknown,
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

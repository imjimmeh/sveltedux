import type { Action, ActionCreator } from './types.js';

export function createAction<TPayload = void>(
  type: string
): TPayload extends void 
  ? ActionCreator<void>
  : ActionCreator<TPayload> {
  
  const actionCreator = ((payload?: TPayload) => ({
    type,
    payload
  })) as TPayload extends void 
    ? ActionCreator<void>
    : ActionCreator<TPayload>;
  
  actionCreator.type = type;
  actionCreator.toString = () => type;
  
  return actionCreator;
}

export function createActions<T extends Record<string, unknown>>(
  actionMap: T
): { [K in keyof T]: ActionCreator<T[K]> } {
  const actions = {} as { [K in keyof T]: ActionCreator<T[K]> };
  
  for (const [type] of Object.entries(actionMap)) {
    actions[type as keyof T] = createAction(type) as ActionCreator<T[keyof T]>;
  }
  
  return actions;
}

export function createAsyncAction<TRequest = void, TSuccess = unknown, TFailure = string>(
  typePrefix: string
) {
  return {
    request: createAction<TRequest>(`${typePrefix}_REQUEST`),
    success: createAction<TSuccess>(`${typePrefix}_SUCCESS`),
    failure: createAction<TFailure>(`${typePrefix}_FAILURE`)
  };
}

export function isAction<TPayload>(
  action: unknown,
  actionCreator: ActionCreator<TPayload>
): action is Action<TPayload> {
  return (action as Action)?.type === actionCreator.type;
}

export function isActionOfType<TAction extends Action>(
  action: unknown,
  type: string
): action is TAction {
  return (action as Action)?.type === type;
}
import type { Action } from './types.js';

export interface FulfilledAction<TData> extends Action {
  payload: TData;
  meta: {
    requestId: string;
  };
}

export interface RejectedAction<TError> extends Action {
  error?: TError;
  payload?: TError;
  meta: {
    requestId: string;
    rejectedWithValue?: boolean;
  };
}

export function isFulfilledAction<TData>(action: Action): action is FulfilledAction<TData> {
  return action.type.endsWith('/fulfilled');
}

export function isRejectedAction<TError>(action: Action): action is RejectedAction<TError> {
  return action.type.endsWith('/rejected');
}

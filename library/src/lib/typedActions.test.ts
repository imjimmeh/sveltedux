import { describe, it, expect } from 'vitest';
import { isFulfilledAction, isRejectedAction } from './typedActions.js';
import type { FulfilledAction, RejectedAction } from './typedActions.js';

describe('typedActions', () => {
  describe('isFulfilledAction', () => {
    it('should return true for fulfilled action types', () => {
      const action = {
        type: 'user/fetchUser/fulfilled',
        payload: { id: 1, name: 'John' },
        meta: { requestId: 'abc123' }
      };

      expect(isFulfilledAction(action)).toBe(true);
    });

    it('should return false for non-fulfilled action types', () => {
      const pendingAction = {
        type: 'user/fetchUser/pending',
        meta: { requestId: 'abc123' }
      };

      const rejectedAction = {
        type: 'user/fetchUser/rejected',
        error: { message: 'Error' },
        meta: { requestId: 'abc123' }
      };

      const normalAction = {
        type: 'increment',
        payload: 1
      };

      expect(isFulfilledAction(pendingAction)).toBe(false);
      expect(isFulfilledAction(rejectedAction)).toBe(false);
      expect(isFulfilledAction(normalAction)).toBe(false);
    });

    it('should work with async thunk action types', () => {
      const actions = [
        { type: 'todos/fetchTodos/fulfilled', payload: [] },
        { type: 'user/updateProfile/fulfilled', payload: { name: 'Jane' } },
        { type: 'auth/login/fulfilled', payload: { token: 'xyz' } }
      ];

      actions.forEach(action => {
        expect(isFulfilledAction(action)).toBe(true);
      });
    });

    it('should handle edge cases', () => {
      const edgeCases = [
        { type: 'something/fulfilled', payload: null }, // Ends with '/fulfilled'
        { type: 'something/fulfilled/extra', payload: null }, // Extra parts after fulfilled
        { type: '', payload: null }, // Empty type
        { type: 'fulfilled', payload: null }, // Just 'fulfilled' without slash
        { type: '/fulfilled', payload: null } // Starts with slash
      ];

      expect(isFulfilledAction(edgeCases[0])).toBe(true);
      expect(isFulfilledAction(edgeCases[1])).toBe(false);
      expect(isFulfilledAction(edgeCases[2])).toBe(false);
      expect(isFulfilledAction(edgeCases[3])).toBe(false);
      expect(isFulfilledAction(edgeCases[4])).toBe(true);
    });
  });

  describe('isRejectedAction', () => {
    it('should return true for rejected action types', () => {
      const action = {
        type: 'user/fetchUser/rejected',
        error: { message: 'Network error' },
        meta: { requestId: 'abc123' }
      };

      expect(isRejectedAction(action)).toBe(true);
    });

    it('should return false for non-rejected action types', () => {
      const pendingAction = {
        type: 'user/fetchUser/pending',
        meta: { requestId: 'abc123' }
      };

      const fulfilledAction = {
        type: 'user/fetchUser/fulfilled',
        payload: { id: 1, name: 'John' },
        meta: { requestId: 'abc123' }
      };

      const normalAction = {
        type: 'increment',
        payload: 1
      };

      expect(isRejectedAction(pendingAction)).toBe(false);
      expect(isRejectedAction(fulfilledAction)).toBe(false);
      expect(isRejectedAction(normalAction)).toBe(false);
    });

    it('should work with async thunk action types', () => {
      const actions = [
        { type: 'todos/fetchTodos/rejected', error: { message: 'Failed' } },
        { type: 'user/updateProfile/rejected', payload: { code: 400 } },
        { type: 'auth/login/rejected', error: { code: 'UNAUTHORIZED' } }
      ];

      actions.forEach(action => {
        expect(isRejectedAction(action)).toBe(true);
      });
    });

    it('should handle edge cases', () => {
      const edgeCases = [
        { type: 'something/rejected', error: null }, // Ends with '/rejected'
        { type: 'something/rejected/extra', error: null }, // Extra parts after rejected
        { type: '', error: null }, // Empty type
        { type: 'rejected', error: null }, // Just 'rejected' without slash
        { type: '/rejected', error: null } // Starts with slash
      ];

      expect(isRejectedAction(edgeCases[0])).toBe(true);
      expect(isRejectedAction(edgeCases[1])).toBe(false);
      expect(isRejectedAction(edgeCases[2])).toBe(false);
      expect(isRejectedAction(edgeCases[3])).toBe(false);
      expect(isRejectedAction(edgeCases[4])).toBe(true);
    });
  });

  describe('type guards', () => {
    it('should properly narrow types for fulfilled actions', () => {
      const action = {
        type: 'user/fetchUser/fulfilled',
        payload: { id: 1, name: 'John' },
        meta: { requestId: 'abc123' }
      };

      if (isFulfilledAction<{ id: number; name: string }>(action)) {
        // TypeScript should recognize this as FulfilledAction<{ id: number; name: string }>
        expect(action.payload.id).toBe(1);
        expect(action.payload.name).toBe('John');
        expect(action.meta.requestId).toBe('abc123');
      } else {
        // This shouldn't execute
        expect.fail('Should have been recognized as fulfilled action');
      }
    });

    it('should properly narrow types for rejected actions', () => {
      const action = {
        type: 'user/fetchUser/rejected',
        error: { message: 'Network error', code: 500 },
        meta: { requestId: 'abc123', rejectedWithValue: false }
      };

      if (isRejectedAction<{ message: string; code: number }>(action)) {
        // TypeScript should recognize this as RejectedAction<{ message: string; code: number }>
        expect(action.error?.message).toBe('Network error');
        expect(action.error?.code).toBe(500);
        expect(action.meta.requestId).toBe('abc123');
        expect(action.meta.rejectedWithValue).toBe(false);
      } else {
        // This shouldn't execute
        expect.fail('Should have been recognized as rejected action');
      }
    });

    it('should handle actions with payload in rejected actions', () => {
      const action = {
        type: 'user/fetchUser/rejected',
        payload: { message: 'Custom error', code: 'USER_NOT_FOUND' },
        meta: { requestId: 'abc123', rejectedWithValue: true }
      };

      if (isRejectedAction<{ message: string; code: string }>(action)) {
        expect(action.payload?.message).toBe('Custom error');
        expect(action.payload?.code).toBe('USER_NOT_FOUND');
        expect(action.meta.rejectedWithValue).toBe(true);
      } else {
        expect.fail('Should have been recognized as rejected action');
      }
    });
  });
});
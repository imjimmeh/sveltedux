import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createAsyncMiddleware, createAsyncLoadingSelector } from './asyncMiddleware.js';
import type { AsyncLoadingState } from '../types.js';

// Mock the async utilities
vi.mock('../async.js', () => ({
  isPending: vi.fn((action) => action.type.endsWith('/pending')),
  isFulfilled: vi.fn((action) => action.type.endsWith('/fulfilled')),
  isRejected: vi.fn((action) => action.type.endsWith('/rejected')),
  isAsyncThunkAction: vi.fn((action) => 
    action.type.endsWith('/pending') || 
    action.type.endsWith('/fulfilled') || 
    action.type.endsWith('/rejected')
  )
}));

describe('createAsyncMiddleware', () => {
  let mockStore: any;
  let mockNext: any;
  let mockDispatch: any;
  let mockGetState: any;
  let onAsyncStart: any;
  let onAsyncEnd: any;
  let onAsyncError: any;

  beforeEach(() => {
    mockDispatch = vi.fn();
    mockGetState = vi.fn(() => ({}));
    mockNext = vi.fn((action) => action);
    mockStore = { dispatch: mockDispatch, getState: mockGetState };
    onAsyncStart = vi.fn();
    onAsyncEnd = vi.fn();
    onAsyncError = vi.fn();
  });

  describe('with default options', () => {
    it('should pass non-async actions through without modification', () => {
      const middleware = createAsyncMiddleware();
      const action = { type: 'REGULAR_ACTION', payload: 'test' };

      const result = middleware(mockStore)(mockNext)(action);

      expect(result).toBe(action);
      expect(mockNext).toHaveBeenCalledWith(action);
    });

    it('should handle pending async actions', () => {
      const middleware = createAsyncMiddleware();
      const pendingAction = {
        type: 'user/fetchUser/pending',
        meta: { requestId: 'req-123' }
      };

      const result = middleware(mockStore)(mockNext)(pendingAction);

      expect(result).toBe(pendingAction);
      expect(mockNext).toHaveBeenCalledWith(pendingAction);
    });

    it('should handle fulfilled async actions', () => {
      const middleware = createAsyncMiddleware();
      const fulfilledAction = {
        type: 'user/fetchUser/fulfilled',
        payload: { id: 1, name: 'John' },
        meta: { requestId: 'req-123' }
      };

      const result = middleware(mockStore)(mockNext)(fulfilledAction);

      expect(result).toBe(fulfilledAction);
      expect(mockNext).toHaveBeenCalledWith(fulfilledAction);
    });

    it('should handle rejected async actions', () => {
      const middleware = createAsyncMiddleware();
      const rejectedAction = {
        type: 'user/fetchUser/rejected',
        error: new Error('Failed to fetch'),
        meta: { requestId: 'req-123' }
      };

      const result = middleware(mockStore)(mockNext)(rejectedAction);

      expect(result).toBe(rejectedAction);
      expect(mockNext).toHaveBeenCalledWith(rejectedAction);
    });
  });

  describe('with callback options', () => {
    it('should call onAsyncStart for pending actions', () => {
      const middleware = createAsyncMiddleware({
        onAsyncStart,
        onAsyncEnd,
        onAsyncError
      });
      const pendingAction = {
        type: 'user/fetchUser/pending',
        meta: { requestId: 'req-123' }
      };

      middleware(mockStore)(mockNext)(pendingAction);

      expect(onAsyncStart).toHaveBeenCalledWith(pendingAction, {});
      expect(onAsyncEnd).not.toHaveBeenCalled();
      expect(onAsyncError).not.toHaveBeenCalled();
    });

    it('should call onAsyncEnd for fulfilled actions', () => {
      const middleware = createAsyncMiddleware({
        onAsyncStart,
        onAsyncEnd,
        onAsyncError
      });
      const fulfilledAction = {
        type: 'user/fetchUser/fulfilled',
        payload: { id: 1, name: 'John' },
        meta: { requestId: 'req-123' }
      };

      middleware(mockStore)(mockNext)(fulfilledAction);

      expect(onAsyncEnd).toHaveBeenCalledWith(fulfilledAction, {});
      expect(onAsyncStart).not.toHaveBeenCalled();
      expect(onAsyncError).not.toHaveBeenCalled();
    });

    it('should call onAsyncError for rejected actions', () => {
      const error = new Error('Failed to fetch');
      const middleware = createAsyncMiddleware({
        onAsyncStart,
        onAsyncEnd,
        onAsyncError
      });
      const rejectedAction = {
        type: 'user/fetchUser/rejected',
        error,
        meta: { requestId: 'req-123' }
      };

      middleware(mockStore)(mockNext)(rejectedAction);

      expect(onAsyncError).toHaveBeenCalledWith(error, rejectedAction, {});
      expect(onAsyncEnd).toHaveBeenCalledWith(rejectedAction, {});
      expect(onAsyncStart).not.toHaveBeenCalled();
    });

    it('should extract error from payload when error field is not present', () => {
      const errorPayload = { message: 'API Error' };
      const middleware = createAsyncMiddleware({
        onAsyncError
      });
      const rejectedAction = {
        type: 'user/fetchUser/rejected',
        payload: errorPayload,
        meta: { requestId: 'req-123' }
      };

      middleware(mockStore)(mockNext)(rejectedAction);

      expect(onAsyncError).toHaveBeenCalledWith(errorPayload, rejectedAction, {});
    });
  });

  describe('tracking options', () => {
    it('should respect trackGlobalLoading=false', () => {
      const middleware = createAsyncMiddleware({
        trackGlobalLoading: false,
        onAsyncStart
      });
      const pendingAction = {
        type: 'user/fetchUser/pending',
        meta: { requestId: 'req-123' }
      };

      middleware(mockStore)(mockNext)(pendingAction);

      expect(onAsyncStart).toHaveBeenCalled();
    });

    it('should respect trackByType=false', () => {
      const middleware = createAsyncMiddleware({
        trackByType: false,
        onAsyncStart
      });
      const pendingAction = {
        type: 'user/fetchUser/pending',
        meta: { requestId: 'req-123' }
      };

      middleware(mockStore)(mockNext)(pendingAction);

      expect(onAsyncStart).toHaveBeenCalled();
    });

    it('should respect trackByRequestId=false', () => {
      const middleware = createAsyncMiddleware({
        trackByRequestId: false,
        onAsyncStart
      });
      const pendingAction = {
        type: 'user/fetchUser/pending',
        meta: { requestId: 'req-123' }
      };

      middleware(mockStore)(mockNext)(pendingAction);

      expect(onAsyncStart).toHaveBeenCalled();
    });
  });

  describe('action sequence handling', () => {
    it('should handle complete async action lifecycle', () => {
      const middleware = createAsyncMiddleware({
        onAsyncStart,
        onAsyncEnd,
        onAsyncError
      });

      // Start with pending
      const pendingAction = {
        type: 'user/fetchUser/pending',
        meta: { requestId: 'req-123' }
      };
      middleware(mockStore)(mockNext)(pendingAction);
      expect(onAsyncStart).toHaveBeenCalledWith(pendingAction, {});

      // Complete with fulfilled
      const fulfilledAction = {
        type: 'user/fetchUser/fulfilled',
        payload: { id: 1, name: 'John' },
        meta: { requestId: 'req-123' }
      };
      middleware(mockStore)(mockNext)(fulfilledAction);
      expect(onAsyncEnd).toHaveBeenCalledWith(fulfilledAction, {});

      expect(onAsyncStart).toHaveBeenCalledTimes(1);
      expect(onAsyncEnd).toHaveBeenCalledTimes(1);
      expect(onAsyncError).not.toHaveBeenCalled();
    });

    it('should handle async action lifecycle with error', () => {
      const error = new Error('Network error');
      const middleware = createAsyncMiddleware({
        onAsyncStart,
        onAsyncEnd,
        onAsyncError
      });

      // Start with pending
      const pendingAction = {
        type: 'user/fetchUser/pending',
        meta: { requestId: 'req-123' }
      };
      middleware(mockStore)(mockNext)(pendingAction);

      // Complete with rejected
      const rejectedAction = {
        type: 'user/fetchUser/rejected',
        error,
        meta: { requestId: 'req-123' }
      };
      middleware(mockStore)(mockNext)(rejectedAction);

      expect(onAsyncStart).toHaveBeenCalledTimes(1);
      expect(onAsyncEnd).toHaveBeenCalledTimes(1);
      expect(onAsyncError).toHaveBeenCalledTimes(1);
    });
  });

  describe('action without meta', () => {
    it('should handle actions without meta object', () => {
      const middleware = createAsyncMiddleware({
        onAsyncStart
      });
      const pendingAction = {
        type: 'user/fetchUser/pending'
      };

      expect(() => {
        middleware(mockStore)(mockNext)(pendingAction);
      }).not.toThrow();

      expect(onAsyncStart).toHaveBeenCalledWith(pendingAction, {});
    });
  });
});

describe('createAsyncLoadingSelector', () => {
  let mockState: any;
  let mockAsyncState: AsyncLoadingState;
  let getAsyncState: (state: any) => AsyncLoadingState;

  beforeEach(() => {
    mockAsyncState = {
      global: false,
      byType: {
        'user/fetchUser': false,
        'posts/fetchPosts': true
      },
      byRequestId: {
        'req-123': false,
        'req-456': true
      },
      requestIds: new Set(['req-456'])
    };
    mockState = { async: mockAsyncState };
    getAsyncState = (state) => state.async;
  });

  it('should create selectors for global loading state', () => {
    const selectors = createAsyncLoadingSelector(getAsyncState);
    
    expect(selectors.isGlobalLoading(mockState)).toBe(false);

    mockAsyncState.global = true;
    expect(selectors.isGlobalLoading(mockState)).toBe(true);
  });

  it('should create selectors for type-specific loading state', () => {
    const selectors = createAsyncLoadingSelector(getAsyncState);
    
    expect(selectors.isTypeLoading(mockState, 'user/fetchUser')).toBe(false);
    expect(selectors.isTypeLoading(mockState, 'posts/fetchPosts')).toBe(true);
    expect(selectors.isTypeLoading(mockState, 'nonexistent/action')).toBe(false);
  });

  it('should create selectors for request-specific loading state', () => {
    const selectors = createAsyncLoadingSelector(getAsyncState);
    
    expect(selectors.isRequestLoading(mockState, 'req-123')).toBe(false);
    expect(selectors.isRequestLoading(mockState, 'req-456')).toBe(true);
    expect(selectors.isRequestLoading(mockState, 'req-999')).toBe(false);
  });

  it('should create selector for active request IDs', () => {
    const selectors = createAsyncLoadingSelector(getAsyncState);
    
    const activeRequestIds = selectors.getActiveRequestIds(mockState);
    expect(activeRequestIds).toEqual(['req-456']);
  });

  it('should create selector for loading types', () => {
    const selectors = createAsyncLoadingSelector(getAsyncState);
    
    const loadingTypes = selectors.getLoadingTypes(mockState);
    expect(loadingTypes).toEqual(['posts/fetchPosts']);
  });

  it('should handle empty loading states', () => {
    const emptyAsyncState: AsyncLoadingState = {
      global: false,
      byType: {},
      byRequestId: {},
      requestIds: new Set()
    };
    const emptyState = { async: emptyAsyncState };
    const selectors = createAsyncLoadingSelector(getAsyncState);
    
    expect(selectors.isGlobalLoading(emptyState)).toBe(false);
    expect(selectors.getActiveRequestIds(emptyState)).toEqual([]);
    expect(selectors.getLoadingTypes(emptyState)).toEqual([]);
  });
});
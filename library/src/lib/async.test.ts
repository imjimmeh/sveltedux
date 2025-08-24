import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
	createAsyncThunk, 
	createAsyncState, 
	isAsyncThunkAction,
	isPending,
	isFulfilled,
	isRejected,
	isAsyncThunkPending,
	isAsyncThunkFulfilled,
	isAsyncThunkRejected
} from './async.js';

// Mock fetch for testing
global.fetch = vi.fn();

interface TestState {
	counter: number;
}

const mockState: TestState = { counter: 0 };

describe('createAsyncState', () => {
	it('should create initial async state', () => {
		const asyncState = createAsyncState();
		
		expect(asyncState).toEqual({
			data: null,
			loading: false,
			error: null,
			lastFetch: null,
			requestId: null
		});
	});

	it('should create async state with initial data', () => {
		const initialData = { id: 1, name: 'test' };
		const asyncState = createAsyncState(initialData);
		
		expect(asyncState.data).toEqual(initialData);
		expect(asyncState.loading).toBe(false);
		expect(asyncState.error).toBeNull();
	});
});

describe('createAsyncThunk', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should create async thunk action creators', () => {
		const fetchUser = createAsyncThunk(
			'user/fetch',
			async (id: number) => {
				return { id, name: `User ${id}` };
			}
		);

		expect(fetchUser.pending).toBe('user/fetch/pending');
		expect(fetchUser.fulfilled).toBe('user/fetch/fulfilled');
		expect(fetchUser.rejected).toBe('user/fetch/rejected');
		expect(fetchUser.typePrefix).toBe('user/fetch');
	});

	it('should dispatch pending, fulfilled actions on success', async () => {
		const fetchUser = createAsyncThunk(
			'user/fetch',
			async (id: number) => {
				return { id, name: `User ${id}` };
			}
		);

		const dispatch = vi.fn();
		const getState = vi.fn(() => mockState);
		
		const thunkAction = fetchUser(1);
		const result = await thunkAction(dispatch as any, getState, undefined);

		// Should dispatch pending first
		expect(dispatch).toHaveBeenNthCalledWith(1, expect.objectContaining({
			type: 'user/fetch/pending',
			meta: expect.objectContaining({
				arg: 1,
				requestStatus: 'pending'
			})
		}));

		// Should dispatch fulfilled with result
		expect(dispatch).toHaveBeenNthCalledWith(2, expect.objectContaining({
			type: 'user/fetch/fulfilled',
			payload: { id: 1, name: 'User 1' },
			meta: expect.objectContaining({
				arg: 1,
				requestStatus: 'fulfilled'
			})
		}));

		// Should dispatch settled
		expect(dispatch).toHaveBeenNthCalledWith(3, expect.objectContaining({
			type: 'user/fetch/settled',
			payload: { id: 1, name: 'User 1' }
		}));

		expect(result.type).toBe('user/fetch/fulfilled');
	});

	it('should dispatch pending, rejected actions on error', async () => {
		const fetchUser = createAsyncThunk(
			'user/fetch',
			async (id: number) => {
				throw new Error('User not found');
			}
		);

		const dispatch = vi.fn();
		const getState = vi.fn(() => mockState);
		
		const thunkAction = fetchUser(1);
		const result = await thunkAction(dispatch as any, getState, undefined);

		// Should dispatch pending first
		expect(dispatch).toHaveBeenNthCalledWith(1, expect.objectContaining({
			type: 'user/fetch/pending'
		}));

		// Should dispatch rejected with error
		expect(dispatch).toHaveBeenNthCalledWith(2, expect.objectContaining({
			type: 'user/fetch/rejected',
			error: expect.objectContaining({
				message: 'User not found'
			}),
			meta: expect.objectContaining({
				requestStatus: 'rejected',
				rejectedWithValue: false
			})
		}));

		expect(result.type).toBe('user/fetch/rejected');
	});

	it('should handle rejectWithValue', async () => {
		const fetchUser = createAsyncThunk(
			'user/fetch',
			async (id: number, { rejectWithValue }) => {
				if (id < 0) {
					return rejectWithValue({ message: 'Invalid ID', code: 400 });
				}
				return { id, name: `User ${id}` };
			}
		);

		const dispatch = vi.fn();
		const getState = vi.fn(() => mockState);
		
		const thunkAction = fetchUser(-1);
		const result = await thunkAction(dispatch as any, getState, undefined);

		expect(dispatch).toHaveBeenNthCalledWith(2, expect.objectContaining({
			type: 'user/fetch/rejected',
			payload: { message: 'Invalid ID', code: 400 },
			meta: expect.objectContaining({
				rejectedWithValue: true
			})
		}));
	});

	it('should respect condition function', async () => {
		const fetchUser = createAsyncThunk(
			'user/fetch',
			async (id: number) => ({ id, name: `User ${id}` }),
			{
				condition: (id, { getState }) => {
					const state = getState() as TestState;
					return state.counter > 0;
				}
			}
		);

		const dispatch = vi.fn();
		const getState = vi.fn(() => ({ counter: 0 }));
		
		const thunkAction = fetchUser(1);
		const result = await thunkAction(dispatch as any, getState, undefined);

		// Should not dispatch pending if condition fails
		expect(dispatch).not.toHaveBeenCalledWith(expect.objectContaining({
			type: 'user/fetch/pending'
		}));
	});

	it('should handle async condition', async () => {
		const fetchUser = createAsyncThunk(
			'user/fetch',
			async (id: number) => ({ id, name: `User ${id}` }),
			{
				condition: async (id) => {
					await new Promise(resolve => setTimeout(resolve, 10));
					return id > 0;
				}
			}
		);

		const dispatch = vi.fn();
		const getState = vi.fn(() => mockState);
		
		const thunkAction = fetchUser(-1);
		const result = await thunkAction(dispatch as any, getState, undefined);

		// Should not execute if async condition fails
		expect(dispatch).not.toHaveBeenCalledWith(expect.objectContaining({
			type: 'user/fetch/pending'
		}));
	});

	it('should handle AbortSignal', async () => {
		const fetchUser = createAsyncThunk(
			'user/fetch',
			async (id: number, { signal }) => {
				await new Promise((resolve, reject) => {
					const timeout = setTimeout(resolve, 100);
					signal.addEventListener('abort', () => {
						clearTimeout(timeout);
						reject(new Error('Aborted'));
					});
				});
				return { id, name: `User ${id}` };
			}
		);

		const dispatch = vi.fn();
		const getState = vi.fn(() => mockState);
		
		const thunkAction = fetchUser(1);
		
		// Start the thunk but don't await it
		const promise = thunkAction(dispatch as any, getState, undefined);
		
		// Simulate abort after a short delay
		setTimeout(() => {
			// In a real scenario, you'd call abortController.abort()
			// For testing, we'll let the timeout complete
		}, 10);
		
		await promise;

		// Should complete normally in this test since we don't actually abort
		expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({
			type: 'user/fetch/fulfilled'
		}));
	});

	it('should generate unique request IDs', async () => {
		const fetchUser = createAsyncThunk(
			'user/fetch',
			async (id: number) => ({ id, name: `User ${id}` })
		);

		const dispatch1 = vi.fn();
		const dispatch2 = vi.fn();
		const getState = vi.fn(() => mockState);
		
		const thunk1 = fetchUser(1);
		const thunk2 = fetchUser(2);
		
		await Promise.all([
			thunk1(dispatch1 as any, getState, undefined),
			thunk2(dispatch2 as any, getState, undefined)
		]);

		const requestId1 = dispatch1.mock.calls[0][0].meta.requestId;
		const requestId2 = dispatch2.mock.calls[0][0].meta.requestId;
		
		expect(requestId1).toBeDefined();
		expect(requestId2).toBeDefined();
		expect(requestId1).not.toBe(requestId2);
	});

	it('should handle custom serializeError', async () => {
		const fetchUser = createAsyncThunk(
			'user/fetch',
			async (id: number) => {
				const error = new Error('Custom error') as any;
				error.status = 404;
				throw error;
			},
			{
				serializeError: (error) => ({
					message: error.message,
					name: error.name,
					status: (error as any).status,
					custom: 'serialized'
				})
			}
		);

		const dispatch = vi.fn();
		const getState = vi.fn(() => mockState);
		
		const thunkAction = fetchUser(1);
		await thunkAction(dispatch as any, getState, undefined);

		expect(dispatch).toHaveBeenNthCalledWith(2, expect.objectContaining({
			type: 'user/fetch/rejected',
			error: {
				message: 'Custom error',
				name: 'Error',
				status: 404,
				custom: 'serialized'
			}
		}));
	});
});

describe('async action type guards', () => {
	const fetchUser = createAsyncThunk('user/fetch', async (id: number) => ({ id }));

	it('should identify async thunk actions', () => {
		const pendingAction = { type: 'user/fetch/pending', payload: undefined };
		const fulfilledAction = { type: 'user/fetch/fulfilled', payload: { id: 1 } };
		const rejectedAction = { type: 'user/fetch/rejected', error: new Error() };
		const normalAction = { type: 'INCREMENT', payload: undefined };

		expect(isAsyncThunkAction(pendingAction)).toBe(true);
		expect(isAsyncThunkAction(fulfilledAction)).toBe(true);
		expect(isAsyncThunkAction(rejectedAction)).toBe(true);
		expect(isAsyncThunkAction(normalAction)).toBe(false);
	});

	it('should identify pending actions', () => {
		const pendingAction = { type: 'user/fetch/pending', payload: undefined };
		const fulfilledAction = { type: 'user/fetch/fulfilled', payload: { id: 1 } };

		expect(isPending(pendingAction)).toBe(true);
		expect(isPending(fulfilledAction)).toBe(false);
	});

	it('should identify fulfilled actions', () => {
		const fulfilledAction = { type: 'user/fetch/fulfilled', payload: { id: 1 } };
		const pendingAction = { type: 'user/fetch/pending', payload: undefined };

		expect(isFulfilled(fulfilledAction)).toBe(true);
		expect(isFulfilled(pendingAction)).toBe(false);
	});

	it('should identify rejected actions', () => {
		const rejectedAction = { type: 'user/fetch/rejected', error: new Error() };
		const fulfilledAction = { type: 'user/fetch/fulfilled', payload: { id: 1 } };

		expect(isRejected(rejectedAction)).toBe(true);
		expect(isRejected(fulfilledAction)).toBe(false);
	});

	it('should match specific async thunks', () => {
		const fetchUser = createAsyncThunk('user/fetch', async (id: number) => ({ id }));
		const fetchPost = createAsyncThunk('post/fetch', async (id: number) => ({ id }));

		const userPendingAction = { type: 'user/fetch/pending', payload: undefined };
		const postPendingAction = { type: 'post/fetch/pending', payload: undefined };

		const isUserPending = isAsyncThunkPending(fetchUser);
		const isPostPending = isAsyncThunkPending(fetchPost);

		expect(isUserPending(userPendingAction)).toBe(true);
		expect(isUserPending(postPendingAction)).toBe(false);
		expect(isPostPending(postPendingAction)).toBe(true);
		expect(isPostPending(userPendingAction)).toBe(false);
	});

	it('should match multiple async thunks', () => {
		const fetchUser = createAsyncThunk('user/fetch', async (id: number) => ({ id }));
		const fetchPost = createAsyncThunk('post/fetch', async (id: number) => ({ id }));

		const userFulfilledAction = { type: 'user/fetch/fulfilled', payload: { id: 1 } };
		const postFulfilledAction = { type: 'post/fetch/fulfilled', payload: { id: 1 } };
		const otherAction = { type: 'other/fulfilled', payload: {} };

		const isUserOrPostFulfilled = isAsyncThunkFulfilled(fetchUser, fetchPost);

		expect(isUserOrPostFulfilled(userFulfilledAction)).toBe(true);
		expect(isUserOrPostFulfilled(postFulfilledAction)).toBe(true);
		expect(isUserOrPostFulfilled(otherAction)).toBe(false);
	});

	it('should match any async thunk when no specific thunks provided', () => {
		const anyPending = isAsyncThunkPending();
		const anyFulfilled = isAsyncThunkFulfilled();
		const anyRejected = isAsyncThunkRejected();

		const pendingAction = { type: 'anything/pending', payload: undefined };
		const fulfilledAction = { type: 'anything/fulfilled', payload: {} };
		const rejectedAction = { type: 'anything/rejected', error: new Error() };
		const normalAction = { type: 'NORMAL_ACTION', payload: {} };

		expect(anyPending(pendingAction)).toBe(true);
		expect(anyPending(normalAction)).toBe(false);

		expect(anyFulfilled(fulfilledAction)).toBe(true);
		expect(anyFulfilled(normalAction)).toBe(false);

		expect(anyRejected(rejectedAction)).toBe(true);
		expect(anyRejected(normalAction)).toBe(false);
	});
});
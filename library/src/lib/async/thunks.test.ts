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
} from './thunks.js';

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

	it('should create an async thunk with proper action types', () => {
		const fetchData = createAsyncThunk(
			'data/fetch',
			async (id: string) => ({ id, name: 'Test' })
		);

		expect(fetchData.pending).toBe('data/fetch/pending');
		expect(fetchData.fulfilled).toBe('data/fetch/fulfilled');
		expect(fetchData.rejected).toBe('data/fetch/rejected');
		expect(fetchData.settled).toBe('data/fetch/settled');
		expect(fetchData.typePrefix).toBe('data/fetch');
	});

	it('should dispatch pending action when called', async () => {
		const mockDispatch = vi.fn();
		const mockGetState = vi.fn(() => mockState);

		const fetchData = createAsyncThunk(
			'data/fetch',
			async (id: string) => ({ id, name: 'Test' })
		);

		const thunk = fetchData('123');
		await thunk(mockDispatch, mockGetState, undefined);

		expect(mockDispatch).toHaveBeenCalledWith(
			expect.objectContaining({
				type: 'data/fetch/pending',
				payload: undefined,
				meta: expect.objectContaining({
					arg: '123',
					requestStatus: 'pending'
				})
			})
		);
	});

	it('should dispatch fulfilled action on success', async () => {
		const mockDispatch = vi.fn();
		const mockGetState = vi.fn(() => mockState);

		const fetchData = createAsyncThunk(
			'data/fetch',
			async (id: string) => ({ id, name: 'Test' })
		);

		const thunk = fetchData('123');
		await thunk(mockDispatch, mockGetState, undefined);

		expect(mockDispatch).toHaveBeenCalledWith(
			expect.objectContaining({
				type: 'data/fetch/fulfilled',
				payload: { id: '123', name: 'Test' },
				meta: expect.objectContaining({
					arg: '123',
					requestStatus: 'fulfilled'
				})
			})
		);
	});

	it('should dispatch rejected action on error', async () => {
		const mockDispatch = vi.fn();
		const mockGetState = vi.fn(() => mockState);

		const fetchData = createAsyncThunk(
			'data/fetch',
			async (id: string) => {
				throw new Error('Network error');
			}
		);

		const thunk = fetchData('123');
		await thunk(mockDispatch, mockGetState, undefined);

		expect(mockDispatch).toHaveBeenCalledWith(
			expect.objectContaining({
				type: 'data/fetch/rejected',
				payload: undefined,
				error: expect.objectContaining({
					message: 'Network error',
					name: 'Error'
				}),
				meta: expect.objectContaining({
					arg: '123',
					requestStatus: 'rejected',
					rejectedWithValue: false
				})
			})
		);
	});

	it('should handle rejectWithValue', async () => {
		const mockDispatch = vi.fn();
		const mockGetState = vi.fn(() => mockState);

		const fetchData = createAsyncThunk(
			'data/fetch',
			async (id: string, { rejectWithValue }) => {
				return rejectWithValue('Custom error');
			}
		);

		const thunk = fetchData('123');
		await thunk(mockDispatch, mockGetState, undefined);

		expect(mockDispatch).toHaveBeenCalledWith(
			expect.objectContaining({
				type: 'data/fetch/rejected',
				payload: 'Custom error',
				error: undefined,
				meta: expect.objectContaining({
					rejectedWithValue: true
				})
			})
		);
	});

	it('should handle condition rejection', async () => {
		const mockDispatch = vi.fn();
		const mockGetState = vi.fn(() => mockState);

		const fetchData = createAsyncThunk(
			'data/fetch',
			async (id: string) => ({ id, name: 'Test' }),
			{
				condition: (arg, { getState }) => {
					const state = getState() as TestState;
					return state.counter > 0;
				}
			}
		);

		const thunk = fetchData('123');
		const result = await thunk(mockDispatch, mockGetState, undefined);

		// Should not dispatch pending or fulfilled
		expect(mockDispatch).not.toHaveBeenCalledWith(
			expect.objectContaining({
				type: 'data/fetch/pending'
			})
		);
		
		expect(result).toEqual({
			type: 'data/fetch/conditionRejected',
			payload: undefined
		});
	});

	it('should handle custom id generator', async () => {
		const mockDispatch = vi.fn();
		const mockGetState = vi.fn(() => mockState);

		const fetchData = createAsyncThunk(
			'data/fetch',
			async (id: string) => ({ id, name: 'Test' }),
			{
				idGenerator: (arg) => `custom-${arg}`
			}
		);

		const thunk = fetchData('123');
		await thunk(mockDispatch, mockGetState, undefined);

		expect(mockDispatch).toHaveBeenCalledWith(
			expect.objectContaining({
				type: 'data/fetch/pending',
				meta: expect.objectContaining({
					requestId: 'custom-123'
				})
			})
		);
	});

	it('should handle custom error serialization', async () => {
		const mockDispatch = vi.fn();
		const mockGetState = vi.fn(() => mockState);

		const fetchData = createAsyncThunk(
			'data/fetch',
			async (id: string) => {
				throw new Error('Network error');
			},
			{
				serializeError: (error) => ({
					message: `Custom: ${(error as Error).message}`,
					name: (error as Error).name
				})
			}
		);

		const thunk = fetchData('123');
		await thunk(mockDispatch, mockGetState, undefined);

		expect(mockDispatch).toHaveBeenCalledWith(
			expect.objectContaining({
				type: 'data/fetch/rejected',
				error: expect.objectContaining({
					message: 'Custom: Network error'
				})
			})
		);
	});
});

describe('Action type predicates', () => {
	it('should identify async thunk actions', () => {
		const pendingAction = { type: 'test/pending' };
		const fulfilledAction = { type: 'test/fulfilled' };
		const rejectedAction = { type: 'test/rejected' };
		const regularAction = { type: 'test/regular' };

		expect(isAsyncThunkAction(pendingAction)).toBe(true);
		expect(isAsyncThunkAction(fulfilledAction)).toBe(true);
		expect(isAsyncThunkAction(rejectedAction)).toBe(true);
		expect(isAsyncThunkAction(regularAction)).toBe(false);
	});

	it('should identify pending actions', () => {
		expect(isPending({ type: 'test/pending' })).toBe(true);
		expect(isPending({ type: 'test/fulfilled' })).toBe(false);
		expect(isPending({ type: 'test/rejected' })).toBe(false);
	});

	it('should identify fulfilled actions', () => {
		expect(isFulfilled({ type: 'test/fulfilled' })).toBe(true);
		expect(isFulfilled({ type: 'test/pending' })).toBe(false);
		expect(isFulfilled({ type: 'test/rejected' })).toBe(false);
	});

	it('should identify rejected actions', () => {
		expect(isRejected({ type: 'test/rejected' })).toBe(true);
		expect(isRejected({ type: 'test/pending' })).toBe(false);
		expect(isRejected({ type: 'test/fulfilled' })).toBe(false);
	});

	it('should create specific thunk matchers', () => {
		const thunk1 = createAsyncThunk('thunk1', async () => 'data1');
		const thunk2 = createAsyncThunk('thunk2', async () => 'data2');

		const pendingMatcher = isAsyncThunkPending(thunk1, thunk2);
		const fulfilledMatcher = isAsyncThunkFulfilled(thunk1, thunk2);
		const rejectedMatcher = isAsyncThunkRejected(thunk1, thunk2);

		expect(pendingMatcher({ type: 'thunk1/pending' })).toBe(true);
		expect(pendingMatcher({ type: 'thunk2/pending' })).toBe(true);
		expect(pendingMatcher({ type: 'thunk3/pending' })).toBe(false);
		expect(pendingMatcher({ type: 'thunk1/fulfilled' })).toBe(false);

		expect(fulfilledMatcher({ type: 'thunk1/fulfilled' })).toBe(true);
		expect(fulfilledMatcher({ type: 'thunk2/fulfilled' })).toBe(true);
		expect(fulfilledMatcher({ type: 'thunk3/fulfilled' })).toBe(false);

		expect(rejectedMatcher({ type: 'thunk1/rejected' })).toBe(true);
		expect(rejectedMatcher({ type: 'thunk2/rejected' })).toBe(true);
		expect(rejectedMatcher({ type: 'thunk3/rejected' })).toBe(false);
	});

	it('should handle empty thunk matcher arguments', () => {
		const pendingMatcher = isAsyncThunkPending();
		const fulfilledMatcher = isAsyncThunkFulfilled();
		const rejectedMatcher = isAsyncThunkRejected();

		expect(pendingMatcher({ type: 'any/pending' })).toBe(true);
		expect(fulfilledMatcher({ type: 'any/fulfilled' })).toBe(true);
		expect(rejectedMatcher({ type: 'any/rejected' })).toBe(true);
	});
});
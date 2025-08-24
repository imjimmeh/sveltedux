import { describe, it, expect } from 'vitest';
import { combineReducers, createReducer, createSlice } from './reducers.js';
import type { Action } from './types.js';

interface CounterState {
	value: number;
}

interface MessageState {
	text: string;
}

interface CombinedState {
	counter: CounterState;
	message: MessageState;
}

const counterReducer = (state: CounterState = { value: 0 }, action: Action): CounterState => {
	switch (action.type) {
		case 'INCREMENT':
			return { value: state.value + 1 };
		case 'DECREMENT':
			return { value: state.value - 1 };
		case 'SET_VALUE':
			return { value: action.payload };
		default:
			return state;
	}
};

const messageReducer = (state: MessageState = { text: '' }, action: Action): MessageState => {
	switch (action.type) {
		case 'SET_MESSAGE':
			return { text: action.payload };
		case 'CLEAR_MESSAGE':
			return { text: '' };
		default:
			return state;
	}
};

describe('combineReducers', () => {
	it('should combine multiple reducers', () => {
		const rootReducer = combineReducers<CombinedState>({
			counter: counterReducer,
			message: messageReducer
		});

		const initialState = rootReducer(undefined, { type: '@@INIT' });
		expect(initialState).toEqual({
			counter: { value: 0 },
			message: { text: '' }
		});
	});

	it('should handle actions for specific reducers', () => {
		const rootReducer = combineReducers<CombinedState>({
			counter: counterReducer,
			message: messageReducer
		});

		let state = rootReducer(undefined, { type: '@@INIT' });
		
		state = rootReducer(state, { type: 'INCREMENT' });
		expect(state.counter.value).toBe(1);
		expect(state.message.text).toBe('');

		state = rootReducer(state, { type: 'SET_MESSAGE', payload: 'hello' });
		expect(state.counter.value).toBe(1);
		expect(state.message.text).toBe('hello');
	});

	it('should return same state reference if no changes', () => {
		const rootReducer = combineReducers<CombinedState>({
			counter: counterReducer,
			message: messageReducer
		});

		const state = rootReducer(undefined, { type: '@@INIT' });
		const newState = rootReducer(state, { type: 'UNKNOWN_ACTION' });
		
		expect(newState).toBe(state); // Same reference
	});

	it('should return new state reference if any slice changes', () => {
		const rootReducer = combineReducers<CombinedState>({
			counter: counterReducer,
			message: messageReducer
		});

		const state = rootReducer(undefined, { type: '@@INIT' });
		const newState = rootReducer(state, { type: 'INCREMENT' });
		
		expect(newState).not.toBe(state); // Different reference
		expect(newState.counter).not.toBe(state.counter); // Counter changed
		expect(newState.message).toBe(state.message); // Message unchanged
	});

	it('should throw error if reducer returns undefined', () => {
		const badReducer = () => undefined as any;
		const rootReducer = combineReducers({
			bad: badReducer
		});

		expect(() => {
			rootReducer(undefined, { type: '@@INIT' });
		}).toThrow('Reducer "bad" returned undefined.');
	});

	it('should ignore non-function reducers', () => {
		const rootReducer = combineReducers({
			counter: counterReducer,
			invalid: 'not a function' as any
		});

		const state = rootReducer(undefined, { type: '@@INIT' });
		expect(state).toEqual({
			counter: { value: 0 }
		});
	});
});

describe('createReducer', () => {
	it('should create a reducer from handlers', () => {
		const initialState = { count: 0, message: '' };
		const reducer = createReducer(initialState, {
			'INCREMENT': (state) => ({ ...state, count: state.count + 1 }),
			'DECREMENT': (state) => ({ ...state, count: state.count - 1 }),
			'SET_MESSAGE': (state, action) => ({ ...state, message: action.payload })
		});

		expect(reducer(undefined, { type: '@@INIT' })).toEqual(initialState);
		
		let state = reducer(undefined, { type: '@@INIT' });
		state = reducer(state, { type: 'INCREMENT' });
		expect(state.count).toBe(1);
		
		state = reducer(state, { type: 'SET_MESSAGE', payload: 'hello' });
		expect(state.message).toBe('hello');
	});

	it('should return original state for unknown actions', () => {
		const initialState = { count: 0 };
		const reducer = createReducer(initialState, {
			'INCREMENT': (state) => ({ ...state, count: state.count + 1 })
		});

		const state = reducer(undefined, { type: '@@INIT' });
		const newState = reducer(state, { type: 'UNKNOWN' });
		
		expect(newState).toBe(state);
	});
});

describe('createSlice', () => {
	it('should create a slice with actions and reducer', () => {
		    const counterSlice = createSlice({
      name: 'counter',
      initialState: { value: 0 },
      reducers: {
        increment: (state: { value: number }) => ({ value: state.value + 1 }),
        decrement: (state: { value: number }) => ({ value: state.value - 1 }),
        incrementByAmount: (state: { value: number }, action: { payload: number }) => ({ value: state.value + action.payload }),
        reset: () => ({ value: 0 })
      }
    });

		// Test action creators
		expect(counterSlice.actions.increment()).toEqual({
			type: 'counter/increment',
			payload: undefined
		});

		expect(counterSlice.actions.incrementByAmount(5)).toEqual({
			type: 'counter/incrementByAmount',
			payload: 5
		});

		// Test action types
		expect(counterSlice.actionTypes.increment).toBe('counter/increment');
		expect(counterSlice.actionTypes.incrementByAmount).toBe('counter/incrementByAmount');

		// Test reducer
		let state = counterSlice.reducer(undefined, { type: '@@INIT' });
		expect(state).toEqual({ value: 0 });

		state = counterSlice.reducer(state, counterSlice.actions.increment());
		expect(state).toEqual({ value: 1 });

		state = counterSlice.reducer(state, counterSlice.actions.incrementByAmount(5));
		expect(state).toEqual({ value: 6 });

		state = counterSlice.reducer(state, counterSlice.actions.reset());
		expect(state).toEqual({ value: 0 });
	});

	  it('should handle void actions', () => {
    const slice = createSlice({
      name: 'test',
      initialState: { flag: false },
      reducers: {
        toggle: (state: { flag: boolean }) => ({ flag: !state.flag }),
        setTrue: (state: { flag: boolean }) => ({ flag: true })
      }
    });

		let state = slice.reducer(undefined, { type: '@@INIT' });
		expect(state.flag).toBe(false);

		state = slice.reducer(state, slice.actions.toggle());
		expect(state.flag).toBe(true);

		state = slice.reducer(state, slice.actions.toggle());
		expect(state.flag).toBe(false);
	});

	it('should handle immutable updates', () => {
		const slice = createSlice({
			name: 'user',
			initialState: { name: '', age: 0 },
			reducers: {
				setName: (state, action) => {
					// Test that we can return undefined to keep the same state
					if (!action.payload) return;
					return { ...state, name: action.payload };
				},
				setAge: (state, action) => ({ ...state, age: action.payload })
			}
		});

		let state = slice.reducer(undefined, { type: '@@INIT' });
		const originalState = state;

		// Should return new state for valid updates
		state = slice.reducer(state, slice.actions.setName('John'));
		expect(state).not.toBe(originalState);
		expect(state.name).toBe('John');

		// Should return same state when reducer returns undefined
		const unchangedState = slice.reducer(state, slice.actions.setName(''));
		expect(unchangedState).toBe(state);
	});

	it('should return original state for unknown actions', () => {
		const slice = createSlice({
			name: 'test',
			initialState: { value: 0 },
			reducers: {
				increment: (state) => ({ value: state.value + 1 })
			}
		});

		const state = slice.reducer(undefined, { type: '@@INIT' });
		const newState = slice.reducer(state, { type: 'UNKNOWN_ACTION' });
		
		expect(newState).toBe(state);
	});

	it('should have correct slice name', () => {
		const slice = createSlice({
			name: 'testSlice',
			initialState: { value: 0 },
			reducers: {
				action1: (state) => state
			}
		});

		expect(slice.name).toBe('testSlice');
	});
});
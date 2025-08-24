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
			return { value: action.payload as number };
		default:
			return state;
	}
};

const messageReducer = (state: MessageState = { text: '' }, action: Action): MessageState => {
	switch (action.type) {
		case 'SET_MESSAGE':
			return { text: action.payload as string };
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
			'SET_MESSAGE': (state, action) => ({ ...state, message: action.payload as string })
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

	it('should support Immer mutative syntax', () => {
		const initialState = { 
			counter: 0, 
			items: ['item1'], 
			nested: { value: 'test' } 
		};
		const reducer = createReducer(initialState, {
			'INCREMENT_MUTATIVE': (state) => {
				state.counter += 1;
			},
			'ADD_ITEM_MUTATIVE': (state, action) => {
				state.items.push(action.payload as string);
			},
			'UPDATE_NESTED_MUTATIVE': (state, action) => {
				state.nested.value = action.payload as string;
			},
			'INCREMENT_IMMUTABLE': (state) => ({ 
				...state, 
				counter: state.counter + 1 
			})
		});

		let state = reducer(undefined, { type: '@@INIT' });
		expect(state).toEqual(initialState);

		// Test mutative increment
		state = reducer(state, { type: 'INCREMENT_MUTATIVE' });
		expect(state.counter).toBe(1);

		// Test mutative array push
		state = reducer(state, { type: 'ADD_ITEM_MUTATIVE', payload: 'item2' });
		expect(state.items).toEqual(['item1', 'item2']);

		// Test mutative nested update
		state = reducer(state, { type: 'UPDATE_NESTED_MUTATIVE', payload: 'updated' });
		expect(state.nested.value).toBe('updated');

		// Test immutable still works
		state = reducer(state, { type: 'INCREMENT_IMMUTABLE' });
		expect(state.counter).toBe(2);
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

	it('should support Immer mutative syntax', () => {
		const slice = createSlice({
			name: 'todos',
			initialState: { 
				items: [{ id: 1, text: 'Learn Redux', completed: false }],
				filter: 'all'
			},
			reducers: {
				addTodo: (state, action) => {
					// Mutative syntax - Immer handles immutability
					state.items.push({
						id: Math.max(0, ...state.items.map(t => t.id)) + 1,
						text: action.payload,
						completed: false
					});
				},
				toggleTodo: (state, action) => {
					// Direct mutation of nested properties
					const todo = state.items.find(item => item.id === action.payload);
					if (todo) {
						todo.completed = !todo.completed;
					}
				},
				setFilter: (state, action) => {
					// Simple property assignment
					state.filter = action.payload;
				}
			}
		});

		let state = slice.reducer(undefined, { type: '@@INIT' });
		expect(state.items).toHaveLength(1);
		expect(state.filter).toBe('all');

		// Test addTodo with mutative syntax
		state = slice.reducer(state, slice.actions.addTodo('Write tests'));
		expect(state.items).toHaveLength(2);
		expect(state.items[1].text).toBe('Write tests');
		expect(state.items[1].completed).toBe(false);

		// Test toggleTodo with mutative syntax
		state = slice.reducer(state, slice.actions.toggleTodo(1));
		expect(state.items[0].completed).toBe(true);

		// Test setFilter with mutative syntax
		state = slice.reducer(state, slice.actions.setFilter('completed'));
		expect(state.filter).toBe('completed');
	});

	it('should work with both mutative and immutable patterns', () => {
		const slice = createSlice({
			name: 'mixed',
			initialState: { counter: 0, list: [] as number[] },
			reducers: {
				// Immutable pattern (returning new state)
				incrementImmutable: (state) => ({ 
					...state, 
					counter: state.counter + 1 
				}),
				// Mutative pattern (modifying draft)
				incrementMutative: (state) => {
					state.counter += 1;
				},
				// Mixed: returning a completely new state
				addToListAndReset: (state, action) => {
					return { 
						...state, 
						list: [...state.list, action.payload],
						counter: 0 
					};
				}
			}
		});

		let state = slice.reducer(undefined, { type: '@@INIT' });
		
		// Both patterns should work
		state = slice.reducer(state, slice.actions.incrementImmutable());
		expect(state.counter).toBe(1);

		state = slice.reducer(state, slice.actions.incrementMutative());
		expect(state.counter).toBe(2);

		state = slice.reducer(state, slice.actions.addToListAndReset(42));
		expect(state.list).toEqual([42]);
		expect(state.counter).toBe(0);
	});
});
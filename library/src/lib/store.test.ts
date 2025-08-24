import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createStore, createSvelteStore } from './store.svelte.js';
import type { Action, Reducer } from './types.js';

interface TestState {
	count: number;
	message: string;
}

const initialState: TestState = {
	count: 0,
	message: 'hello'
};

const testReducer: Reducer<TestState> = (state = initialState, action) => {
	switch (action.type) {
		case 'INCREMENT':
			return { ...state, count: state.count + 1 };
		case 'DECREMENT':
			return { ...state, count: state.count - 1 };
		case 'SET_MESSAGE':
			return { ...state, message: action.payload };
		case 'RESET':
			return initialState;
		default:
			return state;
	}
};

describe('createStore', () => {
	it('should create a store with initial state', () => {
		const store = createStore(testReducer);
		expect(store.getState()).toEqual(initialState);
	});

	it('should create a store with preloaded state', () => {
		const preloadedState = { count: 5, message: 'preloaded' };
		const store = createStore(testReducer, preloadedState);
		expect(store.getState()).toEqual(preloadedState);
	});

	it('should dispatch actions and update state', () => {
		const store = createStore(testReducer);
		
		store.dispatch({ type: 'INCREMENT' });
		expect(store.getState().count).toBe(1);
		
		store.dispatch({ type: 'INCREMENT' });
		expect(store.getState().count).toBe(2);
		
		store.dispatch({ type: 'DECREMENT' });
		expect(store.getState().count).toBe(1);
	});

	it('should dispatch actions with payloads', () => {
		const store = createStore(testReducer);
		
		store.dispatch({ type: 'SET_MESSAGE', payload: 'world' });
		expect(store.getState().message).toBe('world');
	});

	it('should return the dispatched action', () => {
		const store = createStore(testReducer);
		const action = { type: 'INCREMENT' };
		const returnedAction = store.dispatch(action);
		expect(returnedAction).toBe(action);
	});

	it('should notify subscribers when state changes', () => {
		const store = createStore(testReducer);
		const subscriber = vi.fn();
		
		const unsubscribe = store.subscribe(subscriber);
		
		store.dispatch({ type: 'INCREMENT' });
		expect(subscriber).toHaveBeenCalledTimes(1);
		
		store.dispatch({ type: 'INCREMENT' });
		expect(subscriber).toHaveBeenCalledTimes(2);
		
		unsubscribe();
		store.dispatch({ type: 'INCREMENT' });
		expect(subscriber).toHaveBeenCalledTimes(2);
	});

	it('should not notify subscribers if state does not change', () => {
		const store = createStore(testReducer);
		const subscriber = vi.fn();
		
		store.subscribe(subscriber);
		store.dispatch({ type: 'UNKNOWN_ACTION' });
		
		// Should still be called even if state doesn't change
		expect(subscriber).toHaveBeenCalledTimes(1);
	});

	it('should handle multiple subscribers', () => {
		const store = createStore(testReducer);
		const subscriber1 = vi.fn();
		const subscriber2 = vi.fn();
		
		store.subscribe(subscriber1);
		store.subscribe(subscriber2);
		
		store.dispatch({ type: 'INCREMENT' });
		
		expect(subscriber1).toHaveBeenCalledTimes(1);
		expect(subscriber2).toHaveBeenCalledTimes(1);
	});

	it('should throw error for invalid actions', () => {
		const store = createStore(testReducer);
		
		expect(() => {
			store.dispatch({ type: null } as any);
		}).toThrow('Actions must have a type property that is a string.');
		
		expect(() => {
			store.dispatch({} as any);
		}).toThrow('Actions must have a type property that is a string.');
	});

	it('should throw error when accessing state during dispatch', () => {
		const recursiveReducer: Reducer<TestState> = (state = initialState, action) => {
			if (action.type === 'RECURSIVE') {
				// This would cause infinite recursion if allowed
				store.getState();
			}
			return state;
		};
		
		const store = createStore(recursiveReducer);
		
		expect(() => {
			store.dispatch({ type: 'RECURSIVE' });
		}).toThrow('You may not call store.getState() while the reducer is executing.');
	});

	it('should throw error when subscribing during dispatch', () => {
		let store: any;
		
		const recursiveReducer: Reducer<TestState> = (state = initialState, action) => {
			if (action.type === 'RECURSIVE_SUBSCRIBE') {
				store.subscribe(() => {});
			}
			return state;
		};
		
		store = createStore(recursiveReducer);
		
		expect(() => {
			store.dispatch({ type: 'RECURSIVE_SUBSCRIBE' });
		}).toThrow('You may not call store.subscribe() while the reducer is executing.');
	});

	it('should throw error when unsubscribing during dispatch', () => {
		let store: any;
		let unsubscribe: any;
		
		const recursiveReducer: Reducer<TestState> = (state = initialState, action) => {
			if (action.type === 'RECURSIVE_UNSUBSCRIBE') {
				unsubscribe();
			}
			return state;
		};
		
		store = createStore(recursiveReducer);
		unsubscribe = store.subscribe(() => {});
		
		expect(() => {
			store.dispatch({ type: 'RECURSIVE_UNSUBSCRIBE' });
		}).toThrow('You may not unsubscribe from a store listener while the reducer is executing.');
	});

	it('should handle enhancers', () => {
		const enhancer = (createStore: any) => (reducer: any, preloadedState: any) => {
			const store = createStore(reducer, preloadedState);
			return {
				...store,
				customMethod: () => 'enhanced'
			};
		};
		
		const store = createStore(testReducer, undefined, enhancer) as any;
		expect(store.customMethod()).toBe('enhanced');
	});
});

describe('createSvelteStore', () => {
	it('should create a reactive Svelte store', () => {
		const store = createSvelteStore(testReducer);
		expect(store.state).toEqual(initialState);
	});

	it('should update state reactively', () => {
		const store = createSvelteStore(testReducer);
		
		store.dispatch({ type: 'INCREMENT' });
		expect(store.state.count).toBe(1);
		
		store.dispatch({ type: 'SET_MESSAGE', payload: 'reactive' });
		expect(store.state.message).toBe('reactive');
	});

	it('should maintain all store methods', () => {
		const store = createSvelteStore(testReducer);
		
		expect(typeof store.dispatch).toBe('function');
		expect(typeof store.subscribe).toBe('function');
		expect(typeof store.getState).toBe('function');
	});

	it('should keep state in sync with getState', () => {
		const store = createSvelteStore(testReducer);
		
		store.dispatch({ type: 'INCREMENT' });
		
		expect(store.state).toEqual(store.getState());
		expect(store.state.count).toBe(1);
	});

	it('should handle preloaded state', () => {
		const preloadedState = { count: 10, message: 'preloaded' };
		const store = createSvelteStore(testReducer, preloadedState);
		
		expect(store.state).toEqual(preloadedState);
		expect(store.getState()).toEqual(preloadedState);
	});

	it('should work with enhancers', () => {
		const enhancer = (createStore: any) => (reducer: any, preloadedState: any) => {
			const store = createStore(reducer, preloadedState);
			return {
				...store,
				dispatch: (action: Action) => {
					console.log('Enhanced dispatch:', action.type);
					return store.dispatch(action);
				},
				// Preserve the reactive state getter
				get state() {
					return store.state;
				}
			};
		};
		
		const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
		const store = createSvelteStore(testReducer, undefined, enhancer);
		
		store.dispatch({ type: 'INCREMENT' });
		
		expect(consoleSpy).toHaveBeenCalledWith('Enhanced dispatch:', 'INCREMENT');
		expect(store.state.count).toBe(1);
		
		consoleSpy.mockRestore();
	});
});
import { describe, it, expect } from 'vitest';
import { 
	createAction, 
	createActions, 
	createAsyncAction, 
	isAction, 
	isActionOfType 
} from './actions.js';

describe('createAction', () => {
	it('should create an action creator with no payload', () => {
		const increment = createAction('INCREMENT');
		
		expect(increment.type).toBe('INCREMENT');
		expect(increment.toString()).toBe('INCREMENT');
		
		const action = increment();
		expect(action).toEqual({
			type: 'INCREMENT',
			payload: undefined
		});
	});

	it('should create an action creator with payload', () => {
		const setMessage = createAction<string>('SET_MESSAGE');
		
		expect(setMessage.type).toBe('SET_MESSAGE');
		
		const action = setMessage('hello');
		expect(action).toEqual({
			type: 'SET_MESSAGE',
			payload: 'hello'
		});
	});

	it('should create an action creator with complex payload', () => {
		interface User {
			id: number;
			name: string;
		}
		
		const setUser = createAction<User>('SET_USER');
		const user = { id: 1, name: 'John' };
		
		const action = setUser(user);
		expect(action).toEqual({
			type: 'SET_USER',
			payload: user
		});
	});

	it('should handle void payload type', () => {
		const reset = createAction('RESET');
		
		const action = reset();
		expect(action).toEqual({
			type: 'RESET',
			payload: undefined
		});
	});
});

describe('createActions', () => {
	it('should create multiple action creators', () => {
		const actions = createActions({
			increment: null,
			decrement: null,
			setMessage: 'string',
			setCount: 'number'
		});
		
		expect(actions.increment.type).toBe('increment');
		expect(actions.decrement.type).toBe('decrement');
		expect(actions.setMessage.type).toBe('setMessage');
		expect(actions.setCount.type).toBe('setCount');
	});

	it('should create working action creators', () => {
		const actions = createActions({
			increment: null,
			setMessage: 'string'
		});
		
		expect(actions.increment()).toEqual({
			type: 'increment',
			payload: undefined
		});
		
		expect(actions.setMessage('test')).toEqual({
			type: 'setMessage',
			payload: 'test'
		});
	});
});

describe('createAsyncAction', () => {
	it('should create async action creators', () => {
		const fetchUser = createAsyncAction<void, { id: number; name: string }, string>('FETCH_USER');
		
		expect(fetchUser.request.type).toBe('FETCH_USER_REQUEST');
		expect(fetchUser.success.type).toBe('FETCH_USER_SUCCESS');
		expect(fetchUser.failure.type).toBe('FETCH_USER_FAILURE');
	});

	it('should create correct action objects', () => {
		const fetchUser = createAsyncAction<{ id: number }, { name: string }, { message: string }>('FETCH_USER');
		
		const requestAction = fetchUser.request({ id: 1 });
		expect(requestAction).toEqual({
			type: 'FETCH_USER_REQUEST',
			payload: { id: 1 }
		});
		
		const successAction = fetchUser.success({ name: 'John' });
		expect(successAction).toEqual({
			type: 'FETCH_USER_SUCCESS',
			payload: { name: 'John' }
		});
		
		const failureAction = fetchUser.failure({ message: 'Not found' });
		expect(failureAction).toEqual({
			type: 'FETCH_USER_FAILURE',
			payload: { message: 'Not found' }
		});
	});
});

describe('isAction', () => {
	it('should check if action matches action creator', () => {
		const increment = createAction('INCREMENT');
		const decrement = createAction('DECREMENT');
		
		const incrementAction = increment();
		const decrementAction = decrement();
		
		expect(isAction(incrementAction, increment)).toBe(true);
		expect(isAction(incrementAction, decrement)).toBe(false);
		expect(isAction(decrementAction, increment)).toBe(false);
		expect(isAction(decrementAction, decrement)).toBe(true);
	});

	it('should handle invalid actions', () => {
		const increment = createAction('INCREMENT');
		
		expect(isAction(null, increment)).toBe(false);
		expect(isAction(undefined, increment)).toBe(false);
		expect(isAction({}, increment)).toBe(false);
		expect(isAction({ type: 'WRONG' }, increment)).toBe(false);
	});
});

describe('isActionOfType', () => {
	it('should check if action has specific type', () => {
		const action = { type: 'INCREMENT', payload: undefined };
		
		expect(isActionOfType(action, 'INCREMENT')).toBe(true);
		expect(isActionOfType(action, 'DECREMENT')).toBe(false);
	});

	it('should handle invalid actions', () => {
		expect(isActionOfType(null, 'INCREMENT')).toBe(false);
		expect(isActionOfType(undefined, 'INCREMENT')).toBe(false);
		expect(isActionOfType({}, 'INCREMENT')).toBe(false);
		expect(isActionOfType({ type: null }, 'INCREMENT')).toBe(false);
	});
});
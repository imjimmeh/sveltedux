import { describe, it, expect, vi } from 'vitest';
import { createSelector, createStructuredSelector } from './selectors.js';

interface TodoState {
	todos: Array<{
		id: number;
		text: string;
		completed: boolean;
	}>;
	filter: 'all' | 'active' | 'completed';
	searchQuery: string;
}

interface UserState {
	currentUser: {
		id: number;
		name: string;
	} | null;
	preferences: {
		theme: 'light' | 'dark';
		language: 'en' | 'es';
	};
}

interface AppState {
	todos: TodoState;
	user: UserState;
	ui: {
		sidebarOpen: boolean;
		loading: boolean;
	};
}

const mockState: AppState = {
	todos: {
		todos: [
			{ id: 1, text: 'Learn Redux', completed: false },
			{ id: 2, text: 'Build app', completed: true },
			{ id: 3, text: 'Write tests', completed: false }
		],
		filter: 'all',
		searchQuery: ''
	},
	user: {
		currentUser: { id: 1, name: 'John Doe' },
		preferences: {
			theme: 'light',
			language: 'en'
		}
	},
	ui: {
		sidebarOpen: true,
		loading: false
	}
};

describe('createSelector', () => {
	it('should create a basic selector', () => {
		const getTodos = createSelector(
			(state: AppState) => state.todos.todos
		);

		const todos = getTodos(mockState);
		expect(todos).toEqual(mockState.todos.todos);
	});

	it('should create a selector with transformation', () => {
		const getTodoCount = createSelector(
			(state: AppState) => state.todos.todos,
			(todos) => todos.length
		);

		const count = getTodoCount(mockState);
		expect(count).toBe(3);
	});

	it('should create a selector with multiple inputs', () => {
		const getVisibleTodos = createSelector(
			(state: AppState) => state.todos.todos,
			(state: AppState) => state.todos.filter,
			(todos, filter) => {
				switch (filter) {
					case 'active':
						return todos.filter(todo => !todo.completed);
					case 'completed':
						return todos.filter(todo => todo.completed);
					default:
						return todos;
				}
			}
		);

		const allTodos = getVisibleTodos(mockState);
		expect(allTodos).toHaveLength(3);

		const activeState = {
			...mockState,
			todos: { ...mockState.todos, filter: 'active' as const }
		};
		const activeTodos = getVisibleTodos(activeState);
		expect(activeTodos).toHaveLength(2);
		expect(activeTodos.every(todo => !todo.completed)).toBe(true);

		const completedState = {
			...mockState,
			todos: { ...mockState.todos, filter: 'completed' as const }
		};
		const completedTodos = getVisibleTodos(completedState);
		expect(completedTodos).toHaveLength(1);
		expect(completedTodos.every(todo => todo.completed)).toBe(true);
	});

	it('should memoize selector results', () => {
		const expensiveComputation = vi.fn((todos: any[]) => {
			return todos.map(todo => ({ ...todo, processed: true }));
		});

		const getProcessedTodos = createSelector(
			(state: AppState) => state.todos.todos,
			expensiveComputation
		);

		// First call
		const result1 = getProcessedTodos(mockState);
		expect(expensiveComputation).toHaveBeenCalledTimes(1);

		// Second call with same state - should use cached result
		const result2 = getProcessedTodos(mockState);
		expect(expensiveComputation).toHaveBeenCalledTimes(1);
		expect(result2).toBe(result1); // Same reference

		// Third call with different state - should recompute
		const newState = {
			...mockState,
			todos: {
				...mockState.todos,
				todos: [...mockState.todos.todos, { id: 4, text: 'New todo', completed: false }]
			}
		};
		const result3 = getProcessedTodos(newState);
		expect(expensiveComputation).toHaveBeenCalledTimes(2);
		expect(result3).not.toBe(result1);
	});

	it('should handle three input selectors', () => {
		const getFilteredSearchedTodos = createSelector(
			(state: AppState) => state.todos.todos,
			(state: AppState) => state.todos.filter,
			(state: AppState) => state.todos.searchQuery,
			(todos, filter, searchQuery) => {
				let filtered = todos;

				// Apply search filter
				if (searchQuery) {
					filtered = filtered.filter(todo => 
						todo.text.toLowerCase().includes(searchQuery.toLowerCase())
					);
				}

				// Apply status filter
				switch (filter) {
					case 'active':
						return filtered.filter(todo => !todo.completed);
					case 'completed':
						return filtered.filter(todo => todo.completed);
					default:
						return filtered;
				}
			}
		);

		const searchState = {
			...mockState,
			todos: {
				...mockState.todos,
				searchQuery: 'app',
				filter: 'all' as const
			}
		};

		const filteredTodos = getFilteredSearchedTodos(searchState);
		expect(filteredTodos).toHaveLength(1);
		expect(filteredTodos[0].text).toBe('Build app');
	});

	it('should recompute when input changes', () => {
		const computation = vi.fn((todos: any[]) => todos.length);

		const getTodoCount = createSelector(
			(state: AppState) => state.todos.todos,
			computation
		);

		// Initial computation
		getTodoCount(mockState);
		expect(computation).toHaveBeenCalledTimes(1);

		// Same state - should not recompute
		getTodoCount(mockState);
		expect(computation).toHaveBeenCalledTimes(1);

		// Different todos - should recompute
		const newState = {
			...mockState,
			todos: {
				...mockState.todos,
				todos: mockState.todos.todos.slice(0, 2)
			}
		};
		getTodoCount(newState);
		expect(computation).toHaveBeenCalledTimes(2);

		// Different unrelated state - should not recompute
		const stateWithDifferentUI = {
			...newState,
			ui: { ...newState.ui, loading: true }
		};
		getTodoCount(stateWithDifferentUI);
		expect(computation).toHaveBeenCalledTimes(2);
	});

	it('should handle selectors that return primitives', () => {
		const getCompletedCount = createSelector(
			(state: AppState) => state.todos.todos,
			(todos) => todos.filter(todo => todo.completed).length
		);

		expect(getCompletedCount(mockState)).toBe(1);

		const getUserName = createSelector(
			(state: AppState) => state.user.currentUser,
			(user) => user?.name || 'Anonymous'
		);

		expect(getUserName(mockState)).toBe('John Doe');

		const stateWithoutUser = {
			...mockState,
			user: { ...mockState.user, currentUser: null }
		};
		expect(getUserName(stateWithoutUser)).toBe('Anonymous');
	});

	it('should handle complex state transformations', () => {
		const getTodoStatistics = createSelector(
			(state: AppState) => state.todos.todos,
			(todos) => ({
				total: todos.length,
				completed: todos.filter(t => t.completed).length,
				active: todos.filter(t => !t.completed).length,
				completionRate: todos.length > 0 ? 
					Math.round((todos.filter(t => t.completed).length / todos.length) * 100) : 0
			})
		);

		const stats = getTodoStatistics(mockState);
		expect(stats).toEqual({
			total: 3,
			completed: 1,
			active: 2,
			completionRate: 33
		});
	});
});

describe('createStructuredSelector', () => {
	it('should create a structured selector', () => {
		const getAppData = createStructuredSelector({
			todos: (state: AppState) => state.todos.todos,
			currentUser: (state: AppState) => state.user.currentUser,
			sidebarOpen: (state: AppState) => state.ui.sidebarOpen
		});

		const result = getAppData(mockState);
		expect(result).toEqual({
			todos: mockState.todos.todos,
			currentUser: mockState.user.currentUser,
			sidebarOpen: mockState.ui.sidebarOpen
		});
	});

	it('should memoize structured selector results', () => {
		const expensiveSelector = vi.fn((state: AppState) => state.todos.todos.length);

		const getAppData = createStructuredSelector({
			todoCount: (state: AppState) => expensiveSelector(state),
			userName: (state: AppState) => state.user.currentUser?.name
		});

		// First call
		const result1 = getAppData(mockState);
		expect(expensiveSelector).toHaveBeenCalledTimes(1);

		// Second call with same state
		const result2 = getAppData(mockState);
		expect(expensiveSelector).toHaveBeenCalledTimes(1);
		expect(result2).toBe(result1);

		// Third call with changed todos
		const newState = {
			...mockState,
			todos: {
				...mockState.todos,
				todos: [...mockState.todos.todos, { id: 4, text: 'New', completed: false }]
			}
		};
		const result3 = getAppData(newState);
		expect(expensiveSelector).toHaveBeenCalledTimes(2);
		expect(result3).not.toBe(result1);
	});

	it('should handle empty selector object', () => {
		const getEmptyData = createStructuredSelector({});
		const result = getEmptyData(mockState);
		expect(result).toEqual({});
	});

	it('should handle single selector', () => {
		const getSingleData = createStructuredSelector({
			todos: (state: AppState) => state.todos.todos
		});

		const result = getSingleData(mockState);
		expect(result).toEqual({
			todos: mockState.todos.todos
		});
	});

	it('should recompute only when relevant parts change', () => {
		    const todoSelector = vi.fn((state: AppState) => state.todos.todos);
		const userSelector = vi.fn((state: AppState) => state.user.currentUser);

		const getAppData = createStructuredSelector({
			todos: (state: AppState) => todoSelector(state),
			user: (state: AppState) => userSelector(state)
		});

		// Initial call
		getAppData(mockState);
		expect(todoSelector).toHaveBeenCalledTimes(1);
		expect(userSelector).toHaveBeenCalledTimes(1);

		// Same state - no recomputation
		getAppData(mockState);
		expect(todoSelector).toHaveBeenCalledTimes(1);
		expect(userSelector).toHaveBeenCalledTimes(1);

		// Change todos only - should recompute
		const stateWithNewTodos = {
			...mockState,
			todos: {
				...mockState.todos,
				todos: [...mockState.todos.todos, { id: 4, text: 'New', completed: false }]
			}
		};
		getAppData(stateWithNewTodos);
		expect(todoSelector).toHaveBeenCalledTimes(2);
		expect(userSelector).toHaveBeenCalledTimes(2);

		// Change unrelated UI state - should not recompute
		const stateWithNewUI = {
			...stateWithNewTodos,
			ui: { ...stateWithNewTodos.ui, loading: true }
		};
		getAppData(stateWithNewUI);
		expect(todoSelector).toHaveBeenCalledTimes(3);
		expect(userSelector).toHaveBeenCalledTimes(3);
	});

	it('should work with computed selectors', () => {
		const getActiveTodosCount = createSelector(
			(state: AppState) => state.todos.todos,
			(todos) => todos.filter(t => !t.completed).length
		);

		const getCompletedTodosCount = createSelector(
			(state: AppState) => state.todos.todos,
			(todos) => todos.filter(t => t.completed).length
		);

		const getTotalTodosCount = (state: AppState): number => state.todos.todos.length;
		
		const getTodoStats = createStructuredSelector({
			active: (state: AppState) => getActiveTodosCount(state),
			completed: (state: AppState) => getCompletedTodosCount(state),
			total: (state: AppState) => getTotalTodosCount(state)
		});

		const stats = getTodoStats(mockState);
		expect(stats).toEqual({
			active: 2,
			completed: 1,
			total: 3
		});
	});
});
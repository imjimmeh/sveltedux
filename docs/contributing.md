# Contributing

Contributions are welcome! This guide will help you contribute to the Redux-Esque state management library for Svelte 5.

## Getting Started

### Prerequisites

- Node.js 18+
- Yarn or npm
- Basic knowledge of TypeScript
- Familiarity with Svelte 5
- Understanding of Redux patterns

### Development Setup

1. **Clone the repository**

```bash
git clone https://github.com/your-org/sveltekitlibrary.git
cd sveltekitlibrary
```

2. **Install dependencies**

```bash
yarn install
# or
npm install
```

3. **Run the development server**

```bash
yarn dev
# or
npm run dev
```

4. **Run tests**

```bash
yarn test
# or
npm run test
```

## Development Workflow

### 1. Create a Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b bugfix/your-bugfix-name
```

### 2. Make Changes

- Follow the existing code style
- Add tests for new functionality
- Update documentation as needed
- Ensure all tests pass

### 3. Test Your Changes

```bash
# Run all tests
yarn test

# Run specific test file
yarn test:unit -- redux/actions.test.ts

# Run tests with coverage
yarn test:coverage

# Run linting
yarn lint

# Run type checking
yarn type-check
```

### 4. Commit Changes

```bash
git add .
git commit -m "feat: add new feature"
# or
git commit -m "fix: fix existing bug"
```

### 5. Push and Create Pull Request

```bash
git push origin feature/your-feature-name
```

Then create a pull request on GitHub.

## Code Style

### TypeScript Guidelines

1. **Use strict TypeScript**

```typescript
// Good: Strong typing
interface User {
  id: number;
  name: string;
  email: string;
}

// Bad: Weak typing
interface User {
  id: any;
  name: any;
  email: any;
}
```

2. **Use generics for reusability**

```typescript
// Good: Generic types
interface EntityState<T> {
  entities: { [id: string]: T };
  ids: string[];
  loading: boolean;
}

// Bad: No generics
interface UserEntityState {
  entities: { [id: string]: User };
  ids: string[];
  loading: boolean;
}
```

3. **Use discriminated unions for actions**

```typescript
// Good: Discriminated unions
type AppAction =
  | { type: "INCREMENT"; payload: number }
  | { type: "ADD_TODO"; payload: { text: string } };

// Bad: No discriminated unions
type AppAction = {
  type: string;
  payload: any;
};
```

### Code Organization

1. **Follow the existing file structure**

```
src/lib/redux/
├── actions/          # Action creators
├── reducers/         # Reducer functions
├── selectors/        # Memoized selectors
├── middleware/       # Middleware functions
├── types/           # TypeScript types
├── utils/           # Utility functions
└── store/           # Store configuration
```

2. **Use barrel exports**

```typescript
// actions/index.ts
export * from "./user.actions";
export * from "./todo.actions";

// reducers/index.ts
export * from "./user.reducer";
export * from "./todo.reducer";
```

3. **Keep files focused**

- Each file should have a single responsibility
- Break down large files into smaller, focused modules
- Use clear, descriptive names

### Testing Guidelines

1. **Write tests for all new features**

```typescript
// actions.test.ts
describe("Actions", () => {
  it("should create increment action", () => {
    const action = increment(5);
    expect(action.type).toBe("INCREMENT");
    expect(action.payload).toBe(5);
  });
});
```

2. **Test both success and error cases**

```typescript
// asyncActions.test.ts
describe("Async Actions", () => {
  it("should fetch user successfully", async () => {
    const result = await fetchUser(1);
    expect(result.payload).toEqual({ id: 1, name: "John" });
  });

  it("should handle fetch error", async () => {
    const result = await fetchUser(999);
    expect(result.meta.rejected).toBe(true);
  });
});
```

3. **Use mock data for testing**

```typescript
// test-utils.ts
export const mockState = (overrides = {}) => ({
  user: null,
  todos: [],
  loading: false,
  ...overrides,
});
```

### Documentation Guidelines

1. **Update documentation for new features**

- Add JSDoc comments for public APIs
- Update README.md with new features
- Add examples to relevant documentation

2. **Use clear, concise language**

```typescript
// Good: Clear documentation
/**
 * Creates an async thunk for fetching user data.
 * @param userId - The ID of the user to fetch
 * @returns A promise that resolves to user data
 */
const fetchUser = createAsyncThunk<User, number>('user/fetchUser', ...);

// Bad: Unclear documentation
/**
 * Gets user
 * @param id user id
 * @returns user
 */
const fetchUser = createAsyncThunk('user/fetchUser', ...);
```

3. **Include examples in documentation**

```typescript
// Good: With examples
/**
 * Creates a slice of state with actions and a reducer.
 * @param config - Configuration object for the slice
 * @returns Slice object with reducer and actions
 *
 * @example
 * const todoSlice = createSlice({
 *   name: 'todos',
 *   initialState: [] as Todo[],
 *   reducers: {
 *     addTodo: (state, action) => {
 *       state.push({ id: Date.now(), text: action.payload.text });
 *     }
 *   }
 * });
 */
const createSlice = (config: SliceConfig) => { ... };
```

## Pull Request Guidelines

### PR Title Format

Use conventional commit format:

- `feat:` for new features
- `fix:` for bug fixes
- `docs:` for documentation changes
- `test:` for test changes
- `refactor:` for code refactoring
- `chore:` for maintenance tasks

Examples:

```
feat: add async thunk support
fix: resolve memory leak in middleware
docs: update API documentation
test: add comprehensive test suite
refactor: improve reducer organization
chore: update dependencies
```

### PR Description

Include:

- Brief description of changes
- Why the changes are needed
- How to test the changes
- Any breaking changes
- Related issues (if applicable)

Example:

```markdown
## Description

Add support for async thunks to handle API calls and other async operations.

## Changes

- Add `createAsyncThunk` utility
- Add middleware for handling async actions
- Update documentation with examples
- Add comprehensive tests

## Testing

- Run `yarn test` to verify all tests pass
- Test with both successful and failed async operations
- Verify middleware works correctly

## Breaking Changes

None - this is a new feature addition.

## Related Issues

Closes #123
```

### PR Checklist

Before submitting a PR, ensure:

- [ ] Code follows the project's style guide
- [ ] All tests pass (`yarn test`)
- [ ] Linting passes (`yarn lint`)
- [ ] Type checking passes (`yarn type-check`)
- [ ] Documentation is updated (if applicable)
- [ ] Tests are added (if applicable)
- [ ] Breaking changes are documented (if applicable)
- [ ] PR title follows conventional format
- [ ] PR description is clear and complete

## Architecture Overview

### Core Components

1. **Store**

   - Central state management
   - Svelte 5 reactive integration
   - Middleware support

2. **Actions**

   - Action creators
   - Async thunks
   - Type-safe actions

3. **Reducers**

   - State transformation logic
   - Immutable updates
   - Slice-based organization

4. **Selectors**

   - Memoized selectors
   - Derived state computation
   - Performance optimization

5. **Middleware**
   - Action interception
   - Side effects handling
   - Cross-cutting concerns

### File Structure

```
src/lib/redux/
├── index.ts                 # Main exports
├── types.ts                 # Core TypeScript types
├── store.ts                 # Store creation utilities
├── actions.ts               # Action utilities
├── reducers.ts              # Reducer utilities
├── selectors.ts             # Selector utilities
├── middleware.ts            # Middleware utilities
├── utils.ts                 # Utility functions
├── async.ts                 # Async utilities
├── persist.ts               # State persistence
├── example.ts               # Usage examples
├── components/              # Svelte components
│   ├── ThemeToggle.svelte
│   ├── TodoFilters.svelte
│   └── ...
├── middleware/              # Specific middleware
│   ├── asyncMiddleware.ts
│   ├── loggerMiddleware.ts
│   └── ...
└── docs/                   # Documentation
    ├── README.md
    ├── getting-started.md
    ├── api-reference/
    ├── guides/
    └── ...
```

## Testing Strategy

### Unit Tests

- Test individual functions and utilities
- Mock external dependencies
- Test edge cases and error scenarios

### Integration Tests

- Test component integration
- Test middleware chains
- Test async workflows

### End-to-End Tests

- Test complete user flows
- Test error handling scenarios
- Test performance characteristics

## Debugging

### Common Issues

1. **State not updating**

   - Check if reducer returns new state
   - Verify action is being dispatched
   - Check for middleware interference

2. **Type errors**

   - Verify TypeScript types
   - Check action payload types
   - Ensure reducer state types match

3. **Performance issues**
   - Check for unnecessary re-renders
   - Verify selector memoization
   - Look for large state objects

### Debug Tools

1. **Redux DevTools** (if applicable)
2. **Console logging** in middleware
3. **TypeScript debugging** in VS Code
4. **Performance profiling** in browser

## Release Process

### Versioning

Use semantic versioning:

- `MAJOR.MINOR.PATCH`
- Breaking changes: increment major
- New features: increment minor
- Bug fixes: increment patch

### Release Checklist

1. [ ] Update version in package.json
2. [ ] Update CHANGELOG.md
3. [ ] Run all tests
4. [ ] Update documentation
5. [ ] Create release branch
6. [ ] Tag release
7. [ ] Publish to npm
8. [ ] Create GitHub release

## Community Guidelines

### Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help newcomers learn
- Follow the project's values

### Getting Help

- GitHub Issues for bug reports
- GitHub Discussions for questions
- Discord/Slack for real-time chat
- Documentation for self-service

### Communication

- Use clear, descriptive language
- Provide context and examples
- Be patient and helpful
- Follow the project's communication style

## Resources

### Documentation

- [Main README](../README.md)
- [API Reference](./api-reference/)
- [Getting Started](./getting-started.md)
- [Best Practices](./best-practices.md)

### Tools

- TypeScript documentation
- Svelte 5 documentation
- Redux documentation
- Testing tools (Vitest, Testing Library)

### Examples

- [Example usage](../example.ts)
- [Component examples](../components/)
- [Test examples](../**/*.test.ts)

Thank you for contributing to the Redux-Esque library! 🎉

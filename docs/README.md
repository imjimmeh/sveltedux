# Redux-Esque State Management Library for Svelte 5

A full-featured Redux-like state management solution for Svelte 5 with runes support. This library provides a familiar Redux API while leveraging Svelte 5's reactivity system for optimal performance.

## Documentation Structure

This documentation is organized into the following sections:

### Getting Started

- [Getting Started](./getting-started.md) - Installation and quick start guide
- [API Reference](./api-reference/) - Complete API documentation
  - [Entity Adapter](./api-reference/entity-adapter.md) - Normalized entity management
- [Guides](./guides/) - In-depth guides and patterns
- [TypeScript Support](./typescript.md) - TypeScript integration
- [Best Practices](./best-practices.md) - Recommended patterns and practices
- [Comparison with Redux](./comparison.md) - How this library compares to Redux
- [State Persistence](./guides/state-persistence.md) - localStorage/sessionStorage integration
- [Contributing](./contributing.md) - Guidelines for contributing

## Features

- **Redux-like API**: Familiar patterns for developers coming from Redux
- **Svelte 5 Runes Integration**: Built specifically for Svelte 5's reactivity system
- **TypeScript Support**: Full TypeScript support with comprehensive type definitions
- **Async Actions**: Built-in support for async operations with createAsyncThunk
- **API Data Fetching**: Simple `{ data, loading, error }` pattern for API calls
- **Middleware**: Middleware support for logging, thunk, and custom middleware
- **Selectors**: Memoized selectors for efficient state derivation
- **Entity Adapter**: Normalized entity management with CRUD operations
- **DevTools**: Logger middleware for action logging
- **Utilities**: Immutability helpers, action creators, and more

## Installation

```bash
npm install sveltekitlibrary
```

## Quick Links

- [Getting Started](./getting-started.md)
- [API Reference](./api-reference/store.md)
- [Async State Management](./guides/async-state-management.md)
- [API Data Fetching](./guides/api-data-fetching.md)
- [State Persistence](./guides/state-persistence.md)

# API Reference

The Redux-Esque library includes a powerful API layer built on top of the core Redux functionality. This API layer provides a familiar RTK Query-like experience with automatic caching, refetching, and cache invalidation.

## Overview

The API system consists of several key components:

- **`createApi`**: Main function to define your API service
- **`fetchBaseQuery`**: Built-in fetch-based query function
- **Endpoints**: Queries (GET-like) and Mutations (POST/PUT/DELETE-like)
- **Auto-generated Hooks**: Svelte 5 reactive hooks for consuming endpoints
- **Caching & Invalidation**: Automatic caching with tag-based invalidation
- **Middleware**: Built-in middleware for cache management

## `createApi`

The main function for creating an API service.

```typescript
import { createApi, fetchBaseQuery } from "sveltedux/api";

interface Post {
  id: number;
  title: string;
  body: string;
}

const api = createApi({
  reducerPath: "api",
  baseQuery: fetchBaseQuery({ baseUrl: "/api" }),
  tagTypes: ["Post"],
  endpoints: (build) => ({
    getPosts: build.query<Post[], void>({
      query: () => "/posts",
      providesTags: ["Post"],
    }),
    getPost: build.query<Post, number>({
      query: (id) => `/posts/${id}`,
      providesTags: (result, error, id) => [{ type: "Post", id }],
    }),
    addPost: build.mutation<Post, Partial<Post>>({
      query: (body) => ({
        url: "/posts",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Post"],
    }),
    updatePost: build.mutation<Post, Partial<Post> & Pick<Post, "id">>({
      query: ({ id, ...patch }) => ({
        url: `/posts/${id}`,
        method: "PATCH",
        body: patch,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: "Post", id }],
    }),
    deletePost: build.mutation<{ success: boolean }, number>({
      query: (id) => ({
        url: `/posts/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Post"],
    }),
  }),
});

export const {
  useGetPostsQuery,
  useGetPostQuery,
  useAddPostMutation,
  useUpdatePostMutation,
  useDeletePostMutation,
} = createApiHooks(store, api);
```

### Configuration Options

| Option | Type | Description |
|--------|------|-------------|
| `reducerPath` | `string` | Unique key for the API reducer in your store |
| `baseQuery` | `BaseQuery` | Base query function (e.g., `fetchBaseQuery`) |
| `tagTypes` | `string[]` | Array of tag types used for cache invalidation |
| `endpoints` | `Function` | Function that defines your endpoints |
| `keepUnusedDataFor` | `number` | Cache lifetime in milliseconds (default: 60000) |
| `refetchOnMount` | `boolean` | Refetch on component mount (default: true) |
| `refetchOnFocus` | `boolean` | Refetch when window regains focus (default: false) |
| `refetchOnReconnect` | `boolean` | Refetch when network reconnects (default: false) |

## `fetchBaseQuery`

A prebuilt baseQuery using the Fetch API.

```typescript
import { fetchBaseQuery } from "sveltedux/api";

const baseQuery = fetchBaseQuery({
  baseUrl: "https://api.example.com",
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth.token;
    if (token) {
      headers.set("authorization", `Bearer ${token}`);
    }
    return headers;
  },
  timeout: 30000,
});
```

### Configuration Options

| Option | Type | Description |
|--------|------|-------------|
| `baseUrl` | `string` | Base URL for all requests |
| `prepareHeaders` | `Function` | Function to customize request headers |
| `fetchFn` | `Function` | Custom fetch implementation |
| `timeout` | `number` | Request timeout in milliseconds |

## Endpoint Definitions

### Query Endpoints

Query endpoints are for GET-like operations that return data.

```typescript
const getPosts = build.query<Post[], void>({
  query: () => "/posts",
  transformResponse: (response: { data: Post[] }) => response.data,
  transformErrorResponse: (error) => error.message,
  providesTags: ["Post"],
  keepUnusedDataFor: 30000,
});
```

### Mutation Endpoints

Mutation endpoints are for POST/PUT/DELETE-like operations that modify data.

```typescript
const addPost = build.mutation<Post, Partial<Post>>({
  query: (body) => ({
    url: "/posts",
    method: "POST",
    body,
  }),
  transformResponse: (response: { data: Post }) => response.data,
  transformErrorResponse: (error) => error.message,
  invalidatesTags: ["Post"],
});
```

### Endpoint Options

| Option | Type | Description |
|--------|------|-------------|
| `query` | `Function` | Function that returns the request configuration |
| `transformResponse` | `Function` | Transform the response data |
| `transformErrorResponse` | `Function` | Transform error responses |
| `providesTags` | `Function/array` | Tags this endpoint provides for caching |
| `invalidatesTags` | `Function/array` | Tags this endpoint invalidates when called |
| `keepUnusedDataFor` | `number` | Override global cache lifetime |

## Auto-generated Hooks

The `createApiHooks` function generates Svelte 5 reactive hooks for your endpoints.

### Query Hooks

Query hooks return a reactive object with the query state.

```typescript
// Auto-generated from getPosts endpoint
const useGetPostsQuery = createQueryHook(store, api, "getPosts");

// Usage in component
<script lang="ts">
  const { data, error, isLoading, isFetching, refetch } = useGetPostsQuery();
</script>
```

### Mutation Hooks

Mutation hooks return a trigger function that is also a reactive object containing the mutation state.

```typescript
// Auto-generated from addPost endpoint
const useAddPostMutation = createMutationHook(store, api, "addPost");

// Usage in component
<script lang="ts">
  const addPost = useAddPostMutation();
  
  async function handleSubmit(newPost) {
    await addPost(newPost);
  }
</script>

<button on:click={() => addPost({ title: '...' })} disabled={addPost.isLoading}>
  {addPost.isLoading ? 'Adding...' : 'Add Post'}
</button>
```

### Lazy Query Hooks

Lazy query hooks return a tuple containing a trigger function and the reactive query state object.

```typescript
// Auto-generated from getPost endpoint
const useLazyGetPostQuery = createLazyQueryHook(store, api, "getPost");

// Usage in component
<script lang="ts">
  const [getPost, { data, error, isLoading }] = useLazyGetPostQuery();
  
  async function handleLoadPost(id) {
    await getPost(id);
  }
</script>
```

## Hook Options

### Query Hook Options

```typescript
interface UseQueryOptions {
  skip?: boolean;
  refetchOnMount?: boolean;
  refetchOnFocus?: boolean;
  pollingInterval?: number;
}
```

### Mutation Hook Options

```typescript
interface UseMutationOptions {
  fixedCacheKey?: string;
}
```

## Cache Invalidation

The API system provides powerful cache invalidation through tags.

```typescript
const api = createApi({
  tagTypes: ["Post", "User"],
  endpoints: (build) => ({
    // Provides tags
    getPosts: build.query<Post[], void>({
      query: () => "/posts",
      providesTags: ["Post"],
    }),
    
    // Invalidates tags
    addPost: build.mutation<Post, Partial<Post>>({
      query: (body) => ({
        url: "/posts",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Post"],
    }),
    
    // Provides and invalidates based on result
    updatePost: build.mutation<Post, { id: number; patch: Partial<Post> }>({
      query: ({ id, patch }) => ({
        url: `/posts/${id}`,
        method: "PATCH",
        body: patch,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: "Post", id }],
    }),
  }),
});
```

## Manual Cache Management

You can manually manage the API cache through utility functions.

```typescript
const { util } = api;

// Reset the entire API state
store.dispatch(util.resetApiState());

// Invalidate specific tags
store.dispatch(util.invalidateTags(["Post", { type: "User", id: 1 }]));

// Prefetch data
store.dispatch(util.prefetch("getPosts", undefined));
```

## Selectors

The API provides selectors for accessing cache state.

```typescript
import { createApiStateSelectors } from "sveltedux/api";

const selectors = createApiStateSelectors("api"); // reducerPath

// Select the entire API state
const apiState = selectors.selectApiState(store.getState());

// Select all queries
const queries = selectors.selectQueries(store.getState());

// Select all mutations
const mutations = selectors.selectMutations(store.getState());

// Select loading state
const { isAnyLoading, loadingQueries } = selectors.selectQueriesLoading(store.getState());

// Select error state
const { hasAnyErrors, errorQueries } = selectors.selectQueriesErrors(store.getState());
```

## Middleware

The API includes built-in middleware for cache management and network status.

```typescript
import { createNetworkStatusMiddleware } from "sveltedux/api";

const networkMiddleware = createNetworkStatusMiddleware();

// Add to your store
const store = createSvelteStore(
  rootReducer,
  initialState,
  compose(
    applyMiddleware(thunkMiddleware, networkMiddleware),
    api.middleware
  )
);
```

## Error Handling

The API system provides comprehensive error handling.

```typescript
const { data, error, isLoading, isError, isSuccess } = useGetPostsQuery();

if (isLoading) {
  return <div>Loading...</div>;
}

if (isError) {
  return <div>Error: {error.status} - {error.message}</div>;
}

if (isSuccess) {
  return <div>{/* render data */}</div>;
}
```

## Best Practices

### 1. Organize Your API Slices

```typescript
// postsApi.ts
import { createApi, fetchBaseQuery } from "sveltedux/api";

export const postsApi = createApi({
  reducerPath: "postsApi",
  baseQuery: fetchBaseQuery({ baseUrl: "/api" }),
  tagTypes: ["Post"],
  endpoints: (build) => ({
    // endpoints here
  }),
});

// usersApi.ts
import { createApi, fetchBaseQuery } from "sveltedux/api";

export const usersApi = createApi({
  reducerPath: "usersApi",
  baseQuery: fetchBaseQuery({ baseUrl: "/api" }),
  tagTypes: ["User"],
  endpoints: (build) => ({
    // endpoints here
  }),
});
```

### 2. Use Tag-Based Invalidation

```typescript
// Good: Specific tag invalidation
updatePost: build.mutation<Post, { id: number; patch: Partial<Post> }>({
  query: ({ id, patch }) => ({
    url: `/posts/${id}`,
    method: "PATCH",
    body: patch,
  }),
  invalidatesTags: (result, error, { id }) => [{ type: "Post", id }],
});

// Bad: Broad invalidation
updatePost: build.mutation<Post, { id: number; patch: Partial<Post> }>({
  query: ({ id, patch }) => ({
    url: `/posts/${id}`,
    method: "PATCH",
    body: patch,
  }),
  invalidatesTags: ["Post"], // Invalidates all Post tags
});
```

### 3. Handle Loading States Properly

```svelte
<script lang="ts">
  const { data, error, isLoading, isFetching } = useGetPostsQuery();
</script>

{#if isLoading}
  <div>Loading initial data...</div>
{:else if isFetching}
  <div>Refreshing data...</div>
{:else if error}
  <div>Error: {error.message}</div>
{:else if data}
  <!-- render data -->
{/if}
```

### 4. Use Transform Functions

```typescript
// Transform response data
getPost: build.query<Post, number>({
  query: (id) => `/posts/${id}`,
  transformResponse: (response) => {
    // Normalize or transform the response
    return {
      ...response,
      createdAt: new Date(response.createdAt),
    };
  },
}),

// Transform error responses
addPost: build.mutation<Post, Partial<Post>>({
  query: (body) => ({
    url: "/posts",
    method: "POST",
    body,
  }),
  transformErrorResponse: (response) => {
    // Normalize error responses
    return {
      status: response.status,
      message: response.data?.message || "An error occurred",
    };
  },
}),
```

This API system provides a powerful, type-safe way to manage server state in your Svelte 5 applications, with automatic caching, refetching, and cache invalidation.
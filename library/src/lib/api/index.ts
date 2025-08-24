// Main createApi function
import type {
  BaseQuery,
  CreateApiOptions,
  Api,
  QueryEndpointDefinition,
  MutationEndpointDefinition,
} from "./types.js";
import {
  createEndpointBuilder,
  createQueryThunk,
  createMutationThunk,
} from "./endpoints.js";
import { createApiSlice } from "./slice.js";
import { createApiMiddleware } from "./middleware.js";
import { createQuerySelector, createMutationSelector } from "./selectors.js";

// Main createApi function
export function createApi<
  TBaseQuery extends BaseQuery,
  TTagTypes extends string = never,
  TReducerPath extends string = "api"
>(
  options: CreateApiOptions<TBaseQuery, TTagTypes, TReducerPath>
): Api<ReturnType<typeof options.endpoints>, TReducerPath, TTagTypes> {
  const {
    reducerPath = "api" as TReducerPath,
    baseQuery,
    tagTypes = [], // Used for validation and type safety
    endpoints: endpointsDefinition,
    keepUnusedDataFor = 60000, // 1 minute default
    refetchOnMount = true, // Used in Svelte hooks
    refetchOnFocus = false, // Used in Svelte hooks
    refetchOnReconnect = false,
  } = options;

  // Create endpoint builder and build endpoints
  const endpointBuilder = createEndpointBuilder<TTagTypes>();
  const endpointDefinitions = endpointsDefinition(endpointBuilder);

  // Create API slice
  const apiSlice = createApiSlice(reducerPath);

  // Create async thunks for all endpoints
  const asyncThunks: Record<string, any> = {};
  const selectors: Record<string, any> = {};

  Object.entries(endpointDefinitions).forEach(([endpointName, endpointDef]) => {
    if (endpointDef.type === "query") {
      // Create query thunk and selector
      const queryDef = endpointDef;

      asyncThunks[endpointName] = createQueryThunk(
        endpointName,
        queryDef,
        baseQuery,
        reducerPath,
        apiSlice.actions
      );

      selectors[endpointName] = createQuerySelector(
        endpointName,
        reducerPath,
        asyncThunks[endpointName]
      );
    } else if (endpointDef.type === "mutation") {
      // Create mutation thunk and selector
      const mutationDef = endpointDef;

      asyncThunks[endpointName] = createMutationThunk(
        endpointName,
        mutationDef,
        baseQuery,
        reducerPath,
        apiSlice.actions
      );

      selectors[endpointName] = createMutationSelector(
        endpointName,
        reducerPath
      );
    }
  });

  // Create middleware
  const apiMiddleware = createApiMiddleware(
    reducerPath,
    endpointDefinitions,
    { keepUnusedDataFor, refetchOnReconnect },
    apiSlice.actions,
    asyncThunks
  );

  // Build endpoints object
  const endpoints: any = {};
  Object.keys(endpointDefinitions).forEach((endpointName) => {
    endpoints[endpointName] = {
      type: endpointDefinitions[endpointName].type,
      select: selectors[endpointName],
      initiate: asyncThunks[endpointName],
    };
  });

  return {
    reducerPath,
    reducer: apiSlice.reducer,
    middleware: apiMiddleware,
    endpoints,
    util: {
      resetApiState: apiSlice.actions.resetApiState,
      invalidateTags: (tags: any) => apiSlice.actions.invalidateTags({ tags }),
      prefetch: (endpointName: string, args: any) =>
        asyncThunks[endpointName](args),
    },
  } as any;
}

// Re-export types and utilities
export type * from "./types.js";
export { fetchBaseQuery } from "./baseQuery.js";
export { createApiStateSelectors } from "./selectors.js";
export { createNetworkStatusMiddleware } from "./middleware.js";

// Re-export hooks and factory functions
export type { UseQueryOptions, UseMutationOptions } from "./hooks/index.js";
export {
  createQueryHook,
  createMutationHook,
  createLazyQueryHook,
} from "./hooks/index.js";
export { createApiHooks, createStoreSubscription } from "./factory.js";

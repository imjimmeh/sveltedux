// API functionality for data fetching with caching
export {
  createApi,
  fetchBaseQuery,
  createApiHooks,
  createQueryHook,
  createMutationHook,
  createLazyQueryHook,
  createStoreSubscription,
} from "./api/index.js";

export type {
  BaseQuery,
  BaseQueryApi,
  QueryResult,
  Tag,
  TagDescription,
  QueryDefinition,
  MutationDefinition,
  EndpointBuilder,
  QueryEndpointDefinition,
  MutationEndpointDefinition,
  CreateApiOptions,
  CacheEntry,
  ApiState,
  QueryHookResult,
  MutationHookResult,
  Api,
  UseQueryOptions,
  UseMutationOptions,
} from "./api/index.js";
import type {
  Action,
  Reducer,
  Middleware,
  Store,
  AsyncState,
} from "../types.js";

// Base query function type
export type BaseQuery<TResult = unknown, TArgs = any, TError = unknown> = (
  args: TArgs,
  api: BaseQueryApi
) => Promise<QueryResult<TResult, TError>>;

export interface BaseQueryApi {
  signal: AbortSignal;
  dispatch: Store["dispatch"];
  getState: Store["getState"];
}

export type QueryResult<TResult = unknown, TError = unknown> =
  | { data: TResult; error?: never }
  | { error: TError; data?: never };

// Tag system for cache invalidation
export type Tag<T extends string = string> = {
  type: T;
  id?: string | number;
};

export type TagDescription<T extends string> = T | Tag<T>;

// Endpoint definitions
export interface QueryDefinition<
  TResult = unknown,
  TArgs = any,
  TTagType extends string = string,
  TError = unknown
> {
  query: (args: TArgs) => any;
  transformResponse?: (response: any, meta: any, arg: TArgs) => TResult;
  transformErrorResponse?: (response: any, meta: any, arg: TArgs) => TError;
  providesTags?: (
    result: TResult | undefined,
    error: TError | undefined,
    arg: TArgs
  ) => readonly TagDescription<TTagType>[];
  keepUnusedDataFor?: number;
  extraOptions?: any;
}

export interface MutationDefinition<
  TResult = unknown,
  TArgs = any,
  TTagType extends string = string,
  TError = unknown
> {
  query: (args: TArgs) => any;
  transformResponse?: (response: any, meta: any, arg: TArgs) => TResult;
  transformErrorResponse?: (response: any, meta: any, arg: TArgs) => TError;
  invalidatesTags?: (
    result: TResult | undefined,
    error: TError | undefined,
    arg: TArgs
  ) => readonly TagDescription<TTagType>[];
  keepUnusedDataFor?: number;
  extraOptions?: any;
}

// Endpoint builder
export interface EndpointBuilder<TTagTypes extends string> {
  query<TResult = unknown, TArgs = void, TError = unknown>(
    definition: QueryDefinition<TResult, TArgs, TTagTypes, TError>
  ): QueryEndpointDefinition<TResult, TArgs, TTagTypes, TError>;

  mutation<TResult = unknown, TArgs = void, TError = unknown>(
    definition: MutationDefinition<TResult, TArgs, TTagTypes, TError>
  ): MutationEndpointDefinition<TResult, TArgs, TTagTypes, TError>;
}

export interface QueryEndpointDefinition<
  TResult,
  TArgs,
  TTagTypes extends string,
  TError
> {
  type: "query";
  definition: QueryDefinition<TResult, TArgs, TTagTypes, TError>;
}

export interface MutationEndpointDefinition<
  TResult,
  TArgs,
  TTagTypes extends string,
  TError
> {
  type: "mutation";
  definition: MutationDefinition<TResult, TArgs, TTagTypes, TError>;
}

// API configuration
export interface CreateApiOptions<
  TBaseQuery extends BaseQuery,
  TTagTypes extends string = never,
  TReducerPath extends string = "api"
> {
  reducerPath?: TReducerPath;
  baseQuery: TBaseQuery;
  tagTypes?: readonly TTagTypes[];
  endpoints: (
    build: EndpointBuilder<TTagTypes>
  ) => Record<
    string,
    | QueryEndpointDefinition<any, any, TTagTypes, any>
    | MutationEndpointDefinition<any, any, TTagTypes, any>
  >;
  keepUnusedDataFor?: number;
  refetchOnMount?: boolean | "ifOlder";
  refetchOnFocus?: boolean;
  refetchOnReconnect?: boolean;
}

// Cache entry state
export interface CacheEntry<TData = unknown, TError = unknown>
  extends AsyncState<TData, TError> {
  endpointName: string;
  tags: readonly TagDescription<string>[];
  lastFetch: number;
  expiryTime?: number;
}

// API slice state
export interface ApiState {
  queries: Record<string, CacheEntry>;
  mutations: Record<string, CacheEntry>;
  provided: Record<string, Set<string>>; // tag type -> set of cache keys
  subscriptions: Record<string, number>; // cache key -> subscription count
}

// Query/Mutation hooks return types
export interface QueryHookResult<TData = unknown, TError = unknown> {
  data: TData | undefined;
  error: TError | undefined;
  isLoading: boolean;
  isFetching: boolean;
  isSuccess: boolean;
  isError: boolean;
  isUninitialized: boolean;
  currentData: TData | undefined;
  refetch: () => void;
}

export interface MutationHookResult<
  TResult = unknown,
  TArgs = any,
  TError = unknown
> {
  data: TResult | undefined;
  error: TError | undefined;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  isUninitialized: boolean;
  reset: () => void;
  trigger: (args: TArgs) => Promise<{ data?: TResult; error?: TError }>;
}

// Generated API slice
export interface Api<
  TEndpoints extends Record<string, any>,
  TReducerPath extends string,
  TTagTypes extends string
> {
  reducerPath: TReducerPath;
  reducer: Reducer<ApiState>;
  middleware: Middleware<any>;
  endpoints: {
    [K in keyof TEndpoints]: TEndpoints[K] extends QueryEndpointDefinition<
      infer TResult,
      infer TArgs,
      TTagTypes,
      infer TError
    >
      ? {
          select: (
            args: TArgs
          ) => (state: any) => QueryHookResult<TResult, TError>;
          initiate: (args: TArgs) => any;
        }
      : TEndpoints[K] extends MutationEndpointDefinition<
          infer TResult,
          infer TArgs,
          TTagTypes,
          infer TError
        >
      ? {
          select: (state: any) => MutationHookResult<TResult, TArgs, TError>;
          initiate: (args: TArgs) => any;
        }
      : never;
  };
  util: {
    resetApiState: () => Action;
    invalidateTags: (tags: readonly TagDescription<TTagTypes>[]) => Action;
    prefetch: <K extends keyof TEndpoints>(endpointName: K, args: any) => any;
  };
}

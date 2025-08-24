import { createAsyncThunk } from "../async/thunks.js";
import type {
  BaseQuery,
  QueryEndpointDefinition,
  MutationEndpointDefinition,
  EndpointBuilder,
  QueryDefinition,
  MutationDefinition,
} from "./types.js";
import { generateCacheKey, validateEndpointDefinition } from "./utils.js";

// Create endpoint builder
export function createEndpointBuilder<
  TTagTypes extends string
>(): EndpointBuilder<TTagTypes> {
  return {
    query: (definition) => ({ type: "query", definition }),
    mutation: (definition) => ({ type: "mutation", definition }),
  };
}

// Shared execution logic for both queries and mutations
async function executeEndpointRequest<TResult, TArgs, TError>(
  endpointName: string,
  endpointDef:
    | QueryDefinition<TResult, TArgs, any, TError>
    | MutationDefinition<TResult, TArgs, any, TError>,
  args: TArgs,
  baseQuery: BaseQuery,
  api: { signal: AbortSignal; dispatch: any; getState: any },
  options: {
    cacheKey: string;
    onStart: (payload: any) => void;
    onSuccess: (payload: any) => void;
    onError: (payload: any) => void;
    onInvalidateTags?: (tags: readonly any[]) => void;
  }
) {
  const { cacheKey, onStart, onError } = options;

  // Dispatch start action
  onStart({ cacheKey, endpointName });

  try {
    // Execute the base query
    const queryArgs = endpointDef.query(args);
    const result = await baseQuery(queryArgs, api);

    if (result.error) {
      // Transform error
      let transformedError = result.error as any;
      if (endpointDef.transformErrorResponse) {
        transformedError = endpointDef.transformErrorResponse(
          result.error,
          { request: queryArgs },
          args
        );
      }

      // Dispatch error action
      onError({ cacheKey, error: transformedError });
      return { error: transformedError };
    }

    // Transform response
    let transformedData = result.data;
    if (endpointDef.transformResponse) {
      transformedData = endpointDef.transformResponse(
        result.data,
        { request: queryArgs },
        args
      );
    }

    return { data: transformedData };
  } catch (error) {
    // Transform error
    let transformedError = error;
    if (endpointDef.transformErrorResponse) {
      transformedError = endpointDef.transformErrorResponse(
        error,
        { request: endpointDef.query(args) },
        args
      );
    }

    // Dispatch error action
    onError({ cacheKey, error: transformedError });
    return { error: transformedError };
  }
}

// Create async thunk for query endpoint
export function createQueryThunk(
  endpointName: string,
  endpointDef: QueryEndpointDefinition<any, any, any, any>,
  baseQuery: BaseQuery,
  reducerPath: string,
  apiSliceActions: any
) {
  validateEndpointDefinition(endpointName, endpointDef.definition);

  return createAsyncThunk(
    `${reducerPath}/${endpointName}`,
    async (args: any, { dispatch, getState, signal, rejectWithValue }) => {
      const cacheKey = generateCacheKey(endpointName, args);

      const result = await executeEndpointRequest(
        endpointName,
        endpointDef.definition,
        args,
        baseQuery,
        { signal, dispatch, getState },
        {
          cacheKey,
          onStart: (payload) => dispatch(apiSliceActions.queryStart(payload)),
          onSuccess: (payload) =>
            dispatch(apiSliceActions.querySuccess(payload)),
          onError: (payload) => dispatch(apiSliceActions.queryError(payload)),
        }
      );

      if (result.error) {
        return rejectWithValue(result.error);
      }

      // Get provided tags
      let providedTags: readonly any[] = [];
      if (endpointDef.definition.providesTags) {
        if (typeof endpointDef.definition.providesTags === 'function') {
          providedTags = endpointDef.definition.providesTags(result.data, undefined, args);
        } else {
          providedTags = endpointDef.definition.providesTags;
        }
      }

      // Dispatch success with tags
      dispatch(
        apiSliceActions.querySuccess({
          cacheKey,
          data: result.data,
          tags: providedTags,
        })
      );

      return result.data;
    }
  );
}

// Create async thunk for mutation endpoint
export function createMutationThunk(
  endpointName: string,
  endpointDef: MutationEndpointDefinition<any, any, any, any>,
  baseQuery: BaseQuery,
  reducerPath: string,
  apiSliceActions: any
) {
  validateEndpointDefinition(endpointName, endpointDef.definition);

  return createAsyncThunk(
    `${reducerPath}/${endpointName}`,
    async (args: any, { dispatch, getState, signal, rejectWithValue }) => {
      const cacheKey = `${endpointName}:${Date.now()}`;

      const result = await executeEndpointRequest(
        endpointName,
        endpointDef.definition,
        args,
        baseQuery,
        { signal, dispatch, getState },
        {
          cacheKey,
          onStart: (payload) =>
            dispatch(apiSliceActions.mutationStart(payload)),
          onSuccess: (payload) =>
            dispatch(apiSliceActions.mutationSuccess(payload)),
          onError: (payload) =>
            dispatch(apiSliceActions.mutationError(payload)),
          onInvalidateTags: (tags) =>
            dispatch(apiSliceActions.invalidateTags({ tags })),
        }
      );

      if (result.error) {
        return rejectWithValue(result.error);
      }

      // Dispatch success
      dispatch(
        apiSliceActions.mutationSuccess({
          cacheKey,
          data: result.data,
        })
      );

      // Handle cache invalidation
      let invalidatedTags: readonly any[] = [];
      if (endpointDef.definition.invalidatesTags) {
        if (typeof endpointDef.definition.invalidatesTags === 'function') {
          invalidatedTags = endpointDef.definition.invalidatesTags(result.data, undefined, args);
        } else {
          invalidatedTags = endpointDef.definition.invalidatesTags;
        }
      }

      if (invalidatedTags.length > 0) {
        dispatch(apiSliceActions.invalidateTags({ tags: invalidatedTags }));
      }

      return result.data;
    }
  );
}

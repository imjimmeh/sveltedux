import { createAsyncThunk } from "../async.js";
import type {
  BaseQuery,
  QueryEndpointDefinition,
  MutationEndpointDefinition,
  EndpointBuilder,
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
    async (args: any, { dispatch, getState, signal }) => {
      const cacheKey = generateCacheKey(endpointName, args);

      dispatch(apiSliceActions.queryStart({ cacheKey, endpointName }));

      try {
        const result = await executeBaseQuery(
          endpointDef.definition,
          args,
          baseQuery,
          { signal, dispatch, getState }
        );

        if (result.error) {
          throw result.error;
        }

        const transformedData = transformQueryResponse(
          result.data,
          endpointDef.definition,
          args
        );

        const providedTags = getProvidedTags(
          endpointDef.definition,
          transformedData,
          undefined,
          args
        );

        dispatch(
          apiSliceActions.querySuccess({
            cacheKey,
            data: transformedData,
            tags: providedTags,
          })
        );

        return transformedData;
      } catch (error) {
        const transformedError = transformQueryError(
          error,
          endpointDef.definition,
          args
        );

        dispatch(
          apiSliceActions.queryError({ cacheKey, error: transformedError })
        );
        throw transformedError;
      }
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
    async (args: any, { dispatch, getState, signal }) => {
      const cacheKey = `${endpointName}:${Date.now()}`;

      dispatch(apiSliceActions.mutationStart({ cacheKey, endpointName }));

      try {
        const result = await executeBaseQuery(
          endpointDef.definition,
          args,
          baseQuery,
          { signal, dispatch, getState }
        );

        if (result.error) {
          throw result.error;
        }

        const transformedData = transformMutationResponse(
          result.data,
          endpointDef.definition,
          args
        );

        dispatch(
          apiSliceActions.mutationSuccess({
            cacheKey,
            data: transformedData,
          })
        );

        // Handle cache invalidation
        const invalidatedTags = getInvalidatedTags(
          endpointDef.definition,
          transformedData,
          undefined,
          args
        );

        if (invalidatedTags.length > 0) {
          dispatch(apiSliceActions.invalidateTags({ tags: invalidatedTags }));
        }

        return transformedData;
      } catch (error) {
        const transformedError = transformMutationError(
          error,
          endpointDef.definition,
          args
        );

        dispatch(
          apiSliceActions.mutationError({ cacheKey, error: transformedError })
        );
        throw transformedError;
      }
    }
  );
}

// Execute base query with proper error handling
async function executeBaseQuery(
  definition: any,
  args: any,
  baseQuery: BaseQuery,
  api: { signal: AbortSignal; dispatch: any; getState: any }
) {
  const queryArgs = definition.query(args);
  return await baseQuery(queryArgs, api);
}

// Transform query response using definition's transform function
function transformQueryResponse(
  response: any,
  definition: any,
  args: any
): any {
  if (definition.transformResponse) {
    return definition.transformResponse(
      response,
      { request: definition.query(args) },
      args
    );
  }
  return response;
}

// Transform mutation response using definition's transform function
function transformMutationResponse(
  response: any,
  definition: any,
  args: any
): any {
  if (definition.transformResponse) {
    return definition.transformResponse(
      response,
      { request: definition.query(args) },
      args
    );
  }
  return response;
}

// Transform query error using definition's transform function
function transformQueryError(error: any, definition: any, args: any): any {
  if (definition.transformErrorResponse) {
    return definition.transformErrorResponse(
      error,
      { request: definition.query(args) },
      args
    );
  }
  return error;
}

// Transform mutation error using definition's transform function
function transformMutationError(error: any, definition: any, args: any): any {
  if (definition.transformErrorResponse) {
    return definition.transformErrorResponse(
      error,
      { request: definition.query(args) },
      args
    );
  }
  return error;
}

// Get provided tags from query definition
function getProvidedTags(
  definition: any,
  result: any,
  error: any,
  args: any
): readonly any[] {
  if (definition.providesTags) {
    return definition.providesTags(result, error, args);
  }
  return [];
}

// Get invalidated tags from mutation definition
function getInvalidatedTags(
  definition: any,
  result: any,
  error: any,
  args: any
): readonly any[] {
  if (definition.invalidatesTags) {
    return definition.invalidatesTags(result, error, args);
  }
  return [];
}

import type { Store } from "../types.js";
import type { Api } from "./types.js";
import {
  createQueryHook,
  createMutationHook,
  createLazyQueryHook,
} from "./hooks/index.js";

/**
 * Higher-order function to create API hooks from an API slice
 */
export function createApiHooks<TApi extends Api<any, any, any>>(
  store: Store,
  api: TApi
) {
  const hooks: Record<string, any> = {};

  // Create hooks for each endpoint
  Object.keys(api.endpoints).forEach((endpointName) => {
    const endpoint = api.endpoints[endpointName];

    if (isQueryEndpoint(endpoint)) {
      // Create query hook
      hooks[`use${capitalizeFirst(endpointName)}Query`] = createQueryHook(
        store,
        api,
        endpointName
      );

      // Create lazy query hook
      hooks[`useLazy${capitalizeFirst(endpointName)}Query`] =
        createLazyQueryHook(store, api, endpointName);
    } else {
      // Create mutation hook
      hooks[`use${capitalizeFirst(endpointName)}Mutation`] = createMutationHook(
        store,
        api,
        endpointName
      );
    }
  });

  return hooks as GeneratedHooks<TApi>;
}

/**
 * Utility to create a reactive store subscription
 */
export function createStoreSubscription<T>(
  store: Store,
  selector: (state: any) => T,
  initialValue?: T
): { readonly value: T } {
  let currentValue = $state(initialValue ?? selector(store.getState()));

  $effect(() => {
    const unsubscribe = store.subscribe(() => {
      const newValue = selector(store.getState());
      if (newValue !== currentValue) {
        currentValue = newValue;
      }
    });

    return unsubscribe;
  });

  return {
    get value() {
      return currentValue;
    },
  };
}

// Helper functions

function isQueryEndpoint(endpoint: any): boolean {
  return endpoint.type === "query";
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Type helper for generated hooks
type GeneratedHooks<TApi extends Api<any, any, any>> = {
  [K in keyof TApi["endpoints"] as TApi["endpoints"][K] extends { select: any }
    ? `use${Capitalize<string & K>}Query`
    : `use${Capitalize<string & K>}Mutation`]: TApi["endpoints"][K] extends {
    select: any;
  }
    ? ReturnType<typeof createQueryHook<any, any, any>>
    : ReturnType<typeof createMutationHook<any, any, any>>;
} & {
  [K in keyof TApi["endpoints"] as TApi["endpoints"][K] extends { select: any }
    ? `useLazy${Capitalize<string & K>}Query`
    : never]: TApi["endpoints"][K] extends { select: any }
    ? ReturnType<typeof createLazyQueryHook<any, any, any>>
    : never;
};

// Type helper for capitalizing strings
type Capitalize<S extends string> = S extends `${infer T}${infer U}`
  ? `${Uppercase<T>}${U}`
  : S;

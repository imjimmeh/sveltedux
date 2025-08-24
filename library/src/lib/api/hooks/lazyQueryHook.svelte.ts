import type { Store } from "../../types.js";
import type { Api } from "../types.js";
import type { UseQueryOptions, QueryHookResult } from "./types.js";
import {
  createInitialQueryState,
  createQueryHookResult,
  cleanupLazyQuerySubscription,
} from "./utils.js";
import { createLazyQuerySubscription } from "./subscriptions.js";

/**
 * Lazy query hook - doesn't automatically execute
 */
export function createLazyQueryHook<TResult, TArgs, TError>(
  store: Store,
  api: Api<any, any, any>,
  endpointName: string
) {
  return function useLazyQuery(): [
    (args: TArgs, options?: UseQueryOptions) => void,
    QueryHookResult<TResult, TError>
  ] {
    let currentArgs: TArgs | null = null;
    let queryResult = $state<QueryHookResult<TResult, TError>>(
      createInitialQueryState()
    );

    let subscription: any = null;
    const selector = api.endpoints[endpointName].select;
    const initiate = api.endpoints[endpointName].initiate;

    const trigger = (args: TArgs, options: UseQueryOptions = {}) => {
      currentArgs = args;

      cleanupLazyQuerySubscription(subscription);

      subscription = createLazyQuerySubscription(
        store,
        selector as (
          args: TArgs
        ) => (state: any) => QueryHookResult<TResult, TError>,
        initiate,
        args,
        (newState) => {
          queryResult = newState as QueryHookResult<TResult, TError>;
        }
      );
    };

    // Cleanup on destroy
    $effect(() => {
      return () => cleanupLazyQuerySubscription(subscription);
    });

    return [trigger, createQueryHookResult(queryResult)];
  };
}

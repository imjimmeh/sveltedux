import type { BaseQuery, BaseQueryApi } from "./types.js";

// Fetch-based base query implementation
export function fetchBaseQuery(config: {
  baseUrl?: string;
  prepareHeaders?: (headers: Headers, api: BaseQueryApi) => Headers | void;
  fetchFn?: (input: RequestInfo, init?: RequestInit) => Promise<Response>;
  timeout?: number;
}): BaseQuery {
  const {
    baseUrl = "",
    prepareHeaders,
    fetchFn = fetch,
    timeout = 30000,
  } = config;

  return async (args, api) => {
    try {
      const requestConfig = normalizeRequestArgs(args);
      const url = resolveUrl(requestConfig.url, baseUrl);
      const headers = await prepareRequestHeaders(
        requestConfig.headers,
        prepareHeaders,
        api,
        requestConfig.method
      );

      // Serialize body for JSON requests
      let body = requestConfig.body;
      if (body && typeof body === 'object' && headers.get('content-type')?.includes('application/json')) {
        body = JSON.stringify(body);
      }

      const requestInit: RequestInit = {
        ...requestConfig,
        body,
        headers,
        signal: createTimeoutSignal(api.signal, timeout),
      };

      const response = await fetchFn(url, requestInit);

      if (!response.ok) {
        const errorData = await safeParseResponse(response);
        return {
          error: {
            status: response.status,
            statusText: response.statusText,
            data: errorData,
          },
        };
      }

      const data = await safeParseResponse(response);
      return { data };
    } catch (error) {
      return {
        error: {
          status: "FETCH_ERROR",
          error: String(error),
        },
      };
    }
  };
}

// Normalize request arguments to a consistent format
function normalizeRequestArgs(args: any): {
  url: string;
  method?: string;
  headers?: HeadersInit;
  body?: any;
  [key: string]: any;
} {
  if (typeof args === "string") {
    return { url: args, method: "GET" };
  }

  if (typeof args === "object" && args !== null) {
    const { url = "", ...rest } = args;
    return { url, method: "GET", ...rest };
  }

  throw new Error("Invalid request arguments");
}

// Resolve full URL from base URL and path
function resolveUrl(url: string, baseUrl: string): string {
  if (!url) {
    throw new Error("Request URL is required");
  }

  // If URL is already absolute, return as-is
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  // Combine base URL and path
  const base = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  const path = url.startsWith("/") ? url : `/${url}`;

  return `${base}${path}`;
}

// Prepare request headers
async function prepareRequestHeaders(
  requestHeaders: HeadersInit | undefined,
  prepareHeaders:
    | ((headers: Headers, api: BaseQueryApi) => Headers | void)
    | undefined,
  api: BaseQueryApi,
  method: string = "GET"
): Promise<Headers> {
  const headers = new Headers(requestHeaders);

  // Set default content type for POST/PUT/PATCH if not already set
  if (["POST", "PUT", "PATCH"].includes(method.toUpperCase())) {
    if (!headers.has("content-type")) {
      headers.set("content-type", "application/json");
    }
  }

  // Apply custom header preparation
  if (prepareHeaders) {
    const result = prepareHeaders(headers, api);
    if (result instanceof Headers) {
      return result;
    }
  }

  return headers;
}

// Create a timeout signal that combines with abort signal
function createTimeoutSignal(
  abortSignal: AbortSignal,
  timeout: number
): AbortSignal {
  if (timeout <= 0) {
    return abortSignal;
  }

  const controller = new AbortController();

  // Forward abort from the original signal
  if (abortSignal.aborted) {
    controller.abort();
  } else {
    abortSignal.addEventListener("abort", () => {
      controller.abort();
    });
  }

  // Set up timeout
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeout);

  // Clean up timeout if request completes
  controller.signal.addEventListener("abort", () => {
    clearTimeout(timeoutId);
  });

  return controller.signal;
}

// Safely parse response, handling both JSON and text
async function safeParseResponse(response: Response): Promise<any> {
  const contentType = response.headers.get("content-type");

  if (contentType?.includes("application/json")) {
    try {
      return await response.json();
    } catch {
      // If JSON parsing fails, fall back to text
      return await response.text();
    }
  }

  // For non-JSON responses, return as text
  return await response.text();
}

import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchBaseQuery } from "./baseQuery.js";

// Mock fetch for testing
global.fetch = vi.fn();

describe("fetchBaseQuery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockApi = {
    signal: new AbortController().signal,
    dispatch: vi.fn(),
    getState: vi.fn(),
  };

  describe("successful requests", () => {
    it("should handle string URL arguments", async () => {
      const baseQuery = fetchBaseQuery({ baseUrl: "https://api.example.com" });

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
        headers: new Headers({ "content-type": "application/json" }),
      });

      const result = await baseQuery("/test", mockApi);

      expect(global.fetch).toHaveBeenCalledWith(
        "https://api.example.com/test",
        expect.objectContaining({
          method: "GET",
          headers: expect.any(Headers),
        })
      );

      expect(result).toEqual({ data: { success: true } });
    });

    it("should handle object URL arguments", async () => {
      const baseQuery = fetchBaseQuery({ baseUrl: "https://api.example.com" });

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
        headers: new Headers({ "content-type": "application/json" }),
      });

      const result = await baseQuery(
        {
          url: "/posts",
          method: "POST",
          body: { title: "Test Post" },
        },
        mockApi
      );

      expect(global.fetch).toHaveBeenCalledWith(
        "https://api.example.com/posts",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ title: "Test Post" }),
          signal: expect.any(AbortSignal),
          headers: expect.any(Headers),
        })
      );

      expect(result).toEqual({ data: { success: true } });
    });

    it("should handle absolute URLs", async () => {
      const baseQuery = fetchBaseQuery({ baseUrl: "https://api.example.com" });

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
        headers: new Headers({ "content-type": "application/json" }),
      });

      const result = await baseQuery("https://other-api.com/data", mockApi);

      expect(global.fetch).toHaveBeenCalledWith(
        "https://other-api.com/data",
        expect.any(Object)
      );

      expect(result).toEqual({ data: { success: true } });
    });
  });

  describe("URL resolution", () => {
    it("should handle base URL with trailing slash", async () => {
      const baseQuery = fetchBaseQuery({ baseUrl: "https://api.example.com/" });

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
        headers: new Headers({ "content-type": "application/json" }),
      });

      await baseQuery("/test", mockApi);

      expect(global.fetch).toHaveBeenCalledWith(
        "https://api.example.com/test",
        expect.any(Object)
      );
    });

    it("should handle path without leading slash", async () => {
      const baseQuery = fetchBaseQuery({ baseUrl: "https://api.example.com" });

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
        headers: new Headers({ "content-type": "application/json" }),
      });

      await baseQuery("test", mockApi);

      expect(global.fetch).toHaveBeenCalledWith(
        "https://api.example.com/test",
        expect.any(Object)
      );
    });
  });

  describe("headers handling", () => {
    it("should apply custom header preparation", async () => {
      const prepareHeaders = vi.fn((headers) => {
        headers.set("Authorization", "Bearer token123");
        headers.set("Custom-Header", "value");
        return headers;
      });

      const baseQuery = fetchBaseQuery({
        baseUrl: "https://api.example.com",
        prepareHeaders,
      });

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
        headers: new Headers({ "content-type": "application/json" }),
      });

      await baseQuery("/test", mockApi);

      expect(prepareHeaders).toHaveBeenCalledWith(expect.any(Headers), mockApi);

      const [, requestInit] = (global.fetch as any).mock.calls[0];
      const headers = requestInit.headers as Headers;
      expect(headers.get("Authorization")).toBe("Bearer token123");
      expect(headers.get("Custom-Header")).toBe("value");
    });

    it("should set default content type for POST requests", async () => {
      const baseQuery = fetchBaseQuery({ baseUrl: "https://api.example.com" });

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
        headers: new Headers({ "content-type": "application/json" }),
      });

      await baseQuery(
        {
          url: "/posts",
          method: "POST",
          body: { title: "Test" },
        },
        mockApi
      );

      const [, requestInit] = (global.fetch as any).mock.calls[0];
      const headers = requestInit.headers as Headers;
      expect(headers.get("content-type")).toBe("application/json");
    });
  });

  describe("error handling", () => {
    it("should handle HTTP errors", async () => {
      const baseQuery = fetchBaseQuery({ baseUrl: "https://api.example.com" });

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: "Not Found",
        text: async () => "Resource not found",
        headers: new Headers(),
      });

      const result = await baseQuery("/test", mockApi);

      expect(result).toEqual({
        error: {
          status: 404,
          statusText: "Not Found",
          data: "Resource not found",
        },
      });
    });

    it("should handle network errors", async () => {
      const baseQuery = fetchBaseQuery({ baseUrl: "https://api.example.com" });

      (global.fetch as any).mockRejectedValueOnce(new Error("Network error"));

      const result = await baseQuery("/test", mockApi);

      expect(result).toEqual({
        error: {
          status: "FETCH_ERROR",
          error: "Error: Network error",
        },
      });
    });

    it("should handle timeout", async () => {
      const baseQuery = fetchBaseQuery({
        baseUrl: "https://api.example.com",
        timeout: 100,
      });

      // Mock a slow response
      (global.fetch as any).mockImplementationOnce(
        () => new Promise((resolve) => setTimeout(resolve, 200))
      );

      const result = await baseQuery("/test", mockApi);

      expect((result as any).error).toBeDefined();
      expect((result as any).error.status).toBe("FETCH_ERROR");
    });
  });

  describe("response parsing", () => {
    it("should parse JSON responses", async () => {
      const baseQuery = fetchBaseQuery({ baseUrl: "https://api.example.com" });

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: "json response" }),
        headers: new Headers({ "content-type": "application/json" }),
      });

      const result = await baseQuery("/test", mockApi);

      expect(result).toEqual({ data: { data: "json response" } });
    });

    it("should handle text responses", async () => {
      const baseQuery = fetchBaseQuery({ baseUrl: "https://api.example.com" });

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error("Not JSON");
        },
        text: async () => "plain text response",
        headers: new Headers({ "content-type": "text/plain" }),
      });

      const result = await baseQuery("/test", mockApi);

      expect(result).toEqual({ data: "plain text response" });
    });

    it("should handle non-JSON content type as text", async () => {
      const baseQuery = fetchBaseQuery({ baseUrl: "https://api.example.com" });

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        text: async () => "text response",
        headers: new Headers({ "content-type": "text/html" }),
      });

      const result = await baseQuery("/test", mockApi);

      expect(result).toEqual({ data: "text response" });
    });
  });

  describe("timeout handling", () => {
    it("should not apply timeout when timeout is 0", async () => {
      const baseQuery = fetchBaseQuery({
        baseUrl: "https://api.example.com",
        timeout: 0,
      });

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
        headers: new Headers({ "content-type": "application/json" }),
      });

      await baseQuery("/test", mockApi);

      const [, requestInit] = (global.fetch as any).mock.calls[0];
      expect(requestInit.signal).toBe(mockApi.signal);
    });
  });

  describe("custom fetch function", () => {
    it("should use custom fetch function", async () => {
      const customFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ custom: true }),
        headers: new Headers({ "content-type": "application/json" }),
      });

      const baseQuery = fetchBaseQuery({
        baseUrl: "https://api.example.com",
        fetchFn: customFetch,
      });

      const result = await baseQuery("/test", mockApi);

      expect(customFetch).toHaveBeenCalled();
      expect(result).toEqual({ data: { custom: true } });
    });
  });

  describe("invalid arguments", () => {
    it("should throw error for empty URL", async () => {
      const baseQuery = fetchBaseQuery({ baseUrl: "https://api.example.com" });

      const result = await baseQuery("", mockApi);

      expect((result as any).error).toBeDefined();
      expect((result as any).error.status).toBe("FETCH_ERROR");
    });

    it("should throw error for invalid arguments", async () => {
      const baseQuery = fetchBaseQuery({ baseUrl: "https://api.example.com" });

      const result = await baseQuery(123 as any, mockApi);

      expect((result as any).error).toBeDefined();
      expect((result as any).error.status).toBe("FETCH_ERROR");
    });
  });
});

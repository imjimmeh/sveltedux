import { describe, it, expect } from "vitest";
import {
  normalizeTags,
  generateCacheKey,
  parseCacheKey,
  isCacheEntryExpired,
  createTagKey,
  validateEndpointDefinition,
} from "./utils.js";

describe("API Utils", () => {
  describe("normalizeTags", () => {
    it("should normalize string tags to objects", () => {
      const tags = ["Post", "User"];
      const result = normalizeTags(tags);

      expect(result).toEqual([{ type: "Post" }, { type: "User" }]);
    });

    it("should pass through object tags unchanged", () => {
      const tags = [{ type: "Post", id: 1 }, { type: "User" }];
      const result = normalizeTags(tags);

      expect(result).toEqual([{ type: "Post", id: 1 }, { type: "User" }]);
    });

    it("should handle mixed string and object tags", () => {
      const tags = ["Post", { type: "User", id: 1 }];
      const result = normalizeTags(tags);

      expect(result).toEqual([{ type: "Post" }, { type: "User", id: 1 }]);
    });

    it("should handle empty arrays", () => {
      const result = normalizeTags([]);
      expect(result).toEqual([]);
    });

    it("should handle undefined", () => {
      const result = normalizeTags();
      expect(result).toEqual([]);
    });
  });

  describe("generateCacheKey", () => {
    it("should generate cache key for simple args", () => {
      const result = generateCacheKey("getPosts", undefined);
      expect(result).toBe("getPosts(undefined)");
    });

    it("should generate cache key for object args", () => {
      const result = generateCacheKey("getPost", { id: 1 });
      expect(result).toBe('getPost({"id":1})');
    });

    it("should generate cache key for complex args", () => {
      const args = { id: 1, filters: { status: "active" } };
      const result = generateCacheKey("searchPosts", args);
      expect(result).toBe(
        'searchPosts({"id":1,"filters":{"status":"active"}})'
      );
    });

    it("should handle null args", () => {
      const result = generateCacheKey("getData", null);
      expect(result).toBe("getData(null)");
    });
  });

  describe("parseCacheKey", () => {
    it("should parse simple cache key", () => {
      const result = parseCacheKey("getPosts(undefined)");
      expect(result).toEqual({
        endpointName: "getPosts",
        args: {},
      });
    });

    it("should parse cache key with object args", () => {
      const result = parseCacheKey('getPost({"id":1})');
      expect(result).toEqual({
        endpointName: "getPost",
        args: { id: 1 },
      });
    });

    it("should parse cache key with complex args", () => {
      const cacheKey = 'searchPosts({"id":1,"filters":{"status":"active"}})';
      const result = parseCacheKey(cacheKey);
      expect(result).toEqual({
        endpointName: "searchPosts",
        args: { id: 1, filters: { status: "active" } },
      });
    });

    it("should handle empty args", () => {
      const result = parseCacheKey("getData()");
      expect(result).toEqual({
        endpointName: "getData",
        args: {},
      });
    });

    it("should throw error for invalid cache key format", () => {
      expect(() => parseCacheKey("invalid-cache-key")).toThrow(
        "Invalid cache key format"
      );
    });

    it("should handle malformed JSON in args", () => {
      const result = parseCacheKey("getData({invalid-json})");
      expect(result).toEqual({
        endpointName: "getData",
        args: {},
      });
    });
  });

  describe("isCacheEntryExpired", () => {
    const now = Date.now();
    const oneMinute = 60000;

    it("should return true for expired entry", () => {
      const entry = {
        lastFetch: now - oneMinute - 1000, // 1 second past expiry
        expiryTime: now - 1000,
      };

      const result = isCacheEntryExpired(entry, oneMinute);
      expect(result).toBe(true);
    });

    it("should return false for non-expired entry", () => {
      const entry = {
        lastFetch: now - 30000, // 30 seconds ago
        expiryTime: now + 30000, // expires in 30 seconds
      };

      const result = isCacheEntryExpired(entry, oneMinute);
      expect(result).toBe(false);
    });

    it("should use keepUnusedDataFor when expiryTime not set", () => {
      const entry = {
        lastFetch: now - oneMinute - 1000, // 1 second past expiry
      };

      const result = isCacheEntryExpired(entry, oneMinute);
      expect(result).toBe(true);
    });

    it("should return true for entry with no lastFetch", () => {
      const entry = { lastFetch: 0 };
      const result = isCacheEntryExpired(entry, oneMinute);
      expect(result).toBe(true);
    });
  });

  describe("createTagKey", () => {
    it("should create tag key without id", () => {
      const tag = { type: "Post" };
      const result = createTagKey(tag);
      expect(result).toBe("Post");
    });

    it("should create tag key with id", () => {
      const tag = { type: "Post", id: 1 };
      const result = createTagKey(tag);
      expect(result).toBe("Post:1");
    });

    it("should handle string id", () => {
      const tag = { type: "User", id: "abc123" };
      const result = createTagKey(tag);
      expect(result).toBe("User:abc123");
    });
  });

  describe("validateEndpointDefinition", () => {
    it("should validate valid endpoint definition", () => {
      const definition = {
        query: () => "/posts",
        transformResponse: (data: any) => data,
        transformErrorResponse: (error: any) => error,
      };

      expect(() =>
        validateEndpointDefinition("getPosts", definition)
      ).not.toThrow();
    });

    it("should throw error for missing query function", () => {
      const definition = {};

      expect(() => validateEndpointDefinition("getPosts", definition)).toThrow(
        'Endpoint "getPosts" must have a query function'
      );
    });

    it("should throw error for non-function query", () => {
      const definition = { query: "/posts" };

      expect(() => validateEndpointDefinition("getPosts", definition)).toThrow(
        'Endpoint "getPosts" must have a query function'
      );
    });

    it("should throw error for invalid transformResponse", () => {
      const definition = {
        query: () => "/posts",
        transformResponse: "not-a-function",
      };

      expect(() => validateEndpointDefinition("getPosts", definition)).toThrow(
        'Endpoint "getPosts" transformResponse must be a function'
      );
    });

    it("should throw error for invalid transformErrorResponse", () => {
      const definition = {
        query: () => "/posts",
        transformErrorResponse: "not-a-function",
      };

      expect(() => validateEndpointDefinition("getPosts", definition)).toThrow(
        'Endpoint "getPosts" transformErrorResponse must be a function'
      );
    });

    it("should allow undefined transform functions", () => {
      const definition = {
        query: () => "/posts",
        transformResponse: undefined,
        transformErrorResponse: undefined,
      };

      expect(() =>
        validateEndpointDefinition("getPosts", definition)
      ).not.toThrow();
    });
  });
});

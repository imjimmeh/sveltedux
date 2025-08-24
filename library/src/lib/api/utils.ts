import type { Tag, TagDescription } from "./types.js";

// Helper to normalize tags
export function normalizeTags(
  tags: readonly TagDescription<string>[] = []
): readonly Tag<string>[] {
  return tags.map(tag => 
    typeof tag === 'string' ? { type: tag } : tag
  );
}

// Helper to generate cache key
export function generateCacheKey(endpointName: string, args: any): string {
  return `${endpointName}(${JSON.stringify(args)})`;
}

// Helper to parse cache key back to arguments
export function parseCacheKey(cacheKey: string): { endpointName: string; args: any } {
  const match = cacheKey.match(/^([^(]+)\((.*)\)$/);
  if (!match) {
    throw new Error(`Invalid cache key format: ${cacheKey}`);
  }
  
  const [, endpointName, argsJson] = match;
  let args;
  try {
    args = JSON.parse(argsJson || '{}');
  } catch {
    args = {};
  }
  
  return { endpointName, args };
}

// Helper to check if a cache entry is expired
export function isCacheEntryExpired(
  entry: { lastFetch: number; expiryTime?: number },
  keepUnusedDataFor: number
): boolean {
  if (!entry.lastFetch) return true;
  
  const expiryTime = entry.expiryTime || (entry.lastFetch + keepUnusedDataFor);
  return Date.now() > expiryTime;
}

// Helper to create tag key for provided tags mapping
export function createTagKey(tag: Tag<string>): string {
  return tag.id ? `${tag.type}:${tag.id}` : tag.type;
}

// Helper to validate endpoint definition
export function validateEndpointDefinition(
  name: string, 
  definition: any
): void {
  if (!definition.query || typeof definition.query !== 'function') {
    throw new Error(`Endpoint "${name}" must have a query function`);
  }
  
  if (definition.transformResponse && typeof definition.transformResponse !== 'function') {
    throw new Error(`Endpoint "${name}" transformResponse must be a function`);
  }
  
  if (definition.transformErrorResponse && typeof definition.transformErrorResponse !== 'function') {
    throw new Error(`Endpoint "${name}" transformErrorResponse must be a function`);
  }
}
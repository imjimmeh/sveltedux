import { vi } from "vitest";
import type { StorageLike } from "../persistence/types.js";

export function createMemoryStorage(spy?: {
  get?: boolean;
  set?: boolean;
  remove?: boolean;
}): StorageLike & {
  __getSpy: ReturnType<typeof vi.fn>;
  __setSpy: ReturnType<typeof vi.fn>;
  __removeSpy: ReturnType<typeof vi.fn>;
  __dump(): Record<string, string>;
} {
  const m = new Map<string, string>();
  const api: any = {
    __getSpy: vi.fn(),
    __setSpy: vi.fn(),
    __removeSpy: vi.fn(),
    getItem: (k: string) => {
      spy?.get && api.__getSpy(k);
      return m.has(k) ? m.get(k)! : null;
    },
    setItem: (k: string, v: string) => {
      spy?.set && api.__setSpy(k, v);
      m.set(k, v);
    },
    removeItem: (k: string) => {
      spy?.remove && api.__removeSpy(k);
      m.delete(k);
    },
    __dump: () => Object.fromEntries(m.entries()),
  };
  return api;
}

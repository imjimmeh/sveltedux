export const PERSIST_REHYDRATE = "@@PERSIST/REHYDRATE";
export const PERSIST_FLUSH = "@@PERSIST/FLUSH";
export const PERSIST_PURGE = "@@PERSIST/PURGE";
export const PERSIST_PAUSE = "@@PERSIST/PAUSE";
export const PERSIST_RESUME = "@@PERSIST/RESUME";

export type StorageKind = "local" | "session";

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface PersistedRecord<T = any> {
  version: number;
  state: T;
}

export interface PersistOptions<TState = any> {
  key?: string;
  storage?: StorageLike;
  storageKind?: StorageKind;
  serialize?: (data: any) => string;
  deserialize?: (raw: string) => any;
  partialize?: (state: TState) => any;
  whitelist?: string[];
  blacklist?: string[];
  throttle?: number;
  version?: number;
  migrate?: (persistedState: any, fromVersion: number) => any;
  rehydrateStrategy?: "replace" | "merge";
}

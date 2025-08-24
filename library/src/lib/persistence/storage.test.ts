import { describe, it, expect } from "vitest";
import { createWebStorage } from "./storage.js";

describe("createWebStorage fallback", () => {
  it("returns an object implementing StorageLike and works in memory", () => {
    const s = createWebStorage("local");
    const key = "k";
    expect(s.getItem(key)).toBeNull();
    s.setItem(key, "v");
    expect(s.getItem(key)).toBe("v");
    s.removeItem(key);
    expect(s.getItem(key)).toBeNull();
  });
});

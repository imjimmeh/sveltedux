import { describe, it, expect } from "vitest";
import { createEntityAdapter } from "./entityAdapter.js";
import type { PayloadAction } from "./types.js";

interface User {
  id: number;
  name: string;
  email: string;
}

interface Book {
  isbn: string;
  title: string;
  author: string;
}

describe("createEntityAdapter", () => {
  describe("with default configuration", () => {
    const adapter = createEntityAdapter<User>();
    const initialState = adapter.getInitialState();

    it("should return initial state", () => {
      expect(initialState).toEqual({
        ids: [],
        entities: {},
      });
    });

    it("should select collection", () => {
      const state = {
        ids: [1, 2],
        entities: { 1: { id: 1, name: "John", email: "john@example.com" } },
      };
      expect(adapter.selectCollection(state)).toBe(state);
    });

    it("should select ids", () => {
      const state = {
        ids: [1, 2],
        entities: { 1: { id: 1, name: "John", email: "john@example.com" } },
      };
      expect(adapter.selectIds(state)).toEqual([1, 2]);
    });

    it("should select entities", () => {
      const state = {
        ids: [1, 2],
        entities: { 1: { id: 1, name: "John", email: "john@example.com" } },
      };
      expect(adapter.selectEntities(state)).toEqual({
        1: { id: 1, name: "John", email: "john@example.com" },
      });
    });

    it("should select all entities", () => {
      const state = {
        ids: [1, 2],
        entities: {
          1: { id: 1, name: "John", email: "john@example.com" },
          2: { id: 2, name: "Jane", email: "jane@example.com" },
        },
      };
      expect(adapter.selectAll(state)).toEqual([
        { id: 1, name: "John", email: "john@example.com" },
        { id: 2, name: "Jane", email: "jane@example.com" },
      ]);
    });

    it("should select total count", () => {
      const state = {
        ids: [1, 2],
        entities: { 1: { id: 1, name: "John", email: "john@example.com" } },
      };
      expect(adapter.selectTotal(state)).toBe(2);
    });

    it("should select entity by id", () => {
      const state = {
        ids: [1, 2],
        entities: {
          1: { id: 1, name: "John", email: "john@example.com" },
          2: { id: 2, name: "Jane", email: "jane@example.com" },
        },
      };
      expect(adapter.selectById(state, 1)).toEqual({
        id: 1,
        name: "John",
        email: "john@example.com",
      });
      expect(adapter.selectById(state, 3)).toBeUndefined();
    });

    it("should add one entity", () => {
      const user: User = { id: 1, name: "John", email: "john@example.com" };
      const action: PayloadAction<User> = { type: "ADD_USER", payload: user };
      const result = adapter.addOne(initialState, action);

      expect(result).toEqual({
        ids: [1],
        entities: { 1: user },
      });
    });

    it("should add many entities", () => {
      const users: User[] = [
        { id: 1, name: "John", email: "john@example.com" },
        { id: 2, name: "Jane", email: "jane@example.com" },
      ];
      const action: PayloadAction<User[]> = {
        type: "ADD_USERS",
        payload: users,
      };
      const result = adapter.addMany(initialState, action);

      expect(result).toEqual({
        ids: [1, 2],
        entities: {
          1: users[0],
          2: users[1],
        },
      });
    });

    it("should set one entity", () => {
      const user: User = { id: 1, name: "John", email: "john@example.com" };
      const action: PayloadAction<User> = { type: "SET_USER", payload: user };
      const result = adapter.setOne(initialState, action);

      expect(result).toEqual({
        ids: [1],
        entities: { 1: user },
      });
    });

    it("should set many entities", () => {
      const users: User[] = [
        { id: 1, name: "John", email: "john@example.com" },
        { id: 2, name: "Jane", email: "jane@example.com" },
      ];
      const action: PayloadAction<User[]> = {
        type: "SET_USERS",
        payload: users,
      };
      const result = adapter.setMany(initialState, action);

      expect(result).toEqual({
        ids: [1, 2],
        entities: {
          1: users[0],
          2: users[1],
        },
      });
    });

    it("should remove one entity", () => {
      const state = {
        ids: [1, 2],
        entities: {
          1: { id: 1, name: "John", email: "john@example.com" },
          2: { id: 2, name: "Jane", email: "jane@example.com" },
        },
      };
      const action: PayloadAction<number> = { type: "REMOVE_USER", payload: 1 };
      const result = adapter.removeOne(state, action);

      expect(result).toEqual({
        ids: [2],
        entities: {
          2: { id: 2, name: "Jane", email: "jane@example.com" },
        },
      });
    });

    it("should remove many entities", () => {
      const state = {
        ids: [1, 2, 3],
        entities: {
          1: { id: 1, name: "John", email: "john@example.com" },
          2: { id: 2, name: "Jane", email: "jane@example.com" },
          3: { id: 3, name: "Bob", email: "bob@example.com" },
        },
      };
      const action: PayloadAction<number[]> = {
        type: "REMOVE_USERS",
        payload: [1, 3],
      };
      const result = adapter.removeMany(state, action);

      expect(result).toEqual({
        ids: [2],
        entities: {
          2: { id: 2, name: "Jane", email: "jane@example.com" },
        },
      });
    });

    it("should update one entity", () => {
      const state = {
        ids: [1, 2],
        entities: {
          1: { id: 1, name: "John", email: "john@example.com" },
          2: { id: 2, name: "Jane", email: "jane@example.com" },
        },
      };
      const action: PayloadAction<{ id: number; changes: Partial<User> }> = {
        type: "UPDATE_USER",
        payload: { id: 1, changes: { name: "Johnny" } },
      };
      const result = adapter.updateOne(state, action);

      expect(result).toEqual({
        ids: [1, 2],
        entities: {
          1: { id: 1, name: "Johnny", email: "john@example.com" },
          2: { id: 2, name: "Jane", email: "jane@example.com" },
        },
      });
    });

    it("should update many entities", () => {
      const state = {
        ids: [1, 2],
        entities: {
          1: { id: 1, name: "John", email: "john@example.com" },
          2: { id: 2, name: "Jane", email: "jane@example.com" },
        },
      };
      const action: PayloadAction<{ id: number; changes: Partial<User> }[]> = {
        type: "UPDATE_USERS",
        payload: [
          { id: 1, changes: { name: "Johnny" } },
          { id: 2, changes: { email: "jane.updated@example.com" } },
        ],
      };
      const result = adapter.updateMany(state, action);

      expect(result).toEqual({
        ids: [1, 2],
        entities: {
          1: { id: 1, name: "Johnny", email: "john@example.com" },
          2: { id: 2, name: "Jane", email: "jane.updated@example.com" },
        },
      });
    });

    it("should upsert one entity", () => {
      const user: User = { id: 1, name: "John", email: "john@example.com" };
      const action: PayloadAction<User> = {
        type: "UPSERT_USER",
        payload: user,
      };
      const result = adapter.upsertOne(initialState, action);

      expect(result).toEqual({
        ids: [1],
        entities: { 1: user },
      });
    });

    it("should upsert many entities", () => {
      const users: User[] = [
        { id: 1, name: "John", email: "john@example.com" },
        { id: 2, name: "Jane", email: "jane@example.com" },
      ];
      const action: PayloadAction<User[]> = {
        type: "UPSERT_USERS",
        payload: users,
      };
      const result = adapter.upsertMany(initialState, action);

      expect(result).toEqual({
        ids: [1, 2],
        entities: {
          1: users[0],
          2: users[1],
        },
      });
    });

    it("should remove all entities", () => {
      const state = {
        ids: [1, 2],
        entities: {
          1: { id: 1, name: "John", email: "john@example.com" },
          2: { id: 2, name: "Jane", email: "jane@example.com" },
        },
      };
      const result = adapter.removeAll(state);

      expect(result).toEqual({
        ids: [],
        entities: {},
      });
    });
  });

  describe("with custom selectId", () => {
    const adapter = createEntityAdapter<Book, string>({
      selectId: (book) => book.isbn,
    });
    const initialState = adapter.getInitialState();

    it("should use custom selectId function", () => {
      const book: Book = {
        isbn: "978-0123456789",
        title: "Test Book",
        author: "Test Author",
      };
      const action: PayloadAction<Book> = { type: "ADD_BOOK", payload: book };
      const result = adapter.addOne(initialState, action);

      expect(result).toEqual({
        ids: ["978-0123456789"],
        entities: { "978-0123456789": book },
      });
    });
  });

  describe("with sort comparer", () => {
    const adapter = createEntityAdapter<User>({
      sortComparer: (a, b) => a.name.localeCompare(b.name),
    });
    const initialState = adapter.getInitialState();

    it("should maintain sorted order", () => {
      const users: User[] = [
        { id: 1, name: "John", email: "john@example.com" },
        { id: 2, name: "Alice", email: "alice@example.com" },
        { id: 3, name: "Bob", email: "bob@example.com" },
      ];
      const action: PayloadAction<User[]> = {
        type: "ADD_USERS",
        payload: users,
      };
      const result = adapter.addMany(initialState, action);

      expect(result.ids).toEqual([2, 3, 1]); // Alice, Bob, John (alphabetical order)
    });
  });
});

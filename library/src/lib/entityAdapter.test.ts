import { describe, it, expect } from "vitest";
import { createEntityAdapter } from "./entityAdapter.js";
import { createSlice } from "./reducers.js";
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

  describe("Immer integration with createSlice", () => {
    interface UserState {
      users: ReturnType<typeof usersAdapter.getInitialState>;
      loading: boolean;
    }

    const usersAdapter = createEntityAdapter<User>();
    
    const initialState: UserState = {
      users: usersAdapter.getInitialState(),
      loading: false,
    };

    const usersSlice = createSlice({
      name: "users",
      initialState,
      reducers: {
        // Test setMany in slice reducer (this was the bug!)
        setUsers: (state, action: PayloadAction<User[]>) => {
          usersAdapter.setMany(state.users, action);
        },
        // Test addOne in slice reducer
        addUser: (state, action: PayloadAction<User>) => {
          usersAdapter.addOne(state.users, action);
        },
        // Test updateOne in slice reducer
        updateUser: (state, action: PayloadAction<{ id: number; changes: Partial<User> }>) => {
          usersAdapter.updateOne(state.users, action);
        },
        // Test removeOne in slice reducer
        removeUser: (state, action: PayloadAction<number>) => {
          usersAdapter.removeOne(state.users, action);
        },
      },
    });

    it("should work with setMany in slice reducer (main bug fix)", () => {
      const users: User[] = [
        { id: 1, name: "John", email: "john@example.com" },
        { id: 2, name: "Jane", email: "jane@example.com" },
      ];

      const state = usersSlice.reducer(initialState, usersSlice.actions.setUsers(users));

      expect(state.users.ids).toEqual([1, 2]);
      expect(state.users.entities).toEqual({
        1: users[0],
        2: users[1],
      });
    });

    it("should work with addOne in slice reducer", () => {
      const user: User = { id: 1, name: "John", email: "john@example.com" };
      
      const state = usersSlice.reducer(initialState, usersSlice.actions.addUser(user));

      expect(state.users.ids).toEqual([1]);
      expect(state.users.entities).toEqual({ 1: user });
    });

    it("should work with updateOne in slice reducer", () => {
      // First add a user
      const user: User = { id: 1, name: "John", email: "john@example.com" };
      let state = usersSlice.reducer(initialState, usersSlice.actions.addUser(user));

      // Then update the user
      state = usersSlice.reducer(
        state, 
        usersSlice.actions.updateUser({ id: 1, changes: { name: "Johnny" } })
      );

      expect(state.users.entities[1]?.name).toBe("Johnny");
    });

    it("should work with removeOne in slice reducer", () => {
      // First add users
      const users: User[] = [
        { id: 1, name: "John", email: "john@example.com" },
        { id: 2, name: "Jane", email: "jane@example.com" },
      ];
      let state = usersSlice.reducer(initialState, usersSlice.actions.setUsers(users));

      // Then remove one
      state = usersSlice.reducer(state, usersSlice.actions.removeUser(1));

      expect(state.users.ids).toEqual([2]);
      expect(state.users.entities).toEqual({
        2: users[1],
      });
    });

    it("should maintain other slice state when using entity adapter methods", () => {
      const users: User[] = [
        { id: 1, name: "John", email: "john@example.com" },
      ];

      const state = usersSlice.reducer(initialState, usersSlice.actions.setUsers(users));

      // Entity adapter operations should not affect other slice properties
      expect(state.loading).toBe(false);
    });
  });
});

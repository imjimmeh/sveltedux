import type { PayloadAction } from "./types.js";
import { createSelector } from "./selectors.js";
import { produce } from "./utils.js";

// Entity state interface
export interface EntityState<T, Id extends string | number = string | number> {
  ids: Id[];
  entities: Record<Id, T>;
}

// Entity adapter configuration
export interface EntityAdapterOptions<
  T,
  Id extends string | number = string | number
> {
  selectId?: (model: T) => Id;
  sortComparer?: (a: T, b: T) => number;
}

// Entity adapter methods
export interface EntityAdapter<
  T,
  Id extends string | number = string | number
> {
  selectCollection: (state: any) => EntityState<T, Id>;
  selectIds: (state: any) => Id[];
  selectEntities: (state: any) => Record<Id, T>;
  selectAll: (state: any) => T[];
  selectTotal: (state: any) => number;
  selectById: (state: any, id: Id) => T | undefined;

  addOne: (
    state: EntityState<T, Id>,
    action: PayloadAction<T>
  ) => EntityState<T, Id>;
  addMany: (
    state: EntityState<T, Id>,
    action: PayloadAction<T[]>
  ) => EntityState<T, Id>;
  setOne: (
    state: EntityState<T, Id>,
    action: PayloadAction<T>
  ) => EntityState<T, Id>;
  setMany: (
    state: EntityState<T, Id>,
    action: PayloadAction<T[]>
  ) => EntityState<T, Id>;
  removeOne: (
    state: EntityState<T, Id>,
    action: PayloadAction<Id>
  ) => EntityState<T, Id>;
  removeMany: (
    state: EntityState<T, Id>,
    action: PayloadAction<Id[]>
  ) => EntityState<T, Id>;
  updateOne: (
    state: EntityState<T, Id>,
    action: PayloadAction<{ id: Id; changes: Partial<T> }>
  ) => EntityState<T, Id>;
  updateMany: (
    state: EntityState<T, Id>,
    action: PayloadAction<{ id: Id; changes: Partial<T> }[]>
  ) => EntityState<T, Id>;
  upsertOne: (
    state: EntityState<T, Id>,
    action: PayloadAction<T>
  ) => EntityState<T, Id>;
  upsertMany: (
    state: EntityState<T, Id>,
    action: PayloadAction<T[]>
  ) => EntityState<T, Id>;
  removeAll: (
    state: EntityState<T, Id>,
    action?: PayloadAction<void>
  ) => EntityState<T, Id>;

  getInitialState: () => EntityState<T, Id>;
}

// Default selectId function
const defaultSelectId = <T, Id extends string | number = string | number>(
  model: T
): Id => {
  if (typeof model === "object" && model !== null && "id" in model) {
    return (model as any).id;
  }
  throw new Error(
    "Entity must have an 'id' property or provide a custom selectId function"
  );
};

// Default sort comparer
const defaultSortComparer = <T>(a: T, b: T): number => {
  return 0; // No sorting by default
};

// Create entity adapter function
export function createEntityAdapter<
  T,
  Id extends string | number = string | number
>(options: EntityAdapterOptions<T, Id> = {}): EntityAdapter<T, Id> {
  const { selectId = defaultSelectId, sortComparer = defaultSortComparer } =
    options;

  // Selectors
  const selectCollection = (state: any): EntityState<T, Id> => state;
  const selectIds = createSelector(
    selectCollection,
    (collection: EntityState<T, Id>) => collection.ids
  );

  const selectEntities = createSelector(
    selectCollection,
    (collection: EntityState<T, Id>) => collection.entities
  );

  const selectAll = createSelector(
    selectCollection,
    (collection: EntityState<T, Id>) => {
      return collection.ids.map((id) => collection.entities[id]);
    }
  );

  const selectTotal = createSelector(selectIds, (ids: Id[]) => ids.length);

  const selectById = (state: any, id: Id): T | undefined => {
    const collection = selectCollection(state);
    return collection.entities[id];
  };

  // Helper functions for maintaining sorted order
  const sortIds = (ids: Id[], entities: Record<Id, T>): Id[] => {
    return [...ids].sort((a, b) => sortComparer(entities[a], entities[b]));
  };

  const addOne = (
    state: EntityState<T, Id>,
    action: PayloadAction<T>
  ): EntityState<T, Id> => {
    return produce(state, (draft: EntityState<T, Id>) => {
      const entity = action.payload;
      const id = selectId(entity);

      if (!(id in draft.entities)) {
        draft.ids.push(id);
        if (sortComparer !== defaultSortComparer) {
          draft.ids = sortIds(draft.ids, draft.entities);
        }
      }

      draft.entities = { ...draft.entities, [id]: entity };
    });
  };

  const addMany = (
    state: EntityState<T, Id>,
    action: PayloadAction<T[]>
  ): EntityState<T, Id> => {
    return produce(state, (draft: EntityState<T, Id>) => {
      const entities = action.payload;

      entities.forEach((entity) => {
        const id = selectId(entity);

        if (!(id in draft.entities)) {
          draft.ids.push(id);
        }

        draft.entities = { ...draft.entities, [id]: entity };
      });

      if (sortComparer !== defaultSortComparer) {
        draft.ids = sortIds(draft.ids, draft.entities);
      }
    });
  };

  const setOne = (
    state: EntityState<T, Id>,
    action: PayloadAction<T>
  ): EntityState<T, Id> => {
    return produce(state, (draft: EntityState<T, Id>) => {
      const entity = action.payload;
      const id = selectId(entity);

      if (!(id in draft.entities)) {
        draft.ids.push(id);
        if (sortComparer !== defaultSortComparer) {
          draft.ids = sortIds(draft.ids, draft.entities);
        }
      }

      draft.entities = { ...draft.entities, [id]: entity };
    });
  };

  const setMany = (
    state: EntityState<T, Id>,
    action: PayloadAction<T[]>
  ): EntityState<T, Id> => {
    return produce(state, (draft: EntityState<T, Id>) => {
      const entities = action.payload;

      entities.forEach((entity) => {
        const id = selectId(entity);

        if (!(id in draft.entities)) {
          draft.ids.push(id);
        }

        draft.entities = { ...draft.entities, [id]: entity };
      });

      if (sortComparer !== defaultSortComparer) {
        draft.ids = sortIds(draft.ids, draft.entities);
      }
    });
  };

  const removeOne = (
    state: EntityState<T, Id>,
    action: PayloadAction<Id>
  ): EntityState<T, Id> => {
    return produce(state, (draft: EntityState<T, Id>) => {
      const id = action.payload;

      if (id in draft.entities) {
        delete draft.entities[id];
        draft.ids = draft.ids.filter((entityId: Id) => entityId !== id);
      }
    });
  };

  const removeMany = (
    state: EntityState<T, Id>,
    action: PayloadAction<Id[]>
  ): EntityState<T, Id> => {
    return produce(state, (draft: EntityState<T, Id>) => {
      const ids = action.payload;

      ids.forEach((id) => {
        if (id in draft.entities) {
          delete draft.entities[id];
        }
      });

      draft.ids = draft.ids.filter((entityId: Id) => !ids.includes(entityId));
    });
  };

  const updateOne = (
    state: EntityState<T, Id>,
    action: PayloadAction<{ id: Id; changes: Partial<T> }>
  ): EntityState<T, Id> => {
    return produce(state, (draft: EntityState<T, Id>) => {
      const { id, changes } = action.payload;

      if (id in draft.entities) {
        const entity = draft.entities[id];
        draft.entities = { ...draft.entities, [id]: { ...entity, ...changes } };
      }
    });
  };

  const updateMany = (
    state: EntityState<T, Id>,
    action: PayloadAction<{ id: Id; changes: Partial<T> }[]>
  ): EntityState<T, Id> => {
    return produce(state, (draft: EntityState<T, Id>) => {
      action.payload.forEach(({ id, changes }) => {
        if (id in draft.entities) {
          const entity = draft.entities[id];
          draft.entities = {
            ...draft.entities,
            [id]: { ...entity, ...changes },
          };
        }
      });
    });
  };

  const upsertOne = (
    state: EntityState<T, Id>,
    action: PayloadAction<T>
  ): EntityState<T, Id> => {
    return produce(state, (draft: EntityState<T, Id>) => {
      const entity = action.payload;
      const id = selectId(entity);

      if (!(id in draft.entities)) {
        draft.ids.push(id);
        if (sortComparer !== defaultSortComparer) {
          draft.ids = sortIds(draft.ids, draft.entities);
        }
      }

      draft.entities = { ...draft.entities, [id]: entity };
    });
  };

  const upsertMany = (
    state: EntityState<T, Id>,
    action: PayloadAction<T[]>
  ): EntityState<T, Id> => {
    return produce(state, (draft: EntityState<T, Id>) => {
      const entities = action.payload;

      entities.forEach((entity) => {
        const id = selectId(entity);

        if (!(id in draft.entities)) {
          draft.ids.push(id);
        }

        draft.entities = { ...draft.entities, [id]: entity };
      });

      if (sortComparer !== defaultSortComparer) {
        draft.ids = sortIds(draft.ids, draft.entities);
      }
    });
  };

  const removeAll = (
    state: EntityState<T, Id>,
    action?: PayloadAction<void>
  ): EntityState<T, Id> => {
    return produce(state, (draft: EntityState<T, Id>) => {
      draft.ids = [];
      draft.entities = {} as Record<Id, T>;
    });
  };

  const getInitialState = (): EntityState<T, Id> => {
    return {
      ids: [],
      entities: {} as Record<Id, T>,
    };
  };

  return {
    // Selectors
    selectCollection,
    selectIds,
    selectEntities,
    selectAll,
    selectTotal,
    selectById,

    // Reducer methods
    addOne,
    addMany,
    setOne,
    setMany,
    removeOne,
    removeMany,
    updateOne,
    updateMany,
    upsertOne,
    upsertMany,
    removeAll,

    // Initial state
    getInitialState,
  };
}

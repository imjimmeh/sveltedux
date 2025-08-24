import { createAsyncThunk } from "./thunks.js";

export function createBatchAsyncThunk<TItem, TArg, TState = unknown>(
  typePrefix: string,
  batchFunction: (args: TArg[]) => Promise<TItem[]>,
  options: {
    batchSize?: number;
    batchDelay?: number;
  } = {}
) {
  const { batchSize = 10, batchDelay = 100 } = options;
  let pendingBatch: {
    arg: TArg;
    resolve: (value: TItem) => void;
    reject: (error: unknown) => void;
  }[] = [];
  let batchTimeout: NodeJS.Timeout | null = null;

  const executeBatch = async () => {
    if (pendingBatch.length === 0) return;

    const currentBatch = [...pendingBatch];
    pendingBatch = [];

    try {
      const args = currentBatch.map((item) => item.arg);
      const results = await batchFunction(args);

      currentBatch.forEach((item, index) => {
        item.resolve(results[index]);
      });
    } catch (error) {
      currentBatch.forEach((item) => {
        item.reject(error);
      });
    }

    if (batchTimeout) {
      clearTimeout(batchTimeout);
      batchTimeout = null;
    }
  };

  return createAsyncThunk<TItem, TArg, TState>(typePrefix, async (arg) => {
    return new Promise<TItem>((resolve, reject) => {
      pendingBatch.push({ arg, resolve, reject });

      if (pendingBatch.length >= batchSize) {
        executeBatch();
      } else {
        batchTimeout ??= setTimeout(executeBatch, batchDelay);
      }
    });
  });
}
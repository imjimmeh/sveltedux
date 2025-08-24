import type { Middleware, Action } from "../../types.js";
import { isAsyncThunkAction } from "../thunks.js";

const DEFAULT_BATCH_SIZE = 10;
const DEFAULT_FLUSH_INTERVAL = 100;
const BATCH_ACTION_TYPE = "@@BATCH";

interface BatchingOptions {
  batchSize?: number;
  flushInterval?: number;
  shouldBatch?: (action: Action) => boolean;
}

class BatchManager {
  private batchedActions: Action[] = [];
  private flushTimeout: NodeJS.Timeout | null = null;

  constructor(
    private readonly batchSize: number,
    private readonly flushInterval: number,
    private readonly dispatch: (action: Action) => unknown
  ) {}

  addAction(action: Action): void {
    this.batchedActions.push(action);
    this.scheduleFlush();
  }

  private scheduleFlush(): void {
    if (this.shouldFlushImmediately()) {
      this.flush();
    } else if (this.shouldScheduleTimeout()) {
      this.scheduleTimeoutFlush();
    }
  }

  private shouldFlushImmediately(): boolean {
    return this.batchedActions.length >= this.batchSize;
  }

  private shouldScheduleTimeout(): boolean {
    return !this.flushTimeout;
  }

  private scheduleTimeoutFlush(): void {
    this.flushTimeout = setTimeout(() => this.flush(), this.flushInterval);
  }

  private flush(): void {
    if (!this.hasBatchedActions()) return;

    const batch = this.getBatchSnapshot();
    this.clearBatch();
    this.dispatchBatch(batch);
    this.clearTimeout();
  }

  private hasBatchedActions(): boolean {
    return this.batchedActions.length > 0;
  }

  private getBatchSnapshot(): Action[] {
    return [...this.batchedActions];
  }

  private clearBatch(): void {
    this.batchedActions = [];
  }

  private dispatchBatch(batch: Action[]): void {
    this.dispatch({
      type: BATCH_ACTION_TYPE,
      payload: batch,
    });
  }

  private clearTimeout(): void {
    if (this.flushTimeout) {
      clearTimeout(this.flushTimeout);
      this.flushTimeout = null;
    }
  }
}

function createDefaultShouldBatch(): (action: Action) => boolean {
  return (action) => isAsyncThunkAction(action);
}

export function createBatchingMiddleware<TState = unknown>(
  options: BatchingOptions = {}
): Middleware<TState> {
  const {
    batchSize = DEFAULT_BATCH_SIZE,
    flushInterval = DEFAULT_FLUSH_INTERVAL,
    shouldBatch = createDefaultShouldBatch(),
  } = options;

  return ({ dispatch }) => {
    const batchManager = new BatchManager(batchSize, flushInterval, dispatch);

    return (next) => (action) => {
      if (shouldBatch(action)) {
        batchManager.addAction(action);
        return action;
      }

      return next(action);
    };
  };
}

import { Thread } from "./thread"

/** Pool event type. Specifies the type of each `PoolEvent`. */
export enum PoolEventType {
  initialized = "initialized",
  taskCanceled = "taskCanceled",
  taskCompleted = "taskCompleted",
  taskFailed = "taskFailed",
  taskQueued = "taskQueued",
  taskQueueDrained = "taskQueueDrained",
  taskStart = "taskStart",
  terminated = "terminated"
}

export type TaskRunFunction<ThreadType extends Thread, Return> = (worker: ThreadType) => Promise<Return>

/** Pool event. Subscribe to those events using `pool.events()`. Useful for debugging. */
export type PoolEvent<ThreadType extends Thread> = {
  type: PoolEventType.initialized,
  size: number
} | {
  type: PoolEventType.taskQueued,
  taskID: number
} | {
  type: PoolEventType.taskQueueDrained
} | {
  type: PoolEventType.taskStart,
  taskID: number,
  workerID: number
} | {
  type: PoolEventType.taskCompleted,
  returnValue: any,
  taskID: number,
  workerID: number
} | {
  type: PoolEventType.taskFailed,
  error: Error,
  taskID: number,
  workerID: number
} | {
  type: PoolEventType.taskCanceled,
  taskID: number
} | {
  type: PoolEventType.terminated,
  remainingQueue: Array<QueuedTask<ThreadType, any>>
}

export interface WorkerDescriptor<ThreadType extends Thread> {
  init: Promise<ThreadType>
  runningTasks: Array<Promise<any>>
}

/**
 * Task that has been `pool.queued()`-ed.
 */
export interface QueuedTask<ThreadType extends Thread, Return> {
  /** @private */
  id: number

  /** @private */
  run: TaskRunFunction<ThreadType, Return>

  /**
   * Queued tasks can be cancelled until the pool starts running them on a worker thread.
   */
  cancel(): void

  /**
   * `QueuedTask` is thenable, so you can `await` it.
   * Resolves when the task has successfully been executed. Rejects if the task fails.
   */
  then: Promise<Return>["then"]
}

import DebugLogger from "debug"
import Observable from "zen-observable"
import { makeHot } from "../observable-promise"
import Implementation from "./implementation"
import { Thread } from "./thread"

export { Thread }

let nextPoolID = 1

const hasSymbols = () => typeof Symbol === 'function'
const hasSymbol = (name: keyof typeof Symbol) => hasSymbols() && Boolean(Symbol[name])

function flatMap<In, Out>(array: In[], mapper: ((element: In) => Out[])): Out[] {
  return array.reduce<Out[]>(
    (flattened, element) => [...flattened, ...mapper(element)],
    []
  )
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function slugify(text: string) {
  return text.replace(/\W/g, " ").trim().replace(/\s+/g, "-")
}

// tslint:disable-next-line no-namespace
export declare namespace Pool {
  type Event<ThreadType extends Thread = any> = PoolEvent<ThreadType>
  type EventType = PoolEventType
}

export enum PoolEventType {
  initialized = "initialized",
  taskCompleted = "taskCompleted",
  taskFailed = "taskFailed",
  taskQueued = "taskQueued",
  taskQueueDrained = "taskQueueDrained",
  taskStart = "taskStart",
  terminated = "terminated"
}

type TaskRunFunction<ThreadType extends Thread, Return> = (worker: ThreadType) => Promise<Return>

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
  type: PoolEventType.terminated,
  remainingQueue: Array<QueuedTask<ThreadType, any>>
}

interface WorkerDescriptor<ThreadType extends Thread> {
  init: Promise<ThreadType>
  runningTasks: Array<Promise<any>>
}

function createArray(size: number): number[] {
  const array: number[] = []
  for (let index = 0; index < size; index++) {
    array.push(index)
  }
  return array
}

function findIdlingWorker<ThreadType extends Thread>(
  workers: Array<WorkerDescriptor<ThreadType>>,
  maxConcurrency: number
): WorkerDescriptor<ThreadType> | undefined {
  return workers.find(worker => worker.runningTasks.length < maxConcurrency)
}

async function runPoolTask<ThreadType extends Thread>(
  task: QueuedTask<ThreadType, any>,
  availableWorker: WorkerDescriptor<ThreadType>,
  workerID: number,
  eventSubject: ZenObservable.SubscriptionObserver<PoolEvent<ThreadType>>,
  debug: DebugLogger.Debugger
) {
  debug(`Running task #${task.id} on worker #${workerID}...`)
  eventSubject.next({
    type: PoolEventType.taskStart,
    taskID: task.id,
    workerID
  })

  try {
    const returnValue = await task.run(await availableWorker.init)

    debug(`Task #${task.id} completed successfully`)
    eventSubject.next({
      type: PoolEventType.taskCompleted,
      returnValue,
      taskID: task.id,
      workerID
    })
  } catch (error) {
    debug(`Task #${task.id} failed`)
    eventSubject.next({
      type: PoolEventType.taskFailed,
      taskID: task.id,
      error,
      workerID
    })
  }
}

function spawnWorkers<ThreadType extends Thread>(
  spawnWorker: () => Promise<ThreadType>,
  count: number
): Array<WorkerDescriptor<ThreadType>> {
  return createArray(count).map((): WorkerDescriptor<ThreadType> => ({
    init: spawnWorker(),
    runningTasks: []
  }))
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

/**
 * Thread pool implementation managing a set of worker threads.
 * Use it to queue tasks that are run on those threads with limited
 * concurrency.
 */
export interface Pool<ThreadType extends Thread> {
  /**
   * Returns a promise that resolves once the task queue is emptied.
   *
   * @param allowResolvingImmediately Set to `true` to resolve immediately if task queue is currently empty.
   */
  completed(allowResolvingImmediately?: boolean): Promise<any>

  /**
   * Returns an observable that yields pool events.
   */
  events(): Observable<PoolEvent<ThreadType>>

  /**
   * Queue a task and return a promise that resolves once the task has been dequeued,
   * started and finished.
   *
   * @param task An async function that takes a thread instance and invokes it.
   */
  queue<Return>(task: TaskRunFunction<ThreadType, Return>): QueuedTask<ThreadType, Return>

  /**
   * Terminate all pool threads.
   *
   * @param force Set to `true` to kill the thread even if it cannot be stopped gracefully.
   */
  terminate(force?: boolean): Promise<void>
}

export interface PoolOptions {
  /** Maximum no. of tasks to run on one worker thread at a time. Defaults to one. */
  concurrency?: number

  /** Gives that pool a name to be used for debug logging, letting you distinguish between log output of different pools. */
  name?: string

  /** No. of worker threads to spawn and to be managed by the pool. */
  size?: number
}

function PoolConstructor<ThreadType extends Thread>(
  spawnWorker: () => Promise<ThreadType>,
  optionsOrSize?: number | PoolOptions
): Pool<ThreadType> {
  const options: PoolOptions = typeof optionsOrSize === "number"
    ? { size: optionsOrSize }
    : optionsOrSize || {}

  const debug = DebugLogger(`threads:pool:${slugify(options.name || String(nextPoolID++))}`)
  const { concurrency = 1, size = Implementation.defaultPoolSize } = options

  let isClosing = false
  let nextTaskID = 1

  let taskQueue: Array<QueuedTask<ThreadType, any>> = []
  const workers = spawnWorkers(spawnWorker, size)

  let eventSubject: ZenObservable.SubscriptionObserver<PoolEvent<ThreadType>>

  const eventObservable = makeHot(new Observable<PoolEvent<ThreadType>>(subscriber => {
    eventSubject = subscriber
  }))

  Promise.all(workers.map(worker => worker.init)).then(
    () => eventSubject.next({
      type: PoolEventType.initialized,
      size: workers.length
    }),
    error => eventSubject.error(error)
  )

  const scheduleWork = () => {
    debug(`Attempt de-queueing a task in order to run it...`)

    const availableWorker = findIdlingWorker(workers, concurrency)
    if (!availableWorker) return

    const nextTask = taskQueue.shift()
    if (!nextTask) {
      debug(`Task queue is empty`)
      eventSubject.next({ type: PoolEventType.taskQueueDrained })
      return
    }

    const workerID = workers.indexOf(availableWorker) + 1

    const run = async (worker: WorkerDescriptor<ThreadType>, task: QueuedTask<ThreadType, any>) => {
      const removeTaskFromWorkersRunningTasks = () => {
        worker.runningTasks = worker.runningTasks.filter(someRunPromise => someRunPromise !== runPromise)
      }

      // Defer task execution by one tick to give handlers time to subscribe
      await sleep(0)

      try {
        await runPoolTask(task, availableWorker, workerID, eventSubject, debug)
      } finally {
        removeTaskFromWorkersRunningTasks()

        if (!isClosing) {
          scheduleWork()
        }
      }
    }

    const runPromise = run(availableWorker, nextTask)
    availableWorker.runningTasks.push(runPromise)
  }

  const pool: Pool<ThreadType> = {
    async completed(allowResolvingImmediately: boolean = false) {
      const getCurrentlyRunningTasks = () => flatMap(workers, worker => worker.runningTasks)

      if (allowResolvingImmediately && taskQueue.length === 0) {
        return Promise.all(getCurrentlyRunningTasks())
      }

      const poolEventPromise = new Promise((resolve, reject) => {
        const subscription = eventObservable.subscribe(event => {
          if (event.type === PoolEventType.taskQueueDrained) {
            subscription.unsubscribe()
            resolve()
          } else if (event.type === PoolEventType.taskFailed) {
            subscription.unsubscribe()
            reject(event.error)
          }
        })
      })

      await Promise.race([
        poolEventPromise,
        eventObservable   // make a pool-wide error reject the completed() result promise
      ])
      await Promise.all(getCurrentlyRunningTasks())
    },

    events() {
      return eventObservable
    },

    queue(taskFunction) {
      if (isClosing) {
        throw Error(`Cannot schedule pool tasks after terminate() has been called.`)
      }

      let resultPromiseThen: Promise<any>["then"] | undefined

      const createResultPromise = () => new Promise<any>((resolve, reject) => {
        const eventSubscription = pool.events().subscribe(event => {
          if (event.type === PoolEventType.taskCompleted && event.taskID === task.id) {
            eventSubscription.unsubscribe()
            resolve(event.returnValue)
          } else if (event.type === PoolEventType.taskFailed && event.taskID === task.id) {
            eventSubscription.unsubscribe()
            reject(event.error)
          } else if (event.type === PoolEventType.terminated) {
            eventSubscription.unsubscribe()
            reject(Error("Pool has been terminated before task was run."))
          }
        })
      })

      const task: QueuedTask<ThreadType, any> = {
        id: nextTaskID++,
        run: taskFunction,
        cancel() {
          if (taskQueue.indexOf(task) === -1) return
          taskQueue = taskQueue.filter(someTask => someTask !== task)
        },
        get then() {
          if (!resultPromiseThen) {
            const resultPromise = createResultPromise()
            resultPromiseThen = resultPromise.then.bind(resultPromise)
          }
          return resultPromiseThen
        }
      }
      debug(`Queueing task #${task.id}...`)
      taskQueue.push(task)

      eventSubject.next({
        type: PoolEventType.taskQueued,
        taskID: task.id
      })

      scheduleWork()
      return task
    },

    async terminate(force?: boolean) {
      isClosing = true
      if (!force) {
        await pool.completed(true)
      }
      eventSubject.next({
        type: PoolEventType.terminated,
        remainingQueue: [...taskQueue]
      })
      eventSubject.complete()
      await Promise.all(
        workers.map(async worker => Thread.terminate(await worker.init))
      )
    }
  }

  if (hasSymbols() && hasSymbol("toStringTag")) {
    (pool as any)[Symbol.toStringTag] = () => `[object Pool]`
  }
  return pool
}

(PoolConstructor as any).EventType = PoolEventType

export const Pool = PoolConstructor as typeof PoolConstructor & { EventType: typeof PoolEventType }

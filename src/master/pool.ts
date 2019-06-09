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

export interface Task<ThreadType extends Thread, Return> {
  id: number
  run: TaskRunFunction<ThreadType, Return>
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
  remainingQueue: Array<Task<ThreadType, any>>
}

interface WorkerDescriptor<ThreadType extends Thread> {
  init: Promise<ThreadType>
  runningJobs: Array<Promise<any>>
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
  return workers.find(worker => worker.runningJobs.length < maxConcurrency)
}

function spawnWorkers<ThreadType extends Thread>(
  spawnWorker: () => Promise<ThreadType>,
  count: number
): Array<WorkerDescriptor<ThreadType>> {
  return createArray(count).map((): WorkerDescriptor<ThreadType> => ({
    init: spawnWorker(),
    runningJobs: []
  }))
}

/**
 * Thread pool implementation managing a set of worker threads.
 * Use it to queue jobs that are run on those threads with limited
 * concurrency.
 */
export interface Pool<ThreadType extends Thread> {
  /**
   * Returns a promise that resolves once the job queue is emptied.
   *
   * @param allowResolvingImmediately Set to `true` to resolve immediately if job queue is currently empty.
   */
  completed(allowResolvingImmediately?: boolean): Promise<any>

  /**
   * Returns an observable that yields pool events.
   */
  events(): Observable<PoolEvent<ThreadType>>

  /**
   * Queue a job and return a promise that resolves once the job has been dequeued,
   * started and finished.
   *
   * @param job An async function that takes a thread instance and invokes it.
   */
  queue<Return>(job: TaskRunFunction<ThreadType, Return>): Promise<Return>

  /**
   * Terminate all pool threads.
   *
   * @param force Set to `true` to kill the thread even if it cannot be stopped gracefully.
   */
  terminate(force?: boolean): Promise<void>
}

export interface PoolOptions {
  /** Maximum no. of jobs to run on one worker thread at a time. Defaults to one. */
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

  const taskQueue: Array<Task<ThreadType, any>> = []
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
    debug(`Running task #${nextTask.id} on worker #${workerID}...`)

    eventSubject.next({
      type: PoolEventType.taskStart,
      taskID: nextTask.id,
      workerID
    })

    const run = async (worker: WorkerDescriptor<ThreadType>, task: Task<ThreadType, any>) => {
      const removeJobFromWorkersRunningJobs = () => {
        worker.runningJobs = worker.runningJobs.filter(someRunPromise => someRunPromise !== runPromise)
      }

      // Defer job execution by one tick to give handlers time to subscribe
      await sleep(0)

      try {
        const returnValue = await task.run(await availableWorker.init)

        debug(`Task #${nextTask.id} completed successfully`)
        removeJobFromWorkersRunningJobs()

        eventSubject.next({
          type: PoolEventType.taskCompleted,
          returnValue,
          taskID: nextTask.id,
          workerID
        })
      } catch(error) {
        debug(`Task #${nextTask.id} failed`)
        removeJobFromWorkersRunningJobs()

        eventSubject.next({
          type: PoolEventType.taskFailed,
          taskID: nextTask.id,
          error,
          workerID
        })
      } finally {
        if (!isClosing) {
          scheduleWork()
        }
      }
    }
    const runPromise = run(availableWorker, nextTask)
    availableWorker.runningJobs.push(runPromise)
  }

  const pool: Pool<ThreadType> = {
    async completed(allowResolvingImmediately: boolean = false) {
      const getCurrentlyRunningJobs = () => flatMap(workers, worker => worker.runningJobs)

      if (allowResolvingImmediately && taskQueue.length === 0) {
        return Promise.all(getCurrentlyRunningJobs())
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
      await Promise.all(getCurrentlyRunningJobs())
    },

    events() {
      return eventObservable
    },

    queue(taskFunction) {
      if (isClosing) {
        throw Error(`Cannot schedule pool tasks after terminate() has been called.`)
      }

      const task: Task<ThreadType, any> = {
        id: nextTaskID++,
        run: taskFunction
      }
      debug(`Queueing task #${task.id}...`)
      taskQueue.push(task)

      eventSubject.next({
        type: PoolEventType.taskQueued,
        taskID: task.id
      })

      const resultPromise = new Promise<any>((resolve, reject) => {
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
        try {
          scheduleWork()
        } catch(error) {
          eventSubscription.unsubscribe()
          reject(error)
        }
      })

      // Don't raise an UnhandledPromiseRejection error if not handled
      // Reason: Because we just return this promise for convenience, but usually only
      //         pool.completed() will be used, leaving this quasi-duplicate promise unhandled.
      resultPromise.catch(() => undefined)

      return resultPromise
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

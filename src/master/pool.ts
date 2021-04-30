import DebugLogger from "debug"
import { multicast, Observable, Subject } from "observable-fns"
import { allSettled } from "../ponyfills"
import { defaultPoolSize } from "./implementation"
import {
  PoolEvent,
  PoolEventType,
  QueuedTask,
  TaskRunFunction,
  WorkerDescriptor
} from "./pool-types"
import { Thread } from "./thread"

export { PoolEvent, PoolEventType, QueuedTask, Thread }

// tslint:disable-next-line no-namespace
export declare namespace Pool {
  type Event<ThreadType extends Thread = any> = PoolEvent<ThreadType>
  type EventType = PoolEventType
}

let nextPoolID = 1

function createArray(size: number): number[] {
  const array: number[] = []
  for (let index = 0; index < size; index++) {
    array.push(index)
  }
  return array
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function flatMap<In, Out>(array: In[], mapper: ((element: In) => Out[])): Out[] {
  return array.reduce<Out[]>(
    (flattened, element) => [...flattened, ...mapper(element)],
    []
  )
}

function slugify(text: string) {
  return text.replace(/\W/g, " ").trim().replace(/\s+/g, "-")
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
 * Thread pool managing a set of worker threads.
 * Use it to queue tasks that are run on those threads with limited
 * concurrency.
 */
export interface Pool<ThreadType extends Thread> {
  /**
   * Returns a promise that resolves once the task queue is emptied.
   * Promise will be rejected if any task fails.
   *
   * @param allowResolvingImmediately Set to `true` to resolve immediately if task queue is currently empty.
   */
  completed(allowResolvingImmediately?: boolean): Promise<any>

  /**
   * Returns a promise that resolves once the task queue is emptied.
   * Failing tasks will not cause the promise to be rejected.
   *
   * @param allowResolvingImmediately Set to `true` to resolve immediately if task queue is currently empty.
   */
  settled(allowResolvingImmediately?: boolean): Promise<Error[]>

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

  /** Maximum no. of jobs to be queued for execution before throwing an error. */
  maxQueuedJobs?: number

  /** Gives that pool a name to be used for debug logging, letting you distinguish between log output of different pools. */
  name?: string

  /** No. of worker threads to spawn and to be managed by the pool. */
  size?: number
}

class WorkerPool<ThreadType extends Thread> implements Pool<ThreadType> {
  public static EventType = PoolEventType

  private readonly debug: DebugLogger.Debugger
  private readonly eventObservable: Observable<PoolEvent<ThreadType>>
  private readonly options: PoolOptions
  private readonly workers: Array<WorkerDescriptor<ThreadType>>

  private readonly eventSubject = new Subject<PoolEvent<ThreadType>>()
  private initErrors: Error[] = []
  private isClosing = false
  private nextTaskID = 1
  private taskQueue: Array<QueuedTask<ThreadType, any>> = []

  constructor(
    spawnWorker: () => Promise<ThreadType>,
    optionsOrSize?: number | PoolOptions
  ) {
    const options: PoolOptions = typeof optionsOrSize === "number"
      ? { size: optionsOrSize }
      : optionsOrSize || {}

    const { size = defaultPoolSize } = options

    this.debug = DebugLogger(`threads:pool:${slugify(options.name || String(nextPoolID++))}`)
    this.options = options
    this.workers = spawnWorkers(spawnWorker, size)

    this.eventObservable = multicast(Observable.from(this.eventSubject))

    Promise.all(this.workers.map(worker => worker.init)).then(
      () => this.eventSubject.next({
        type: PoolEventType.initialized,
        size: this.workers.length
      }),
      error => {
        this.debug("Error while initializing pool worker:", error)
        this.eventSubject.error(error)
        this.initErrors.push(error)
      }
    )
  }

  private findIdlingWorker(): WorkerDescriptor<ThreadType> | undefined {
    const { concurrency = 1 } = this.options
    return this.workers.find(worker => worker.runningTasks.length < concurrency)
  }

  private async runPoolTask(worker: WorkerDescriptor<ThreadType>, task: QueuedTask<ThreadType, any>) {
    const workerID = this.workers.indexOf(worker) + 1

    this.debug(`Running task #${task.id} on worker #${workerID}...`)
    this.eventSubject.next({
      type: PoolEventType.taskStart,
      taskID: task.id,
      workerID
    })

    try {
      const returnValue = await task.run(await worker.init)

      this.debug(`Task #${task.id} completed successfully`)
      this.eventSubject.next({
        type: PoolEventType.taskCompleted,
        returnValue,
        taskID: task.id,
        workerID
      })
    } catch (error) {
      this.debug(`Task #${task.id} failed`)
      this.eventSubject.next({
        type: PoolEventType.taskFailed,
        taskID: task.id,
        error,
        workerID
      })
    }
  }

  private async run(worker: WorkerDescriptor<ThreadType>, task: QueuedTask<ThreadType, any>) {
    const runPromise = (async () => {
      const removeTaskFromWorkersRunningTasks = () => {
        worker.runningTasks = worker.runningTasks.filter(someRunPromise => someRunPromise !== runPromise)
      }

      // Defer task execution by one tick to give handlers time to subscribe
      await delay(0)

      try {
        await this.runPoolTask(worker, task)
      } finally {
        removeTaskFromWorkersRunningTasks()

        if (!this.isClosing) {
          this.scheduleWork()
        }
      }
    })()

    worker.runningTasks.push(runPromise)
  }


  private scheduleWork() {
    this.debug(`Attempt de-queueing a task in order to run it...`)

    const availableWorker = this.findIdlingWorker()
    if (!availableWorker) return

    const nextTask = this.taskQueue.shift()
    if (!nextTask) {
      this.debug(`Task queue is empty`)
      this.eventSubject.next({ type: PoolEventType.taskQueueDrained })
      return
    }

    this.run(availableWorker, nextTask)
  }

  private taskCompletion(taskID: number) {
    return new Promise<any>((resolve, reject) => {
      const eventSubscription = this.events().subscribe(event => {
        if (event.type === PoolEventType.taskCompleted && event.taskID === taskID) {
          eventSubscription.unsubscribe()
          resolve(event.returnValue)
        } else if (event.type === PoolEventType.taskFailed && event.taskID === taskID) {
          eventSubscription.unsubscribe()
          reject(event.error)
        } else if (event.type === PoolEventType.terminated) {
          eventSubscription.unsubscribe()
          reject(Error("Pool has been terminated before task was run."))
        }
      })
    })
  }

  public async settled(allowResolvingImmediately: boolean = false): Promise<Error[]> {
    const getCurrentlyRunningTasks = () => flatMap(this.workers, worker => worker.runningTasks)

    const taskFailures: Error[] = []

    const failureSubscription = this.eventObservable.subscribe(event => {
      if (event.type === PoolEventType.taskFailed) {
        taskFailures.push(event.error)
      }
    })

    if (this.initErrors.length > 0) {
      return Promise.reject(this.initErrors[0])
    }
    if (allowResolvingImmediately && this.taskQueue.length === 0) {
      await allSettled(getCurrentlyRunningTasks())
      return taskFailures
    }

    await new Promise<void>((resolve, reject) => {
      const subscription = this.eventObservable.subscribe({
        next(event) {
          if (event.type === PoolEventType.taskQueueDrained) {
            subscription.unsubscribe()
            resolve(void 0)
          }
        },
        error: reject     // make a pool-wide error reject the completed() result promise
      })
    })

    await allSettled(getCurrentlyRunningTasks())
    failureSubscription.unsubscribe()

    return taskFailures
  }

  public async completed(allowResolvingImmediately: boolean = false) {
    const settlementPromise = this.settled(allowResolvingImmediately)

    const earlyExitPromise = new Promise<Error[]>((resolve, reject) => {
      const subscription = this.eventObservable.subscribe({
        next(event) {
          if (event.type === PoolEventType.taskQueueDrained) {
            subscription.unsubscribe()
            resolve(settlementPromise)
          } else if (event.type === PoolEventType.taskFailed) {
            subscription.unsubscribe()
            reject(event.error)
          }
        },
        error: reject     // make a pool-wide error reject the completed() result promise
      })
    })

    const errors = await Promise.race([
      settlementPromise,
      earlyExitPromise
    ])

    if (errors.length > 0) {
      throw errors[0]
    }
  }

  public events() {
    return this.eventObservable
  }

  public queue(taskFunction: TaskRunFunction<ThreadType, any>) {
    const { maxQueuedJobs = Infinity } = this.options

    if (this.isClosing) {
      throw Error(`Cannot schedule pool tasks after terminate() has been called.`)
    }
    if (this.initErrors.length > 0) {
      throw this.initErrors[0]
    }

    const taskID = this.nextTaskID++
    const taskCompletion = this.taskCompletion(taskID)

    taskCompletion.catch((error) => {
      // Prevent unhandled rejections here as we assume the user will use
      // `pool.completed()`, `pool.settled()` or `task.catch()` to handle errors
      this.debug(`Task #${taskID} errored:`, error)
    })

    const task: QueuedTask<ThreadType, any> = {
      id: taskID,
      run: taskFunction,
      cancel: () => {
        if (this.taskQueue.indexOf(task) === -1) return
        this.taskQueue = this.taskQueue.filter(someTask => someTask !== task)
        this.eventSubject.next({
          type: PoolEventType.taskCanceled,
          taskID: task.id
        })
      },
      then: taskCompletion.then.bind(taskCompletion)
    }

    if (this.taskQueue.length >= maxQueuedJobs) {
      throw Error(
        "Maximum number of pool tasks queued. Refusing to queue another one.\n" +
        "This usually happens for one of two reasons: We are either at peak " +
        "workload right now or some tasks just won't finish, thus blocking the pool."
      )
    }

    this.debug(`Queueing task #${task.id}...`)
    this.taskQueue.push(task)

    this.eventSubject.next({
      type: PoolEventType.taskQueued,
      taskID: task.id
    })

    this.scheduleWork()
    return task
  }

  public async terminate(force?: boolean) {
    this.isClosing = true
    if (!force) {
      await this.completed(true)
    }
    this.eventSubject.next({
      type: PoolEventType.terminated,
      remainingQueue: [...this.taskQueue]
    })
    this.eventSubject.complete()
    await Promise.all(
      this.workers.map(async worker => Thread.terminate(await worker.init))
    )
  }
}

/**
 * Thread pool constructor. Creates a new pool and spawns its worker threads.
 */
function PoolConstructor<ThreadType extends Thread>(
  spawnWorker: () => Promise<ThreadType>,
  optionsOrSize?: number | PoolOptions
) {
  // The function exists only so we don't need to use `new` to create a pool (we still can, though).
  // If the Pool is a class or not is an implementation detail that should not concern the user.
  return new WorkerPool(spawnWorker, optionsOrSize)
}

(PoolConstructor as any).EventType = PoolEventType

/**
 * Thread pool constructor. Creates a new pool and spawns its worker threads.
 */
export const Pool = PoolConstructor as typeof PoolConstructor & { EventType: typeof PoolEventType }

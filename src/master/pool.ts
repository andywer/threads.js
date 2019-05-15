import DebugLogger from "debug"
import Observable from "zen-observable"
import { makeHot } from "../observable-promise"
import Implementation from "./implementation"
import { Thread } from "./thread"

export { Thread }

let nextPoolID = 1

const hasSymbols = () => typeof Symbol === 'function'
const hasSymbol = (name: keyof typeof Symbol) => hasSymbols() && Boolean(Symbol[name])

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
  runningTasks: Array<Task<ThreadType, any>>
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

function spawnWorkers<ThreadType extends Thread>(
  spawnWorker: () => Promise<ThreadType>,
  count: number
): Array<WorkerDescriptor<ThreadType>> {
  return createArray(count).map((): WorkerDescriptor<ThreadType> => ({
    init: spawnWorker(),
    runningTasks: []
  }))
}

export interface Pool<ThreadType extends Thread> {
  events(): Observable<PoolEvent<ThreadType>>
  queue<Return>(task: TaskRunFunction<ThreadType, Return>): Promise<Return>
  terminate(force?: boolean): Promise<void>
}

export interface PoolOptions {
  concurrency?: number
  name?: string
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
  let runningTaskJobs: Array<Promise<any>> = []

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
    debug(`Attempt de-queueing a task to run it...`)

    const availableWorker = findIdlingWorker(workers, concurrency)
    if (!availableWorker) return

    const nextTask = taskQueue.shift()
    if (!nextTask) return

    const workerID = workers.indexOf(availableWorker) + 1
    debug(`Running task #${nextTask.id} on worker #${workerID}...`)

    eventSubject.next({
      type: PoolEventType.taskStart,
      taskID: nextTask.id,
      workerID
    })

    const run = async () => {
      try {
        const returnValue = await nextTask.run(await availableWorker.init)

        debug(`Task #${nextTask.id} completed successfully`)
        eventSubject.next({
          type: PoolEventType.taskCompleted,
          returnValue,
          taskID: nextTask.id,
          workerID
        })
      } catch(error) {
        debug(`Task #${nextTask.id} failed`)
        eventSubject.next({
          type: PoolEventType.taskFailed,
          taskID: nextTask.id,
          error,
          workerID
        })
        throw error
      } finally {
        runningTaskJobs = runningTaskJobs.filter(someRunPromise => someRunPromise !== runPromise)
        if (!isClosing) {
          scheduleWork()
        }
      }
    }
    const runPromise = run()
    runningTaskJobs.push(runPromise)
  }

  const pool: Pool<ThreadType> = {
    events() {
      return eventObservable
    },

    async queue(taskFunction) {
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

      return new Promise((resolve, reject) => {
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
    },

    async terminate(force?: boolean) {
      isClosing = true
      if (!force) {
        await Promise.all(runningTaskJobs)
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

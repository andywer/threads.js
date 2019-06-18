import DebugLogger from "debug"
import Observable from "zen-observable"
import { rehydrateError } from "../common"
import { createPromiseWithResolver } from "../promise"
import { $errors, $events, $terminate, $worker } from "../symbols"
import {
  FunctionThread,
  ModuleThread,
  PrivateThreadProps,
  Worker as WorkerType,
  WorkerEvent,
  WorkerEventType,
  WorkerInternalErrorEvent,
  WorkerMessageEvent,
  WorkerTerminationEvent
} from "../types/master"
import { WorkerInitMessage, WorkerUncaughtErrorMessage } from "../types/messages"
import { WorkerFunction, WorkerModule } from "../types/worker"
import { createProxyFunction, createProxyModule } from "./invocation-proxy"

type ArbitraryWorkerInterface = WorkerFunction & WorkerModule<string> & { somekeythatisneverusedinproductioncode123: "magicmarker123" }
type ArbitraryFunctionOrModuleThread = FunctionThread<any, any> & ModuleThread<any>

type ExposedToThreadType<Exposed extends WorkerFunction | WorkerModule<any>> =
  Exposed extends ArbitraryWorkerInterface
  ? ArbitraryFunctionOrModuleThread
  : Exposed extends WorkerFunction
  ? FunctionThread<Parameters<Exposed>, StripAsync<ReturnType<Exposed>>>
  : Exposed extends WorkerModule<any>
  ? ModuleThread<Exposed>
  : never

type StripAsync<Type> =
  Type extends Promise<infer PromiseBaseType>
  ? PromiseBaseType
  : Type extends Observable<infer ObservableBaseType>
  ? ObservableBaseType
  : Type

const debugMessages = DebugLogger("threads:master:messages")
const debugSpawn = DebugLogger("threads:master:spawn")
const debugThreadUtils = DebugLogger("threads:master:thread-utils")

const isInitMessage = (data: any): data is WorkerInitMessage => data && data.type === ("init" as const)
const isUncaughtErrorMessage = (data: any): data is WorkerUncaughtErrorMessage => data && data.type === ("uncaughtError" as const)

const initMessageTimeout = typeof process !== "undefined" && process.env.THREADS_WORKER_INIT_TIMEOUT
  ? Number.parseInt(process.env.THREADS_WORKER_INIT_TIMEOUT, 10)
  : 10000

async function withTimeout<T>(promise: Promise<T>, timeoutInMs: number, errorMessage: string): Promise<T> {
  const timeout = new Promise<never>((resolve, reject) => {
    setTimeout(() => reject(Error(errorMessage)), timeoutInMs)
  })
  const result = await Promise.race([
    promise,
    timeout
  ])
  return result
}

function receiveInitMessage(worker: WorkerType): Promise<WorkerInitMessage> {
  return new Promise((resolve, reject) => {
    const messageHandler = ((event: MessageEvent) => {
      debugMessages("Message from worker before finishing initialization:", event.data)
      if (isInitMessage(event.data)) {
        worker.removeEventListener("message", messageHandler)
        resolve(event.data)
      } else if (isUncaughtErrorMessage(event.data)) {
        worker.removeEventListener("message", messageHandler)
        reject(rehydrateError(event.data.error))
      }
    }) as EventListener
    worker.addEventListener("message", messageHandler)
  })
}

function createEventObservable(worker: WorkerType, workerTermination: Promise<any>): Observable<WorkerEvent> {
  return new Observable<WorkerEvent>(observer => {
    const messageHandler = ((messageEvent: MessageEvent) => {
      const workerEvent: WorkerMessageEvent<any> = {
        type: WorkerEventType.message,
        data: messageEvent.data
      }
      observer.next(workerEvent)
    }) as EventListener
    const rejectionHandler = ((errorEvent: PromiseRejectionEvent) => {
      debugThreadUtils("Unhandled promise rejection event in thread:", errorEvent)
      const workerEvent: WorkerInternalErrorEvent = {
        type: WorkerEventType.internalError,
        error: Error(errorEvent.reason)
      }
      observer.next(workerEvent)
    }) as EventListener
    worker.addEventListener("message", messageHandler)
    worker.addEventListener("unhandledrejection", rejectionHandler)

    workerTermination.then(() => {
      const terminationEvent: WorkerTerminationEvent = {
        type: WorkerEventType.termination
      }
      worker.removeEventListener("message", messageHandler)
      worker.removeEventListener("unhandledrejection", rejectionHandler)
      observer.next(terminationEvent)
      observer.complete()
    })
  })
}

function createTerminator(worker: WorkerType): { termination: Promise<void>, terminate: () => Promise<void> } {
  const [termination, resolver] = createPromiseWithResolver<void>()
  const terminate = async () => {
    debugThreadUtils("Terminating worker")
    // FIXME: Use worker.terminate() callback if it's a node worker thread
    worker.terminate()
    resolver()
  }
  return { terminate, termination }
}

function setPrivateThreadProps<T>(raw: T, worker: WorkerType, workerEvents: Observable<WorkerEvent>, terminate: () => Promise<void>): T & PrivateThreadProps {
  const workerErrors = workerEvents
    .filter(event => event.type === WorkerEventType.internalError)
    .map(errorEvent => (errorEvent as WorkerInternalErrorEvent).error)

  // tslint:disable-next-line prefer-object-spread
  return Object.assign(raw, {
    [$errors]: workerErrors,
    [$events]: workerEvents,
    [$terminate]: terminate,
    [$worker]: worker
  })
}

export async function spawn<Exposed extends WorkerFunction | WorkerModule<any> = ArbitraryWorkerInterface>(
  worker: WorkerType
): Promise<ExposedToThreadType<Exposed>> {
  debugSpawn("Initializing new thread")

  const initMessage = await withTimeout(receiveInitMessage(worker), initMessageTimeout, `Timeout: Did not receive an init message from worker after ${initMessageTimeout}ms. Make sure the worker calls expose().`)
  const exposed = initMessage.exposed

  const { termination, terminate } = createTerminator(worker)
  const events = createEventObservable(worker, termination)

  if (exposed.type === "function") {
    const proxy = createProxyFunction(worker)
    return setPrivateThreadProps(proxy, worker, events, terminate) as ExposedToThreadType<Exposed>
  } else if (exposed.type === "module") {
    const proxy = createProxyModule(worker, exposed.methods)
    return setPrivateThreadProps(proxy, worker, events, terminate) as ExposedToThreadType<Exposed>
  } else {
    const type = (exposed as WorkerInitMessage["exposed"]).type
    throw Error(`Worker init message states unexpected type of expose(): ${type}`)
  }
}

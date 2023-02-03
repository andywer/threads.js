import isSomeObservable from "is-observable"
import { Observable, Subscription } from "observable-fns"
import { deserialize, serialize } from "../common"
import { isTransferDescriptor, TransferDescriptor } from "../transferable"
import {
  MasterJobCancelMessage,
  MasterJobRunMessage,
  MasterMessageType,
  SerializedError,
  WorkerInitMessage,
  WorkerJobErrorMessage,
  WorkerJobResultMessage,
  WorkerJobStartMessage,
  WorkerMessageType,
  WorkerUncaughtErrorMessage
} from "../types/messages"
import { WorkerFunction, WorkerModule } from "../types/worker"
import Implementation from "./implementation"

export { registerSerializer } from "../common"
export { Transfer } from "../transferable"

/** Returns `true` if this code is currently running in a worker. */
export const isWorkerRuntime = Implementation.isWorkerRuntime

let exposeCalled = false

const activeSubscriptions = new Map<number, Subscription<any>>()

const isMasterJobCancelMessage = (thing: any): thing is MasterJobCancelMessage => thing && thing.type === MasterMessageType.cancel
const isMasterJobRunMessage = (thing: any): thing is MasterJobRunMessage => thing && thing.type === MasterMessageType.run

/**
 * There are issues with `is-observable` not recognizing zen-observable's instances.
 * We are using `observable-fns`, but it's based on zen-observable, too.
 */
const isObservable = (thing: any): thing is Observable<any> => isSomeObservable(thing) || isZenObservable(thing)

function isZenObservable(thing: any): thing is Observable<any> {
  return thing && typeof thing === "object" && typeof thing.subscribe === "function"
}

function deconstructTransfer(thing: any) {
  return isTransferDescriptor(thing)
    ? { payload: thing.send, transferables: thing.transferables }
    : { payload: thing, transferables: undefined }
}

function postFunctionInitMessage(context: any) {
  const initMessage: WorkerInitMessage = {
    type: WorkerMessageType.init,
    exposed: {
      type: "function"
    }
  }
  Implementation.postMessageToMaster(context, initMessage)
}

function postModuleInitMessage(context: any, methodNames: string[]) {
  const initMessage: WorkerInitMessage = {
    type: WorkerMessageType.init,
    exposed: {
      type: "module",
      methods: methodNames
    }
  }
  Implementation.postMessageToMaster(context, initMessage)
}

function postJobErrorMessage(context: any, uid: number, rawError: Error | TransferDescriptor<Error>) {
  const { payload: error, transferables } = deconstructTransfer(rawError)
  const errorMessage: WorkerJobErrorMessage = {
    type: WorkerMessageType.error,
    uid,
    error: serialize(error) as any as SerializedError
  }
  Implementation.postMessageToMaster(context, errorMessage, transferables)
}

function postJobResultMessage(context: any, uid: number, completed: boolean, resultValue?: any) {
  const { payload, transferables } = deconstructTransfer(resultValue)
  const resultMessage: WorkerJobResultMessage = {
    type: WorkerMessageType.result,
    uid,
    complete: completed ? true : undefined,
    payload
  }
  Implementation.postMessageToMaster(context, resultMessage, transferables)
}

function postJobStartMessage(context: any, uid: number, resultType: WorkerJobStartMessage["resultType"]) {
  const startMessage: WorkerJobStartMessage = {
    type: WorkerMessageType.running,
    uid,
    resultType
  }
  Implementation.postMessageToMaster(context, startMessage)
}

function postUncaughtErrorMessage(context: any, error: Error) {
  try {
    const errorMessage: WorkerUncaughtErrorMessage = {
      type: WorkerMessageType.uncaughtError,
      error: serialize(error) as any as SerializedError
    }
    Implementation.postMessageToMaster(context, errorMessage)
  } catch (subError) {
    // tslint:disable-next-line no-console
    console.error(
      "Not reporting uncaught error back to master thread as it " +
      "occured while reporting an uncaught error already." +
      "\nLatest error:", subError,
      "\nOriginal error:", error
    )
  }
}

async function runFunction(context: any, jobUID: number, fn: WorkerFunction, args: any[]) {
  let syncResult: any

  try {
    syncResult = fn(...args)
  } catch (error) {
    return postJobErrorMessage(context, jobUID, error)
  }

  const resultType = isObservable(syncResult) ? "observable" : "promise"
  postJobStartMessage(context, jobUID, resultType)

  if (isObservable(syncResult)) {
    const subscription = syncResult.subscribe(
      value => postJobResultMessage(context, jobUID, false, serialize(value)),
      error => {
        postJobErrorMessage(context, jobUID, serialize(error) as any)
        activeSubscriptions.delete(jobUID)
      },
      () => {
        postJobResultMessage(context, jobUID, true)
        activeSubscriptions.delete(jobUID)
      }
    )
    activeSubscriptions.set(jobUID, subscription)
  } else {
    try {
      const result = await syncResult
      postJobResultMessage(context, jobUID, true, serialize(result))
    } catch (error) {
      postJobErrorMessage(context, jobUID, serialize(error) as any)
    }
  }
}

/**
 * Expose a function or a module (an object whose values are functions)
 * to the main thread. Must be called exactly once in every worker thread
 * to signal its API to the main thread.
 *
 * @param exposed Function or object whose values are functions
 */
export function expose(exposed: WorkerFunction | WorkerModule<any>) {
  if (!Implementation.isWorkerRuntime()) {
    throw Error("expose() called in the master thread.")
  }
  if (exposeCalled) {
    throw Error("expose() called more than once. This is not possible. Pass an object to expose() if you want to expose multiple functions.")
  }
  exposeCalled = true

  const innerExpose = (workerContext: any) => {
    if (typeof exposed === "function") {
      Implementation.subscribeToMasterMessages(workerContext, (context, messageData) => {
        if (isMasterJobRunMessage(messageData) && !messageData.method) {
          runFunction(context, messageData.uid, exposed, messageData.args.map(deserialize))
        }
      })
      postFunctionInitMessage(workerContext)
    } else if (typeof exposed === "object" && exposed) {
      Implementation.subscribeToMasterMessages(workerContext, (context, messageData) => {
        if (isMasterJobRunMessage(messageData) && messageData.method) {
          runFunction(context, messageData.uid, exposed[messageData.method], messageData.args.map(deserialize))
        }
      })

      const methodNames = Object.keys(exposed).filter(key => typeof exposed[key] === "function")
      postModuleInitMessage(workerContext, methodNames)
    } else {
      throw Error(`Invalid argument passed to expose(). Expected a function or an object, got: ${exposed}`)
    }

    Implementation.subscribeToMasterMessages(workerContext, (context, messageData) => {
      if (isMasterJobCancelMessage(messageData)) {
        const jobUID = messageData.uid
        const subscription = activeSubscriptions.get(jobUID)

        if (subscription) {
          subscription.unsubscribe()
          activeSubscriptions.delete(jobUID)
        }
      }
    })
  }

  // If it's a SharedWorker
  // TODO: make a better check, make sure it works properly, etc
  if (typeof (self as any).onconnect === "function") {
    (self as any).onconnect = (e: any) => {
      const port = e.ports[0]
      port.start()

      innerExpose(port)

      // TODO: it somehow needs to handle the port closing, but apparently that isn't so simple...
    }
  }
  else innerExpose(self)
}

// TODO: will this work with SharedWorker?
if (typeof self !== "undefined" && typeof self.addEventListener === "function" && Implementation.isWorkerRuntime()) {
  self.addEventListener("error", event => {
    // Post with some delay, so the master had some time to subscribe to messages
    setTimeout(() => postUncaughtErrorMessage(self, event.error || event), 250)
  })
  self.addEventListener("unhandledrejection", event => {
    const error = (event as any).reason
    if (error && typeof (error as any).message === "string") {
      // Post with some delay, so the master had some time to subscribe to messages
      setTimeout(() => postUncaughtErrorMessage(self, error), 250)
    }
  })
}

if (typeof process !== "undefined" && typeof process.on === "function" && Implementation.isWorkerRuntime()) {
  process.on("uncaughtException", (error) => {
    // Post with some delay, so the master had some time to subscribe to messages
    setTimeout(() => postUncaughtErrorMessage(self, error), 250)
  })
  process.on("unhandledRejection", (error) => {
    if (error && typeof (error as any).message === "string") {
      // Post with some delay, so the master had some time to subscribe to messages
      setTimeout(() => postUncaughtErrorMessage(self, error as any), 250)
    }
  })
}

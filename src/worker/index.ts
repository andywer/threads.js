import isSomeObservable from "is-observable"
import Observable from "zen-observable"
import { serializeError } from "../common"
import { isTransferDescriptor, TransferDescriptor } from "../transferable"
import {
  MasterJobRunMessage,
  MasterMessageType,
  WorkerInitMessage,
  WorkerJobErrorMessage,
  WorkerJobResultMessage,
  WorkerJobStartMessage,
  WorkerMessageType,
  WorkerUncaughtErrorMessage
} from "../types/messages"
import { WorkerFunction, WorkerModule } from "../types/worker"
import Implementation from "./implementation"

export { Transfer } from "../transferable"

let exposeCalled = false

const isMasterJobRunMessage = (thing: any): thing is MasterJobRunMessage => thing && thing.type === MasterMessageType.run

/** There are issues with `is-observable` not recognizing zen-observable's instances */
const isObservable = (thing: any): thing is Observable<any> => isSomeObservable(thing) || isZenObservable(thing)

function isZenObservable(thing: any): thing is Observable<any> {
  return thing && typeof thing === "object" && typeof thing.subscribe === "function"
}

function deconstructTransfer(thing: any) {
  return isTransferDescriptor(thing)
    ? { payload: thing.send, transferables: thing.transferables }
    : { payload: thing, transferables: undefined }
}

function postFunctionInitMessage() {
  const initMessage: WorkerInitMessage = {
    type: WorkerMessageType.init,
    exposed: {
      type: "function"
    }
  }
  Implementation.postMessageToMaster(initMessage)
}

function postModuleInitMessage(methodNames: string[]) {
  const initMessage: WorkerInitMessage = {
    type: WorkerMessageType.init,
    exposed: {
      type: "module",
      methods: methodNames
    }
  }
  Implementation.postMessageToMaster(initMessage)
}

function postJobErrorMessage(uid: number, rawError: Error | TransferDescriptor<Error>) {
  const { payload: error, transferables } = deconstructTransfer(rawError)
  const errorMessage: WorkerJobErrorMessage = {
    type: WorkerMessageType.error,
    uid,
    error: serializeError(error)
  }
  Implementation.postMessageToMaster(errorMessage, transferables)
}

function postJobResultMessage(uid: number, completed: boolean, resultValue?: any) {
  const { payload, transferables } = deconstructTransfer(resultValue)
  const startMessage: WorkerJobResultMessage = {
    type: WorkerMessageType.result,
    uid,
    complete: completed ? true : undefined,
    payload
  }
  Implementation.postMessageToMaster(startMessage, transferables)
}

function postJobStartMessage(uid: number, resultType: WorkerJobStartMessage["resultType"]) {
  const startMessage: WorkerJobStartMessage = {
    type: WorkerMessageType.running,
    uid,
    resultType
  }
  Implementation.postMessageToMaster(startMessage)
}

function postUncaughtErrorMessage(error: Error) {
  const errorMessage: WorkerUncaughtErrorMessage = {
    type: WorkerMessageType.uncaughtError,
    error: serializeError(error)
  }
  Implementation.postMessageToMaster(errorMessage)
}

async function runFunction(jobUID: number, fn: WorkerFunction, args: any[]) {
  let syncResult: any

  try {
    syncResult = fn(...args)
  } catch (error) {
    return postJobErrorMessage(jobUID, error)
  }

  const resultType = isObservable(syncResult) ? "observable" : "promise"
  postJobStartMessage(jobUID, resultType)

  if (isObservable(syncResult)) {
    syncResult.subscribe(
      value => postJobResultMessage(jobUID, false, value),
      error => postJobErrorMessage(jobUID, error),
      () => postJobResultMessage(jobUID, true)
    )
  } else {
    try {
      const result = await syncResult
      postJobResultMessage(jobUID, true, result)
    } catch (error) {
      postJobErrorMessage(jobUID, error)
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

  if (typeof exposed === "function") {
    Implementation.subscribeToMasterMessages(messageData => {
      if (isMasterJobRunMessage(messageData) && !messageData.method) {
        runFunction(messageData.uid, exposed, messageData.args)
      }
    })
    postFunctionInitMessage()
  } else if (typeof exposed === "object" && exposed) {
    Implementation.subscribeToMasterMessages(messageData => {
      if (isMasterJobRunMessage(messageData) && messageData.method) {
        runFunction(messageData.uid, exposed[messageData.method], messageData.args)
      }
    })

    const methodNames = Object.keys(exposed).filter(key => typeof exposed[key] === "function")
    postModuleInitMessage(methodNames)
  } else {
    throw Error(`Invalid argument passed to expose(). Expected a function or an object, got: ${exposed}`)
  }
}

if (typeof self !== "undefined" && typeof self.addEventListener === "function") {
  self.addEventListener("error", event => {
    // Post with some delay, so the master had some time to subscribe to messages
    setTimeout(() => postUncaughtErrorMessage(event.error), 250)
  })
  self.addEventListener("unhandledrejection", event => {
    const error = (event as any).reason
    if (error && typeof (error as any).message === "string") {
      // Post with some delay, so the master had some time to subscribe to messages
      setTimeout(() => postUncaughtErrorMessage(error), 250)
    }
  })
}

if (typeof process !== "undefined") {
  process.on("uncaughtException", (error) => {
    // Post with some delay, so the master had some time to subscribe to messages
    setTimeout(() => postUncaughtErrorMessage(error), 250)
  })
  process.on("unhandledRejection", (error) => {
    if (error && typeof (error as any).message === "string") {
      // Post with some delay, so the master had some time to subscribe to messages
      setTimeout(() => postUncaughtErrorMessage(error as any), 250)
    }
  })
}

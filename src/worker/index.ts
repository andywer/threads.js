import DebugLogger from "debug"
import { handleCallCancellations, handleFunctionInvocations } from "../common/call-proxy"
import { Callback, SingleExposedCallback } from "../common/callbacks"
import { getRegisteredSerializer, serialize } from "../common/serialization"
import { WorkerInitMessage, WorkerMessageType, WorkerUncaughtErrorMessage } from "../types/messages"
import { SerializedError } from "../types/serializers"
import { WorkerFunction, WorkerModule } from "../types/worker"
import Implementation from "./implementation"

export { Callback } from "../common/callbacks"
export { registerSerializer } from "../common/serialization"
export { Transfer } from "../common/transferable"

/** Returns `true` if this code is currently running in a worker. */
export const isWorkerRuntime = Implementation.isWorkerRuntime

let exposeCalled = false

const debugIncomingMessages = DebugLogger("threads:worker:messages")

function postFunctionInitMessage() {
  const initMessage: WorkerInitMessage = {
    type: WorkerMessageType.init,
    exposed: {
      type: "function"
    }
  }
  Implementation.postMessage(initMessage)
}

function postModuleInitMessage(methods: Record<string, number>) {
  const initMessage: WorkerInitMessage = {
    type: WorkerMessageType.init,
    exposed: {
      type: "module",
      methods
    }
  }
  Implementation.postMessage(initMessage)
}

function postUncaughtErrorMessage(error: Error) {
  try {
    const errorMessage: WorkerUncaughtErrorMessage = {
      type: WorkerMessageType.uncaughtError,
      error: serialize(error) as any as SerializedError
    }
    Implementation.postMessage(errorMessage)
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
    SingleExposedCallback(exposed)
    handleFunctionInvocations(Implementation, getRegisteredSerializer(), debugIncomingMessages)
    postFunctionInitMessage()
  } else if (typeof exposed === "object" && exposed) {
    const methods = Object.keys(exposed).reduce<Record<string, number>>(
      (reduced, methodName) => {
        const callback = Callback(exposed[methodName])
        return { ...reduced, [methodName]: callback.id }
      },
      {}
    )
    handleFunctionInvocations(Implementation, getRegisteredSerializer(), debugIncomingMessages)
    postModuleInitMessage(methods)
  } else {
    throw Error(`Invalid argument passed to expose(). Expected a function or an object, got: ${exposed}`)
  }

  handleCallCancellations(Implementation, debugIncomingMessages)
}

if (typeof self !== "undefined" && typeof self.addEventListener === "function" && Implementation.isWorkerRuntime()) {
  self.addEventListener("error", event => {
    // Post with some delay, so the master had some time to subscribe to messages
    setTimeout(() => postUncaughtErrorMessage(event.error || event), 250)
  })
  self.addEventListener("unhandledrejection", event => {
    const error = (event as any).reason
    if (error && typeof (error as any).message === "string") {
      // Post with some delay, so the master had some time to subscribe to messages
      setTimeout(() => postUncaughtErrorMessage(error), 250)
    }
  })
}

if (typeof process !== "undefined" && typeof process.on === "function" && Implementation.isWorkerRuntime()) {
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

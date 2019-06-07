// tslint:disable no-shadowed-variable
import { MessagePort } from "worker_threads"
import * as WorkerThreads from "../worker_threads"
import { AbstractedWorkerAPI } from "../types/worker"

function assertMessagePort(port: MessagePort | null | undefined): MessagePort {
  if (!port) {
    throw Error("Invariant violation: MessagePort to parent is not available.")
  }
  return port
}

const isWorkerRuntime: AbstractedWorkerAPI["isWorkerRuntime"] = function isWorkerRuntime() {
  return !WorkerThreads.isMainThread
}

const postMessageToMaster: AbstractedWorkerAPI["postMessageToMaster"] = function postMessageToMaster(data, transferList) {
  assertMessagePort(WorkerThreads.parentPort).postMessage(data, transferList as any)
}

const subscribeToMasterMessages: AbstractedWorkerAPI["subscribeToMasterMessages"] = function subscribeToMasterMessages(onMessage) {
  if (!WorkerThreads.parentPort) {
    throw Error("Invariant violation: MessagePort to parent is not available.")
  }
  const messageHandler = (message: any) => {
    onMessage(message)
  }
  const unsubscribe = () => {
    assertMessagePort(WorkerThreads.parentPort).off("message", messageHandler)
  }
  assertMessagePort(WorkerThreads.parentPort).on("message", messageHandler)
  return unsubscribe
}

export default {
  isWorkerRuntime,
  postMessageToMaster,
  subscribeToMasterMessages
}

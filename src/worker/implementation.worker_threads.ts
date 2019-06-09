// tslint:disable no-shadowed-variable
import { MessagePort, isMainThread, parentPort } from "worker_threads"
import { AbstractedWorkerAPI } from "../types/worker"

function assertMessagePort(port: MessagePort | null | undefined): MessagePort {
  if (!port) {
    throw Error("Invariant violation: MessagePort to parent is not available.")
  }
  return port
}

const isWorkerRuntime: AbstractedWorkerAPI["isWorkerRuntime"] = function isWorkerRuntime() {
  return !isMainThread
}

const postMessageToMaster: AbstractedWorkerAPI["postMessageToMaster"] = function postMessageToMaster(data, transferList) {
  assertMessagePort(parentPort).postMessage(data, transferList as any)
}

const subscribeToMasterMessages: AbstractedWorkerAPI["subscribeToMasterMessages"] = function subscribeToMasterMessages(onMessage) {
  if (!parentPort) {
    throw Error("Invariant violation: MessagePort to parent is not available.")
  }
  const messageHandler = (message: any) => {
    onMessage(message)
  }
  const unsubscribe = () => {
    assertMessagePort(parentPort).off("message", messageHandler)
  }
  assertMessagePort(parentPort).on("message", messageHandler)
  return unsubscribe
}

export = {
  isWorkerRuntime,
  postMessageToMaster,
  subscribeToMasterMessages
}

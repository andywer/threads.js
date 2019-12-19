// tslint:disable no-shadowed-variable
import { MessagePort } from "worker_threads"
import { AbstractedWorkerAPI } from "../types/worker"
import WorkerThreads from "../worker_threads"

function assertMessagePort(port: MessagePort | null | undefined): MessagePort {
  if (!port) {
    throw Error("Invariant violation: MessagePort to parent is not available.")
  }
  return port
}

const isWorkerRuntime: AbstractedWorkerAPI["isWorkerRuntime"] = function isWorkerRuntime() {
  return !WorkerThreads().isMainThread
}

const postMessageToMaster: AbstractedWorkerAPI["postMessageToMaster"] = function postMessageToMaster(data, transferList) {
  assertMessagePort(WorkerThreads().parentPort).postMessage(data, transferList as any)
}

const subscribeToMasterMessages: AbstractedWorkerAPI["subscribeToMasterMessages"] = function subscribeToMasterMessages(onMessage) {
  const parentPort = WorkerThreads().parentPort

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

function testImplementation() {
  // Will throw if `worker_threads` are not available
  WorkerThreads()
}

export default {
  isWorkerRuntime,
  postMessageToMaster,
  subscribeToMasterMessages,
  testImplementation
}

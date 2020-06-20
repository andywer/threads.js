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

const postMessage: AbstractedWorkerAPI["postMessage"] = function postMessage(data, transferList) {
  assertMessagePort(WorkerThreads().parentPort).postMessage(data, transferList as any)
}

function testImplementation() {
  // Will throw if `worker_threads` are not available
  WorkerThreads()
}

const Implementation: AbstractedWorkerAPI & { testImplementation: typeof testImplementation } = {
  addEventListener(event: string, listener: (arg: any) => any) {
    const port = assertMessagePort(WorkerThreads().parentPort)
    return event === "message"
      ? port.on(event, (data) => listener({ data }))
      : port.on(event, listener)
  },
  removeEventListener(event, listener) {
    const port = assertMessagePort(WorkerThreads().parentPort)
    return port.off(event, listener)
  },
  isWorkerRuntime,
  postMessage,
  testImplementation
}

export default Implementation

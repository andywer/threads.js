/// <reference lib="dom" />
// tslint:disable no-shadowed-variable

import { AbstractedWorkerAPI } from "../types/worker"
import { multiplexEventTarget } from "../util/events"

interface WorkerGlobalScope {
  addEventListener(eventName: string, listener: (event: Event) => void): void
  postMessage(message: any, transferables?: any[]): void
  removeEventListener(eventName: string, listener: (event: Event) => void): void
}

declare const self: WorkerGlobalScope

if (typeof self === "undefined") {
  (global as any).self = global
}

const isWorkerRuntime: AbstractedWorkerAPI["isWorkerRuntime"] = function isWorkerRuntime() {
  return typeof self !== "undefined" && self.postMessage ? true : false
}

const postMessage: AbstractedWorkerAPI["postMessage"] = function postMessage(data) {
  // TODO: Warn that Transferables are not supported on first attempt to use feature
  self.postMessage(data)
}

const Implementation: AbstractedWorkerAPI = {
  ...(multiplexEventTarget(self) as Pick<AbstractedWorkerAPI, "addEventListener" | "removeEventListener">),
  isWorkerRuntime,
  postMessage
}

export default Implementation

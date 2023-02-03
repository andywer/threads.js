/// <reference lib="dom" />
// tslint:disable no-shadowed-variable

import { AbstractedWorkerAPI } from "../types/worker"

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
  return typeof self !== "undefined" && typeof self.postMessage === "function" ? true : false
}

const postMessageToMaster: AbstractedWorkerAPI["postMessageToMaster"] = function postMessageToMaster(context, data) {
  // TODO: Warn that Transferables are not supported on first attempt to use feature
  context.postMessage(data)
}

let muxingHandlerSetUp = false
const messageHandlers = new Set<(context: any, data: any) => void>()

const subscribeToMasterMessages: AbstractedWorkerAPI["subscribeToMasterMessages"] = function subscribeToMasterMessages(context, onMessage) {
  if (!muxingHandlerSetUp) {
    // We have one multiplexing message handler as tiny-worker's
    // addEventListener() only allows you to set a single message handler
    self.addEventListener("message", ((event: MessageEvent) => {
      messageHandlers.forEach(handler => handler(context, event.data))
    }) as EventListener)
    muxingHandlerSetUp = true
  }

  messageHandlers.add(onMessage)

  const unsubscribe = () => messageHandlers.delete(onMessage)
  return unsubscribe
}

export default {
  isWorkerRuntime,
  postMessageToMaster,
  subscribeToMasterMessages
}

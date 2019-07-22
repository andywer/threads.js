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
  return typeof self !== "undefined" && self.postMessage ? true : false
}

const postMessageToMaster: AbstractedWorkerAPI["postMessageToMaster"] = function postMessageToMaster(data) {
  // TODO: Warn that Transferables are not supported on first attempt to use feature
  self.postMessage(data)
}

const subscribeToMasterMessages: AbstractedWorkerAPI["subscribeToMasterMessages"] = function subscribeToMasterMessages(onMessage) {
  const messageHandler = (messageEvent: MessageEvent) => {
    onMessage(messageEvent.data)
  }
  const unsubscribe = () => {
    self.removeEventListener("message", messageHandler as EventListener)
  }
  self.addEventListener("message", messageHandler as EventListener)
  return unsubscribe
}

export default {
  isWorkerRuntime,
  postMessageToMaster,
  subscribeToMasterMessages
}

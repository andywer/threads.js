/// <reference lib="dom" />
// tslint:disable no-shadowed-variable

import { AbstractedWorkerAPI } from "../types/worker"

interface WorkerGlobalScope {
  addEventListener(eventName: string, listener: (event: Event) => void): void
  postMessage(message: any, transferables?: any[]): void
  removeEventListener(eventName: string, listener: (event: Event) => void): void
  port?: WorkerGlobalScope & { start: () => void }
}

declare const self: WorkerGlobalScope

const isWorkerRuntime: AbstractedWorkerAPI["isWorkerRuntime"] = function isWorkerRuntime() {
  const isWindowContext = typeof self !== "undefined" && typeof Window !== "undefined" && self instanceof Window
  const port = self.port || self;

  return typeof self !== "undefined" && port.postMessage && !isWindowContext ? true : false
}

const postMessageToMaster: AbstractedWorkerAPI["postMessageToMaster"] = function postMessageToMaster(data, transferList?) {
  const port = self.port || self;

  port.postMessage(data, transferList || [])
}

const subscribeToMasterMessages: AbstractedWorkerAPI["subscribeToMasterMessages"] = function subscribeToMasterMessages(onMessage) {
  const port = self.port || self;
  const messageHandler = (messageEvent: MessageEvent) => {
    onMessage(messageEvent.data)
  }

  // TODO: Handle onconnect here somehow!
  if (self.port) {
    // @ts-ignore TODO: Testing for now
    const connectHandler = (e) => {
      const port = e.ports[0];

      port.addEventListener('message', (messageEvent: MessageEvent) => {
        port.onMessage(messageEvent.data)
      });

      port.start();
    }

    self.port.addEventListener('connect', connectHandler)

    // TODO: Does this need unsubscription too?
    return () => {};
  }

  const unsubscribe = () => {
    port.removeEventListener("message", messageHandler as EventListener)
  }
  port.addEventListener("message", messageHandler as EventListener)

  return unsubscribe
}

export default {
  isWorkerRuntime,
  postMessageToMaster,
  subscribeToMasterMessages
}

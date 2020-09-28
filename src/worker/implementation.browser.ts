/// <reference lib="dom" />
// tslint:disable no-shadowed-variable

import { MessageRelay } from "../types/common"
import { AbstractedWorkerAPI } from "../types/worker"
import { multiplexEventTarget } from "../util/events"

interface WorkerGlobalScope {
  addEventListener(eventName: string, listener: (event: Event) => void): void
  postMessage(message: any, transferables?: any[]): void
  removeEventListener(eventName: string, listener: (event: Event) => void): void
}

declare const self: WorkerGlobalScope

const isWorkerRuntime: AbstractedWorkerAPI["isWorkerRuntime"] = function isWorkerRuntime() {
  const isWindowContext = typeof self !== "undefined" && typeof Window !== "undefined" && self instanceof Window
  return typeof self !== "undefined" && self.postMessage && !isWindowContext ? true : false
}

const postMessage: AbstractedWorkerAPI["postMessage"] = function postMessageToMaster(data, transferList?) {
  self.postMessage(data, transferList)
}

let muxedSelfEvents: Pick<EventTarget, "addEventListener" | "removeEventListener"> | undefined

const Implementation: AbstractedWorkerAPI = {
  addEventListener(event: string, handler: (message: any) => any) {
    muxedSelfEvents = muxedSelfEvents || multiplexEventTarget(self)
    return muxedSelfEvents.addEventListener(event, handler)
  },
  removeEventListener(event: string, handler: (message: any) => any) {
    muxedSelfEvents = muxedSelfEvents || multiplexEventTarget(self)
    return muxedSelfEvents.removeEventListener(event, handler)
  },
  isWorkerRuntime,
  postMessage
}

export default Implementation

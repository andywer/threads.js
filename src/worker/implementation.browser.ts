/// <reference no-default-lib="true"/>
/// <reference types="../../types/webworker" />
// tslint:disable no-shadowed-variable

import { AbstractedWorkerAPI } from "../types/worker"

const postMessageToMaster: AbstractedWorkerAPI["postMessageToMaster"] = function postMessageToMaster(data) {
  // TODO: Transferables
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

export = {
  postMessageToMaster,
  subscribeToMasterMessages
}

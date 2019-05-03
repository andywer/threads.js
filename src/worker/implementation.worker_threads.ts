// tslint:disable no-shadowed-variable
import { MessagePort, parentPort } from "worker_threads"
import { AbstractedWorkerAPI } from "../types/worker"

function assertMessagePort(port: MessagePort | null | undefined): MessagePort {
  if (!port) {
    throw Error("Invariant violation: MessagePort to parent is not available.")
  }
  return port
}

const postMessageToMaster: AbstractedWorkerAPI["postMessageToMaster"] = function postMessageToMaster(data) {
  // TODO: Transferables
  assertMessagePort(parentPort).postMessage(data)
}

const subscribeToMasterMessages: AbstractedWorkerAPI["subscribeToMasterMessages"] = function subscribeToMasterMessages(onMessage) {
  if (!parentPort) {
    throw Error("Invariant violation: MessagePort to parent is not available.")
  }
  const messageHandler = (messageEvent: MessageEvent) => {
    onMessage(messageEvent.data)
  }
  const unsubscribe = () => {
    assertMessagePort(parentPort).off("message", messageHandler)
  }
  assertMessagePort(parentPort).on("message", messageHandler)
  return unsubscribe
}

export = {
  postMessageToMaster,
  subscribeToMasterMessages
}

/// <reference lib="dom" />
// tslint:disable no-shadowed-variable

import { AbstractedWorkerAPI } from "../types/worker";

declare const self: SharedWorker;

const isWorkerRuntime: AbstractedWorkerAPI["isWorkerRuntime"] =
  function isWorkerRuntime() {
    const isWindowContext =
      typeof self !== "undefined" &&
      typeof Window !== "undefined" &&
      self instanceof Window;
    return typeof self !== "undefined" &&
      self.port?.postMessage &&
      !isWindowContext
      ? true
      : false;
  };

const postMessageToMaster: AbstractedWorkerAPI["postMessageToMaster"] =
  function postMessageToMaster(data, transferList?) {
    // TODO: Check if this cast is true for shared workers
    self.port.postMessage(data, transferList as PostMessageOptions);
  };

const subscribeToMasterMessages: AbstractedWorkerAPI["subscribeToMasterMessages"] =
  function subscribeToMasterMessages(onMessage) {
    const messageHandler = (messageEvent: MessageEvent) => {
      onMessage(messageEvent.data);
    };
    const unsubscribe = () => {
      self.port.removeEventListener("message", messageHandler as EventListener);
    };
    self.port.addEventListener("message", messageHandler as EventListener);
    self.port.start();
    return unsubscribe;
  };

export default {
  isWorkerRuntime,
  postMessageToMaster,
  subscribeToMasterMessages,
};

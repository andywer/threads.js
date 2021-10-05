/// <reference lib="dom" />
// tslint:disable no-shadowed-variable

import { AbstractedWorkerAPI } from "../types/worker";

// https://developer.mozilla.org/en-US/docs/Web/API/SharedWorker
interface WorkerGlobalScope {
  port: {
    addEventListener(eventName: string, listener: (event: Event) => void): void;
    removeEventListener(
      eventName: string,
      listener: (event: Event) => void
    ): void;
    postMessage(message: any, transferables?: any[]): void;
    start(): void;
  };
}

declare const self: WorkerGlobalScope;

const isWorkerRuntime: AbstractedWorkerAPI["isWorkerRuntime"] =
  function isWorkerRuntime() {
    const isWindowContext =
      typeof self !== "undefined" &&
      typeof Window !== "undefined" &&
      self instanceof Window;
    return typeof self !== "undefined" &&
      self.port.postMessage &&
      !isWindowContext
      ? true
      : false;
  };

const postMessageToMaster: AbstractedWorkerAPI["postMessageToMaster"] =
  function postMessageToMaster(data, transferList?) {
    self.port.postMessage(data, transferList);
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

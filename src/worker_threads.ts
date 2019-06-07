// Webpack hack

declare function __non_webpack_require__(module: string): any

const workerThreads = typeof __non_webpack_require__ === "function"
  ? __non_webpack_require__("worker_threads")
  : eval("require")("worker_threads")

export const MessagePort = workerThreads.MessagePort
export const isMainThread = workerThreads.isMainThread
export const parentPort = workerThreads.parentPort

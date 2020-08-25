import {getWorkerImplementation as getWebWorker} from "./master/implementation.browser"
import {getWorkerImplementation as getNodeWorker } from "./master/implementation.node"

import {
  BlobWorker,
  CreateWorkerOptions,
  WorkerImplementation,
} from "./types/master"

export function createWorker(workerPath: string & Blob, options: CreateWorkerOptions) {
  let WorkerConstructor: typeof WorkerImplementation | typeof BlobWorker
  if (options.backend === "web") {
    WorkerConstructor = options.blob ?
      getWebWorker().blob :
      getWebWorker().default
  } else if (options.backend === "node") {
    WorkerConstructor = options.blob ?
      getNodeWorker("node").blob :
      getNodeWorker("node").default
  } else if (options.backend === "tiny") {
    WorkerConstructor = options.blob ?
      getNodeWorker("tiny").blob :
      getNodeWorker("tiny").default
  } else {
    throw new Error("The worker backend is not supported.")
  }
  return new WorkerConstructor(workerPath, options)
}

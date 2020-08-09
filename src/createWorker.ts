import {getWorkerImplementation as getWebWorker} from "./master/implementation.browser"
import {getWorkerImplementation as getNodeWorker} from "./master/implementation.node"

interface WorkerOptions {
  backend: string
  blob: boolean
}

export function createWorker(workerPath: string, options: WorkerOptions) {
  let WorkerConstructor: any
  if (options.backend === "web") {
    WorkerConstructor = options.blob ?
      getWebWorker().blob :
      getWebWorker().default
  } else if (options.backend === "node") {
    WorkerConstructor = options.blob ?
      getNodeWorker().blob :
      getNodeWorker().default
  } else if (options.backend === "tiny") {
    // TODO
    throw new Error("Tiny worker is not supported using `createWorker` yet.")
  } else {
    throw new Error("The worker backend is not supported.")
  }
  return new WorkerConstructor(workerPath)
}

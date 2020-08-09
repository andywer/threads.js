import * as WebImplementation from "./master/implementation.browser"
import * as NodeImplementation from "./master/implementation.node"

interface WorkerOptions {
  backend: string
  blob: boolean
}

export function createWorker(workerPath: string, options: WorkerOptions) {
  let WorkerConstructor: any
  if (options.backend === "web") {
    WorkerConstructor = options.blob ?
      WebImplementation.getWorkerImplementation().blob :
      WebImplementation.getWorkerImplementation().default
  } else if (options.backend === "node") {
    WorkerConstructor = options.blob ?
      NodeImplementation.getWorkerImplementation().blob :
      NodeImplementation.getWorkerImplementation().default
  } else if (options.backend === "tiny") {
    // TODO
    throw new Error("Tiny worker is not supported using `createWorker` yet.")
  } else {
    throw new Error("The worker backend is not supported.")
  }
  return new WorkerConstructor(workerPath)
}

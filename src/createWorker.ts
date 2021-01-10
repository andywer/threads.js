import {
  BlobWorker,
  CreateWorkerOptions,
  WorkerImplementation,
} from "./types/master"

/** async function to creat a webworker. This function uses dynamic imports to only import the required implementation */
export async function createWorker(workerPath: string & Blob, options: CreateWorkerOptions) {
  let WorkerConstructor: typeof WorkerImplementation | typeof BlobWorker
  if (options.backend === "web") {
    const { getWorkerImplementation } = await import("./master/implementation.browser")
    WorkerConstructor = options.blob ?
      getWorkerImplementation().blob :
      getWorkerImplementation().default
  } else if (options.backend === "node") {
    const { getWorkerImplementation } = await import("./master/implementation.node")
    WorkerConstructor = options.blob ?
      getWorkerImplementation("node").blob :
      getWorkerImplementation("node").default
  } else if (options.backend === "tiny") {
    const { getWorkerImplementation } = await import("./master/implementation.node")
    WorkerConstructor = options.blob ?
      getWorkerImplementation("tiny").blob :
      getWorkerImplementation("tiny").default
  } else {
    throw new Error("The worker backend is not supported.")
  }
  return new WorkerConstructor(workerPath, options)
}

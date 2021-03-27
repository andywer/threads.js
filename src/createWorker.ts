import {
  BlobWorker,
  CreateWorkerOptions,
  WorkerImplementation,
} from "./types/master"

/**
 * async function to creat a webworker. This function uses dynamic imports to only import the required implementation
 * @param workerPath the path or Blob to the worker code
 * @param backend backend for the threads
 * @param {CreateWorkerOptions} options an object that can be used to specify `blob: boolean` or other {WorkerOptions}. Defaults to `{}`.
 */
export async function createWorker(workerPath: string & Blob, backend: "web" | "node" | "tiny", options: CreateWorkerOptions = {}) {
  let WorkerConstructor: typeof WorkerImplementation | typeof BlobWorker
  if (backend === "web") {
    const { getWorkerImplementation } = await import("./master/implementation.browser")
    WorkerConstructor = options.blob ?
      getWorkerImplementation().blob :
      getWorkerImplementation().default
  } else if (backend === "node") {
    const { initWorkerThreadsWorker } = await import("./master/implementation-node")
    WorkerConstructor = options.blob ?
      initWorkerThreadsWorker().blob :
      initWorkerThreadsWorker().default
  } else if (backend === "tiny") {
    const { initTinyWorker } = await import("./master/implementation-node")
    WorkerConstructor = options.blob ?
      initTinyWorker().blob :
      initTinyWorker().default
  } else {
    throw new Error("The worker backend is not supported.")
  }
  return new WorkerConstructor(workerPath, options)
}

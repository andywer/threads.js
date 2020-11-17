// tslint:disable no-duplicate-imports
import type { BlobWorker as BlobWorkerClass } from "../types/master"
import { Worker as WorkerType } from "../types/master"
import { getWorkerImplementation, isWorkerRuntime } from "./implementation"

export { FunctionThread, ModuleThread } from "../types/master"
export { Pool } from "./pool"
export { spawn } from "./spawn"
export { Thread } from "./thread"
export { isWorkerRuntime }

export type BlobWorker = typeof BlobWorkerClass
export type Worker = WorkerType

/** Separate class to spawn workers from source code blobs or strings. */
export const BlobWorker = getWorkerImplementation().blob

/** Worker implementation. Either web worker or a node.js Worker class. */
export const Worker = getWorkerImplementation().default

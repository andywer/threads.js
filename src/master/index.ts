import { Worker as WorkerType } from "../types/master"
import { getWorkerImplementation, isWorkerRuntime } from "./implementation"

export { FunctionThread, ModuleThread } from "../types/master"
export { Pool } from "./pool"
export { spawn } from "./spawn"
export { Thread } from "./thread"
export { isWorkerRuntime }

export type Worker = WorkerType

/** Worker implementation. Either web worker or a node.js Worker class. */
export const Worker = getWorkerImplementation()

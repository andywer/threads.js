// tslint:disable no-var-requires
/*
 * This file is only a stub to make './implementation' resolve to the right module.
 */

import { AbstractedWorkerAPI } from "../types/worker"
import WebWorkerImplementation from "./implementation.browser"
import TinyWorkerImplementation from "./implementation.tiny-worker"
import WorkerThreadsImplementation from "./implementation.worker_threads"

const runningInNode = typeof process !== 'undefined' && process.arch !== 'browser' && 'pid' in process

function selectNodeImplementation(): AbstractedWorkerAPI {
  try {
    WorkerThreadsImplementation.testImplementation()
    return WorkerThreadsImplementation
  } catch (error) {
    return TinyWorkerImplementation
  }
}

export default runningInNode
  ? selectNodeImplementation()
  : WebWorkerImplementation

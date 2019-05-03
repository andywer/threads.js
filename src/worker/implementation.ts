// tslint:disable no-var-requires
/*
 * This file is only a stub to make './implementation' resolve to the right module.
 */

import { AbstractedWorkerAPI } from "../types/worker"

function selectNodeImplementation(): AbstractedWorkerAPI {
  try {
    return require("./implementation.worker_threads")
  } catch (error) {
    return require("./implementation.tiny-worker")
  }
}

export = typeof process !== 'undefined' && process.arch !== 'browser' && 'pid' in process
  ? selectNodeImplementation()
  : require('./implementation.browser') as AbstractedWorkerAPI

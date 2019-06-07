// tslint:disable no-var-requires
/*
 * This file is only a stub to make './implementation' resolve to the right module.
 */

import { WorkerImplementation } from "../types/master"

interface ImplementationExports {
  defaultPoolSize: number
  selectWorkerImplementation(): typeof WorkerImplementation
}

export default typeof process !== 'undefined' && process.arch !== 'browser' && 'pid' in process
  ? require('./implementation.node').default as ImplementationExports
  : require('./implementation.browser').default as ImplementationExports

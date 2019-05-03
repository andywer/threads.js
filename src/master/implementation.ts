// tslint:disable no-var-requires
/*
 * This file is only a stub to make './implementation' resolve to the right module.
 */

import { WorkerImplementation } from "../types/master"

interface ImplementationExports {
  selectWorkerImplementation(): typeof WorkerImplementation
}

export = typeof process !== 'undefined' && process.arch !== 'browser' && 'pid' in process
  ? require('./implementation.node') as ImplementationExports
  : require('./implementation.browser') as ImplementationExports

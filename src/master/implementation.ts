/*
 * This file is only a stub to make './implementation' resolve to the right module.
 */

// We alias `src/master/implementation` to `src/master/implementation.browser` for web
// browsers already in the package.json, so if get here, it's safe to pass-through the
// node implementation

import * as BrowserImplementation from "./implementation.browser"
import * as NodeImplementation from "./implementation.node"

const runningInNode = typeof process !== 'undefined' && process.arch !== 'browser' && 'pid' in process
const implementation = runningInNode ? NodeImplementation : BrowserImplementation

/** Default size of pools. Depending on the platform the value might vary from device to device. */
export const defaultPoolSize = implementation.defaultPoolSize

export const getWorkerImplementation = implementation.getWorkerImplementation

/** Returns `true` if this code is currently running in a worker. */
export const isWorkerRuntime = implementation.isWorkerRuntime

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

export const defaultPoolSize = implementation.defaultPoolSize
export const selectWorkerImplementation = implementation.selectWorkerImplementation

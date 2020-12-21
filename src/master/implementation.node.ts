/// <reference lib="dom" />
// tslint:disable function-constructor no-eval no-duplicate-super max-classes-per-file

import getCallsites, { CallSite } from "callsites"
import { EventEmitter } from "events"
import { cpus } from 'os'
import * as path from "path"
import { fileURLToPath } from "url";
import {
  ImplementationExport,
  ThreadsWorkerOptions,
  WorkerImplementation
} from "../types/master"

interface WorkerGlobalScope {
  addEventListener(eventName: string, listener: (event: Event) => void): void
  postMessage(message: any, transferables?: any[]): void
  removeEventListener(eventName: string, listener: (event: Event) => void): void
}

declare const __non_webpack_require__: typeof require
declare const self: WorkerGlobalScope

type WorkerEventName = "error" | "message"

let tsNodeAvailable: boolean | undefined

export const defaultPoolSize = cpus().length

interface Terminable {
  terminate(this: Terminable): any
}

// Terminates the workers, empties the workers array, and possibly exits.
const onSignal = (workers: Terminable[], signal: string) => {
  // worker.terminate() might return a Promise or might be synchronous. This async helper function
  // creates a consistent interface.
  const terminate = async (worker: Terminable) => worker.terminate()
  Promise.all(workers.map(worker => terminate(worker).catch(() => {}))).then(() => {
    // Adding a signal listener suppresses the default signal handling behavior. That default
    // behavior must be replicated here, but only if the default behavior isn't intentionally
    // suppressed by another signal listener. Unfortunately there is no robust way to determine
    // whether the default behavior was intentionally suppressed, so a heuristic is used. (Note: The
    // 'exit' event is not suitable for terminating workers because it is not emitted when the
    // default signal handler terminates the process.)
    if (process.listenerCount(signal) > 1) {
      // Assume that one of the other signal listeners will take care of calling process.exit().
      // This assumption breaks down if all of the other listeners are making the same assumption.
      return
    }
    // Right now this is the only signal listener, so assume that this listener is to blame for
    // inhibiting the default signal handler. (This assumption fails if the number of listeners
    // changes during signal handling. This can happen if a listener was added by process.once().)
    // Mimic the default behavior, which is to exit with a non-0 code.
    process.exit(1)
  })
  workers.length = 0
}

function detectTsNode() {
  if (typeof __non_webpack_require__ === "function") {
    // Webpack build: => No ts-node required or possible
    return false
  }
  if (tsNodeAvailable) {
    return tsNodeAvailable
  }

  try {
    eval("require").resolve("ts-node")
    tsNodeAvailable = true
  } catch (error) {
    if (error && error.code === "MODULE_NOT_FOUND") {
      tsNodeAvailable = false
    } else {
      // Re-throw
      throw error
    }
  }
  return tsNodeAvailable
}

function createTsNodeModule(scriptPath: string) {
  const content = `
    require("ts-node/register/transpile-only");
    require(${JSON.stringify(scriptPath)});
  `
  return content
}

function rebaseScriptPath(scriptPath: string, ignoreRegex: RegExp) {
  const parentCallSite = getCallsites().find((callsite: CallSite) => {
    const filename = callsite.getFileName()
    return Boolean(
      filename &&
      !filename.match(ignoreRegex) &&
      !filename.match(/[\/\\]master[\/\\]implementation/) &&
      !filename.match(/^internal\/process/)
    )
  })

  const rawCallerPath = parentCallSite ? parentCallSite.getFileName() : null
  let callerPath = rawCallerPath ? rawCallerPath : null;
  if (callerPath && callerPath.startsWith('file:')) {
    callerPath = fileURLToPath(callerPath);
  }
  const rebasedScriptPath = callerPath ? path.join(path.dirname(callerPath), scriptPath) : scriptPath

  return rebasedScriptPath
}

function resolveScriptPath(scriptPath: string, baseURL?: string | undefined) {
  const makeRelative = (filePath: string) => {
    // eval() hack is also webpack-related
    return path.isAbsolute(filePath) ? filePath : path.join(baseURL || eval("__dirname"), filePath)
  }

  const workerFilePath = typeof __non_webpack_require__ === "function"
    ? __non_webpack_require__.resolve(makeRelative(scriptPath))
    : eval("require").resolve(makeRelative(rebaseScriptPath(scriptPath, /[\/\\]worker_threads[\/\\]/)))

  return workerFilePath
}

function initWorkerThreadsWorker(): ImplementationExport {
  // Webpack hack
  const NativeWorker = typeof __non_webpack_require__ === "function"
    ? __non_webpack_require__("worker_threads").Worker
    : eval("require")("worker_threads").Worker

  const allWorkers: Array<typeof NativeWorker> = []

  class Worker extends NativeWorker {
    private mappedEventListeners: WeakMap<EventListener, EventListener>

    constructor(scriptPath: string, options?: ThreadsWorkerOptions & { fromSource: boolean }) {
      const resolvedScriptPath = options && options.fromSource
        ? null
        : resolveScriptPath(scriptPath, (options || {})._baseURL)

      if (!resolvedScriptPath) {
        // `options.fromSource` is true
        const sourceCode = scriptPath
        super(sourceCode, { ...options, eval: true })
      } else if (resolvedScriptPath.match(/\.tsx?$/i) && detectTsNode()) {
        super(createTsNodeModule(resolvedScriptPath), { ...options, eval: true })
      } else if (resolvedScriptPath.match(/\.asar[\/\\]/)) {
        // See <https://github.com/andywer/threads-plugin/issues/17>
        super(resolvedScriptPath.replace(/\.asar([\/\\])/, ".asar.unpacked$1"), options)
      } else {
        super(resolvedScriptPath, options)
      }

      this.mappedEventListeners = new WeakMap()
      allWorkers.push(this)
    }

    public addEventListener(eventName: string, rawListener: EventListener) {
      const listener = (message: any) => {
        rawListener({ data: message } as any)
      }
      this.mappedEventListeners.set(rawListener, listener)
      this.on(eventName, listener)
    }

    public removeEventListener(eventName: string, rawListener: EventListener) {
      const listener = this.mappedEventListeners.get(rawListener) || rawListener
      this.off(eventName, listener)
    }
  }

  // Take care to not leave orphaned processes behind. See #147.
  process.on("SIGINT", (signal) => onSignal(allWorkers, signal))
  process.on("SIGTERM", (signal) => onSignal(allWorkers, signal))

  class BlobWorker extends Worker {
    constructor(blob: Uint8Array, options?: ThreadsWorkerOptions) {
      super(Buffer.from(blob).toString("utf-8"), { ...options, fromSource: true })
    }

    public static fromText(source: string, options?: ThreadsWorkerOptions): WorkerImplementation {
      return new Worker(source, { ...options, fromSource: true }) as any
    }
  }

  return {
    blob: BlobWorker as any,
    default: Worker as any
  }
}

function initTinyWorker(): ImplementationExport {
  const TinyWorker = require("tiny-worker")

  let allWorkers: Array<typeof TinyWorker> = []

  class Worker extends TinyWorker {
    private emitter: EventEmitter

    constructor(scriptPath: string, options?: ThreadsWorkerOptions & { fromSource?: boolean }) {
      // Need to apply a work-around for Windows or it will choke upon the absolute path
      // (`Error [ERR_INVALID_PROTOCOL]: Protocol 'c:' not supported`)
      const resolvedScriptPath = options && options.fromSource
        ? null
        : process.platform === "win32"
          ? `file:///${resolveScriptPath(scriptPath).replace(/\\/g, "/")}`
          : resolveScriptPath(scriptPath)

      if (!resolvedScriptPath) {
        // `options.fromSource` is true
        const sourceCode = scriptPath
        super(new Function(sourceCode), [], { esm: true })
      } else if (resolvedScriptPath.match(/\.tsx?$/i) && detectTsNode()) {
        super(new Function(createTsNodeModule(resolveScriptPath(scriptPath))), [], { esm: true })
      } else if (resolvedScriptPath.match(/\.asar[\/\\]/)) {
        // See <https://github.com/andywer/threads-plugin/issues/17>
        super(resolvedScriptPath.replace(/\.asar([\/\\])/, ".asar.unpacked$1"), [], { esm: true })
      } else {
        super(resolvedScriptPath, [], { esm: true })
      }

      allWorkers.push(this)

      this.emitter = new EventEmitter()
      this.onerror = (error: Error) => this.emitter.emit("error", error)
      this.onmessage = (message: MessageEvent) => this.emitter.emit("message", message)
    }

    public addEventListener(eventName: WorkerEventName, listener: EventListener) {
      this.emitter.addListener(eventName, listener)
    }

    public removeEventListener(eventName: WorkerEventName, listener: EventListener) {
      this.emitter.removeListener(eventName, listener)
    }

    public terminate() {
      allWorkers = allWorkers.filter(worker => worker !== this)
      return super.terminate()
    }
  }

  // Take care to not leave orphaned processes behind
  // See <https://github.com/avoidwork/tiny-worker#faq>
  process.on("SIGINT", (signal) => onSignal(allWorkers, signal))
  process.on("SIGTERM", (signal) => onSignal(allWorkers, signal))

  class BlobWorker extends Worker {
    constructor(blob: Uint8Array, options?: ThreadsWorkerOptions) {
      super(Buffer.from(blob).toString("utf-8"), { ...options, fromSource: true })
    }

    public static fromText(source: string, options?: ThreadsWorkerOptions): WorkerImplementation {
      return new Worker(source, { ...options, fromSource: true }) as any
    }
  }

  return {
    blob: BlobWorker as any,
    default: Worker as any
  }
}

let implementation: ImplementationExport
let isTinyWorker: boolean

function selectWorkerImplementation(): ImplementationExport {
  try {
    isTinyWorker = false
    return initWorkerThreadsWorker()
  } catch(error) {
    // tslint:disable-next-line no-console
    console.debug("Node worker_threads not available. Trying to fall back to tiny-worker polyfill...")
    isTinyWorker = true
    return initTinyWorker()
  }
}

export function getWorkerImplementation(): ImplementationExport {
  if (!implementation) {
    implementation = selectWorkerImplementation()
  }
  return implementation
}

export function isWorkerRuntime() {
  if (isTinyWorker) {
    return typeof self !== "undefined" && self.postMessage ? true : false
  } else {
    // Webpack hack
    const isMainThread = typeof __non_webpack_require__ === "function"
      ? __non_webpack_require__("worker_threads").isMainThread
      : eval("require")("worker_threads").isMainThread
    return !isMainThread
  }
}

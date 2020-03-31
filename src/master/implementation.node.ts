// tslint:disable function-constructor no-eval no-duplicate-super max-classes-per-file

import getCallsites, { CallSite } from "callsites"
import EventEmitter from "events"
import { cpus } from 'os'
import * as path from "path"
import { ThreadsWorkerOptions, WorkerImplementation } from "../types/master"

declare const __non_webpack_require__: typeof require

type WorkerEventName = "error" | "message"

let tsNodeAvailable: boolean | undefined

export const defaultPoolSize = cpus().length

function detectTsNode() {
  if (typeof __non_webpack_require__ === "function") {
    // Webpack build: => No ts-node required or possible
    return false
  }
  if (tsNodeAvailable) {
    return tsNodeAvailable
  }

  try {
    require.resolve("ts-node")
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
    return Boolean(filename && !filename.match(ignoreRegex) && !filename.match(/[\/\\]master[\/\\]implementation/))
  })

  const callerPath = parentCallSite ? parentCallSite.getFileName() : null
  const rebasedScriptPath = callerPath ? path.join(path.dirname(callerPath), scriptPath) : scriptPath

  return rebasedScriptPath
}

function resolveScriptPath(scriptPath: string) {
  // eval() hack is also webpack-related
  const workerFilePath = typeof __non_webpack_require__ === "function"
    ? __non_webpack_require__.resolve(path.join(eval("__dirname"), scriptPath))
    : require.resolve(rebaseScriptPath(scriptPath, /[\/\\]worker_threads[\/\\]/))

  return workerFilePath
}

function initWorkerThreadsWorker(): typeof WorkerImplementation {
  // Webpack hack
  const NativeWorker = typeof __non_webpack_require__ === "function"
    ? __non_webpack_require__("worker_threads").Worker
    : eval("require")("worker_threads").Worker

  let allWorkers: Array<typeof NativeWorker> = []

  class Worker extends NativeWorker {
    private mappedEventListeners: WeakMap<EventListener, EventListener>

    constructor(scriptPath: string, options?: ThreadsWorkerOptions) {
      const resolvedScriptPath = resolveScriptPath(scriptPath)

      if (resolvedScriptPath.match(/\.tsx?$/i) && detectTsNode()) {
        super(createTsNodeModule(resolvedScriptPath), { eval: true })
      } else if (resolvedScriptPath.match(/\.asar[\/\\]/)) {
        try {
          super(resolvedScriptPath, options)
        } catch {
          // See <https://github.com/andywer/threads-plugin/issues/17>
          super(resolvedScriptPath.replace(/\.asar([\/\\])/, ".asar.unpack$1"), options)
        }
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

  const terminateWorkersAndMaster = () => {
    // we should terminate all workers and then gracefully shutdown self process
    Promise.all(allWorkers.map(worker => worker.terminate())).then(
      () => process.exit(0),
      () => process.exit(1),
    )
    allWorkers = []
  }

  // Take care to not leave orphaned processes behind. See #147.
  process.on("SIGINT", () => terminateWorkersAndMaster())
  process.on("SIGTERM", () => terminateWorkersAndMaster())

  return Worker as any
}

function initTinyWorker(): typeof WorkerImplementation {
  const TinyWorker = require("tiny-worker")

  let allWorkers: Array<typeof TinyWorker> = []

  class Worker extends TinyWorker {
    private emitter: EventEmitter

    constructor(scriptPath: string) {
      // Need to apply a work-around for Windows or it will choke upon the absolute path
      // (`Error [ERR_INVALID_PROTOCOL]: Protocol 'c:' not supported`)
      const resolvedScriptPath = process.platform === "win32"
        ? `file:///${resolveScriptPath(scriptPath).replace(/\\/g, "/")}`
        : resolveScriptPath(scriptPath)

      if (resolvedScriptPath.match(/\.tsx?$/i) && detectTsNode()) {
        super(new Function(createTsNodeModule(resolveScriptPath(scriptPath))), [], { esm: true })
      } else if (resolvedScriptPath.match(/\.asar[\/\\]/)) {
        try {
          super(resolvedScriptPath, [], { esm: true })
        } catch {
          // See <https://github.com/andywer/threads-plugin/issues/17>
          super(resolvedScriptPath.replace(/\.asar([\/\\])/, ".asar.unpack$1"), [], { esm: true })
        }
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

  const terminateWorkersAndMaster = () => {
    // we should terminate all workers and then gracefully shutdown self process
    Promise.all(allWorkers.map(worker => worker.terminate())).then(
      () => process.exit(0),
      () => process.exit(1),
    )
    allWorkers = []
  }

  // Take care to not leave orphaned processes behind
  // See <https://github.com/avoidwork/tiny-worker#faq>
  process.on("SIGINT", () => terminateWorkersAndMaster())
  process.on("SIGTERM", () => terminateWorkersAndMaster())

  return Worker as any
}

export function selectWorkerImplementation(): typeof WorkerImplementation {
  try {
    return initWorkerThreadsWorker()
  } catch(error) {
    // tslint:disable-next-line no-console
    console.debug("Node worker_threads not available. Trying to fall back to tiny-worker polyfill...")
    return initTinyWorker()
  }
}

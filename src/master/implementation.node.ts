// tslint:disable max-classes-per-file

import getCallsites, { CallSite } from "callsites"
import EventEmitter from "events"
import { cpus } from 'os'
import * as path from "path"
import { WorkerImplementation } from "../types/master"

type WorkerEventName = "error" | "message"

const defaultPoolSize = cpus().length

function initWorkerThreadsWorker(): typeof WorkerImplementation {
  const NativeWorker = require("worker_threads").Worker

  class Worker extends NativeWorker {
    private mappedEventListeners: WeakMap<EventListener, EventListener>

    constructor(scriptPath: string) {
      const callerPath = (getCallsites().find(callsite => {
        const filename = callsite.getFileName()
        return Boolean(filename && !filename.match(/\/worker_threads\//) && !filename.match(/\/master\//))
      }) as CallSite).getFileName() as string

      const workerFilePath = path.join(path.dirname(callerPath), scriptPath)
      super(require.resolve(workerFilePath), [], { esm: true })

      this.mappedEventListeners = new WeakMap()
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
  return Worker as any
}

function initTinyWorker(): typeof WorkerImplementation {
  const TinyWorker = require("tiny-worker")

  class Worker extends TinyWorker {
    private emitter: EventEmitter

    constructor(scriptPath: string) {
      const callerPath = (getCallsites().find(callsite => {
        const filename = callsite.getFileName()
        return Boolean(filename && !filename.match(/\/node_modules\/tiny-worker\//) && !filename.match(/\/master\//))
      }) as CallSite).getFileName() as string

      super(path.join(path.dirname(callerPath), scriptPath), [], { esm: true })

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
  }
  return Worker as any
}

function selectWorkerImplementation(): typeof WorkerImplementation {
  try {
    return initWorkerThreadsWorker()
  } catch(error) {
    // tslint:disable-next-line no-console
    console.debug("Node worker_threads not available. Trying to fall back to tiny-worker polyfill...")
    return initTinyWorker()
  }
}

export = {
  defaultPoolSize,
  selectWorkerImplementation
}

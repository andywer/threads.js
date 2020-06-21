/*
 * This source file contains the code for proxying calls in the master thread to calls in the workers
 * by `.postMessage()`-ing.
 *
 * Keep in mind that this code can make or break the program's performance! Need to optimize more…
 */

import DebugLogger from "debug"
import { multicast, Observable } from "observable-fns"
import { deserialize, serialize } from "../common"
import { ObservablePromise } from "../observable-promise"
import { isTransferDescriptor } from "../transferable"
import {
  ModuleMethods,
  ModuleProxy,
  ProxyableFunction,
  Worker as WorkerType
} from "../types/master"
import {
  MasterJobCancelMessage,
  MasterJobRunMessage,
  MasterMessageType,
  WorkerJobErrorMessage,
  WorkerJobResultMessage,
  WorkerJobStartMessage,
  WorkerMessageType
} from "../types/messages"

const debugMessages = DebugLogger("threads:master:messages")

let nextJobUID = 1

const dedupe = <T>(array: T[]): T[] => Array.from(new Set(array))

const isJobErrorMessage = (data: any): data is WorkerJobErrorMessage => data && data.type === WorkerMessageType.error
const isJobResultMessage = (data: any): data is WorkerJobResultMessage => data && data.type === WorkerMessageType.result
const isJobStartMessage = (data: any): data is WorkerJobStartMessage => data && data.type === WorkerMessageType.running

function createObservableForJob<ResultType>(worker: WorkerType, jobUID: number): Observable<ResultType> {
  return new Observable(observer => {
    let asyncType: "observable" | "promise" | undefined

    const messageHandler = ((event: MessageEvent) => {
      debugMessages("Message from worker:", event.data)
      if (!event.data || event.data.uid !== jobUID) return

      if (isJobStartMessage(event.data)) {
        asyncType = event.data.resultType
      } else if (isJobResultMessage(event.data)) {
        if (asyncType === "promise") {
          if (typeof event.data.payload !== "undefined") {
            observer.next(deserialize(event.data.payload))
          }
          observer.complete()
          worker.removeEventListener("message", messageHandler)
        } else {
          if (event.data.payload) {
            observer.next(deserialize(event.data.payload))
          }
          if (event.data.complete) {
            observer.complete()
            worker.removeEventListener("message", messageHandler)
          }
        }
      } else if (isJobErrorMessage(event.data)) {
        const error = deserialize(event.data.error as any)
        if (asyncType === "promise" || !asyncType) {
          observer.error(error)
        } else {
          observer.error(error)
        }
        worker.removeEventListener("message", messageHandler)
      }
    }) as EventListener

    worker.addEventListener("message", messageHandler)

    return () => {
      if (asyncType === "observable" || !asyncType) {
        const cancelMessage: MasterJobCancelMessage = {
          type: MasterMessageType.cancel,
          uid: jobUID
        }
        worker.postMessage(cancelMessage)
      }
      worker.removeEventListener("message", messageHandler)
    }
  })
}

function prepareArguments(rawArgs: any[]): { args: any[], transferables: Transferable[] } {
  if (rawArgs.length === 0) {
    // Exit early if possible
    return {
      args: [],
      transferables: []
    }
  }

  const args: any[] = []
  const transferables: Transferable[] = []

  for (const arg of rawArgs) {
    if (isTransferDescriptor(arg)) {
      args.push(serialize(arg.send))
      transferables.push(...arg.transferables)
    } else {
      args.push(serialize(arg))
    }
  }

  return {
    args,
    transferables: transferables.length === 0 ? transferables : dedupe(transferables)
  }
}

export function createProxyFunction<Args extends any[], ReturnType>(worker: WorkerType, method?: string) {
  return ((...rawArgs: Args) => {
    const uid = nextJobUID++
    const { args, transferables } = prepareArguments(rawArgs)
    const runMessage: MasterJobRunMessage = {
      type: MasterMessageType.run,
      uid,
      method,
      args
    }

    debugMessages("Sending command to run function to worker:", runMessage)

    try {
      worker.postMessage(runMessage, transferables)
    } catch (error) {
      return ObservablePromise.from(Promise.reject(error))
    }

    return ObservablePromise.from(multicast(createObservableForJob<ReturnType>(worker, uid)))
  }) as any as ProxyableFunction<Args, ReturnType>
}

export function createProxyModule<Methods extends ModuleMethods>(
  worker: WorkerType,
  methodNames: string[]
): ModuleProxy<Methods> {
  const proxy: any = {}

  for (const methodName of methodNames) {
    proxy[methodName] = createProxyFunction(worker, methodName)
  }

  return proxy
}

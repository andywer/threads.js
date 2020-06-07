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
    let asyncType: WorkerJobStartMessage["resultType"] | undefined

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
    return () => worker.removeEventListener("message", messageHandler)
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

const doneAsyncIterator = (async function*() {
  // this async generator function is used to avoid unnecessary calls of worker's async iterator that has been already done
})()
function mixinAsyncIterableIterator<T1, T2>(observable: Observable<T1>, worker: WorkerType, uid: number): Observable<T1> & AsyncIterableIterator<T2> {
  let done = false
  let previousCall: Promise<any> = Promise.resolve()
  const createMethod = (method: "next" | "return" | "throw") => async (rawArg?: any) => {
    const result = previousCall.then(() => {
      if (done) {
        return doneAsyncIterator[method](rawArg)
      }
      const { args, transferables } = prepareArguments(rawArg ? [rawArg] : [])
      const runMessage: MasterJobRunMessage = {
        type: MasterMessageType.run,
        uid,
        method,
        args
      }
      debugMessages("Sending command to run function to worker:", runMessage)

      worker.postMessage(runMessage, transferables)
      return new Promise<IteratorResult<T2, any>>((resolve, reject) => {
        const subscription = (observable as Observable<any>).subscribe(
          message => {
            subscription.unsubscribe()
            done = message.done
            resolve(message)
          },
          err => {
            subscription.unsubscribe()
            done = true
            reject(err)
          }
        )
      })
    })
    previousCall = result.catch(() => undefined)
    return result
  }
  const mixin = observable as Observable<T1> & AsyncIterableIterator<T2>
  mixin.next = createMethod("next")
  mixin.return = createMethod("return")
  mixin.throw = createMethod("throw")
  mixin[Symbol.asyncIterator] = function() {
    return this
  }
  return mixin
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

    return mixinAsyncIterableIterator(ObservablePromise.from(multicast(createObservableForJob<ReturnType>(worker, uid))), worker, uid)
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

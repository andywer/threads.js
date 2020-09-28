/*
 * This source file contains the code for proxying calls in the master thread to calls in the workers
 * by `.postMessage()`-ing.
 *
 * Keep in mind that this code can make or break the program's performance! Need to optimize more…
 */

import { Debugger } from "debug"
import isSomeObservable from "is-observable"
import { multicast, Observable, Subscription } from "observable-fns"
import { MessageRelay } from "../types/common"
import {
  ModuleMethods,
  ModuleProxy,
  ProxyableFunction
} from "../types/master"
import {
  CallCancelMessage,
  CallErrorMessage,
  CallInvocationMessage,
  CallResultMessage,
  CallRunningMessage,
  CommonMessageType
} from "../types/messages"
import { SerializedError, Serializer } from "../types/serializers"
import { lookupLocalCallback, Callback } from "./callbacks"
import { ObservablePromise } from "./observable-promise"
import { isTransferDescriptor } from "./transferable"

let nextCallID = 1

const activeSubscriptions = new Map<number, Subscription<any>>()

const dedupe = <T>(array: T[]): T[] => Array.from(new Set(array))

const isCallCancelMessage = (data: any): data is CallCancelMessage => data && data.type === CommonMessageType.cancel
const isCallErrorMessage = (data: any): data is CallErrorMessage => data && data.type === CommonMessageType.error
const isCallResultMessage = (data: any): data is CallResultMessage => data && data.type === CommonMessageType.result
const isCallRunningMessage = (data: any): data is CallRunningMessage => data && data.type === CommonMessageType.running
const isInvocationMessage = (data: any): data is CallInvocationMessage => data && data.type === CommonMessageType.invoke

function isZenObservable(thing: any): thing is Observable<any> {
  return thing && typeof thing === "object" && typeof thing.subscribe === "function"
}

/**
 * There are issues with `is-observable` not recognizing zen-observable's instances.
 * We are using `observable-fns`, but it's based on zen-observable, too.
 */
function isObservable(thing: any): thing is Observable<any> {
  return isSomeObservable(thing) || isZenObservable(thing)
}

function deconstructTransfer(thing: any) {
  return isTransferDescriptor(thing)
    ? { payload: thing.send, transferables: thing.transferables }
    : { payload: thing, transferables: undefined }
}

function postCallError(relay: MessageRelay, uid: number, rawError: SerializedError) {
  const { payload: error, transferables } = deconstructTransfer(rawError)
  const errorMessage: CallErrorMessage = {
    type: CommonMessageType.error,
    uid,
    error
  }
  relay.postMessage(errorMessage, transferables)
}

function postCallResult(relay: MessageRelay, uid: number, completed: boolean, resultValue?: any) {
  const { payload, transferables } = deconstructTransfer(resultValue)
  const resultMessage: CallResultMessage = {
    type: CommonMessageType.result,
    uid,
    complete: completed ? true : undefined,
    payload
  }
  relay.postMessage(resultMessage, transferables)
}

function postCallRunning(relay: MessageRelay, uid: number, resultType: CallRunningMessage["resultType"]) {
  const startMessage: CallRunningMessage = {
    type: CommonMessageType.running,
    uid,
    resultType
  }
  relay.postMessage(startMessage)
}

function createObservableForJob<ResultType>(
  relay: MessageRelay,
  serializer: Serializer,
  callID: number,
  debug: Debugger
): Observable<ResultType> {
  return new Observable(observer => {
    let asyncType: "observable" | "promise" | undefined

    const messageHandler = ((event: MessageEvent) => {
      const message = event.data

      if (!message || message.uid !== callID) return
      debug(`Received message for running call ${callID}:`, message)

      if (isCallRunningMessage(message)) {
        asyncType = message.resultType
      } else if (isCallResultMessage(message)) {
        if (asyncType === "promise") {
          if (typeof message.payload !== "undefined") {
            observer.next(serializer.deserialize(message.payload, relay))
          }
          observer.complete()
          relay.removeEventListener("message", messageHandler)
        } else {
          if (message.payload) {
            observer.next(serializer.deserialize(message.payload, relay))
          }
          if (message.complete) {
            observer.complete()
            relay.removeEventListener("message", messageHandler)
          }
        }
      } else if (isCallErrorMessage(message)) {
        const error = serializer.deserialize(message.error as any, relay)
        if (asyncType === "promise" || !asyncType) {
          observer.error(error)
        } else {
          observer.error(error)
        }
        relay.removeEventListener("message", messageHandler)
      }
    }) as EventListener

    relay.addEventListener("message", messageHandler)

    return () => {
      if (asyncType === "observable" || !asyncType) {
        const cancelMessage: CallCancelMessage = {
          type: CommonMessageType.cancel,
          uid: callID
        }
        relay.postMessage(cancelMessage)
      }
      relay.removeEventListener("message", messageHandler)
    }
  })
}

function prepareArguments(serializer: Serializer, rawArgs: any[]): { args: any[], transferables: Transferable[] } {
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
      args.push(serializer.serialize(arg.send))
      transferables.push(...arg.transferables)
    } else {
      args.push(serializer.serialize(arg))
    }
  }

  return {
    args,
    transferables: transferables.length === 0 ? transferables : dedupe(transferables)
  }
}

export function createProxyFunction<Args extends any[], ReturnType>(
  relay: MessageRelay,
  serializer: Serializer,
  fid: number,
  debug: Debugger
) {
  return ((...rawArgs: Args) => {
    const uid = nextCallID++
    const { args, transferables } = prepareArguments(serializer, rawArgs)
    const runMessage: CallInvocationMessage = {
      type: CommonMessageType.invoke,
      fid,
      uid,
      args
    }

    debug("Sending command to run function to worker:", runMessage)

    try {
      relay.postMessage(runMessage, transferables)
    } catch (error) {
      return ObservablePromise.from(Promise.reject(error))
    }

    return ObservablePromise.from(multicast(createObservableForJob<ReturnType>(relay, serializer, uid, debug)))
  }) as any as ProxyableFunction<Args, ReturnType>
}

export function createProxyModule<Methods extends ModuleMethods>(
  relay: MessageRelay,
  serializer: Serializer,
  methods: Record<string, number>,
  debug: Debugger
): ModuleProxy<Methods> {
  const proxy: any = {}

  for (const methodName of Object.keys(methods)) {
    proxy[methodName] = createProxyFunction(relay, serializer, methods[methodName], debug)
  }

  return proxy
}

async function invokeExposedLocalFunction(
  relay: MessageRelay,
  serializer: Serializer,
  callback: Callback,
  message: CallInvocationMessage
) {
  let syncResult: any
  const uid = message.uid

  try {
    const args = message.args.map(arg => serializer.deserialize(arg, relay))
    syncResult = callback(...args)
  } catch (error) {
    postCallError(relay, uid, serializer.serialize(error) as any as SerializedError)
  }

  const resultType = isObservable(syncResult) ? "observable" : "promise"
  postCallRunning(relay, uid, resultType)

  if (isObservable(syncResult)) {
    const subscription = syncResult.subscribe(
      value => postCallResult(relay, uid, false, serializer.serialize(value)),
      error => postCallError(relay, uid, serializer.serialize(error) as any),
      () => postCallResult(relay, uid, true)
    )
    activeSubscriptions.set(uid, subscription)
  } else {
    try {
      const result = await syncResult
      postCallResult(relay, uid, true, serializer.serialize(result))
    } catch (error) {
      postCallError(relay, uid, serializer.serialize(error) as any)
    }
  }
}

function handleRemoteInvocation(
  relay: MessageRelay,
  serializer: Serializer,
  message: CallInvocationMessage,
  debug: Debugger
) {
  const callback = lookupLocalCallback(message.fid)

  if (!callback) {
    debug(`Call to exposed local function failed: Function not found: UID ${message.uid}`)
    return postCallError(relay, message.uid, serializer.serialize(Error(`Function not found: UID ${message.uid}`)) as any as SerializedError)
  }

  debug(`Received invocation of local exposed function ${message.fid}, call UID ${message.uid} with arguments:`, message.args)
  return invokeExposedLocalFunction(relay, serializer, callback, message)
}

export function handleFunctionInvocations(relay: MessageRelay, serializer: Serializer, debug: Debugger) {
  relay.addEventListener("message", (event: MessageEvent) => {
    debug(`Received message:`, event.data)

    if (isInvocationMessage(event.data)) {
      handleRemoteInvocation(relay, serializer, event.data, debug)
    }
  })
}

export function handleCallCancellations(relay: MessageRelay, debug: Debugger) {
  relay.addEventListener("message", event => {
    const messageData = event.data

    if (isCallCancelMessage(messageData)) {
      const jobUID = messageData.uid
      const subscription = activeSubscriptions.get(jobUID)

      if (subscription) {
        subscription.unsubscribe()
        activeSubscriptions.delete(jobUID)
      }
    }
  })
}

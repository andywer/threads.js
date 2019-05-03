/// <reference lib="webworker" />

import isObservable from "is-observable"
import { serializeError } from "../common"
import {
  MasterJobRunMessage,
  MasterMessageType,
  WorkerInitMessage,
  WorkerJobErrorMessage,
  WorkerJobResultMessage,
  WorkerJobStartMessage,
  WorkerMessageType
} from "../types/messages"
import { WorkerFunction, WorkerModule } from "../types/worker"
import Implementation from "./implementation"

let exposedCalled = false

const isMasterJobRunMessage = (thing: any): thing is MasterJobRunMessage => thing && thing.type === MasterMessageType.run

function postFunctionInitMessage() {
  const initMessage: WorkerInitMessage = {
    type: WorkerMessageType.init,
    exposed: {
      type: "function"
    }
  }
  Implementation.postMessageToMaster(initMessage)
}

function postModuleInitMessage(methodNames: string[]) {
  const initMessage: WorkerInitMessage = {
    type: WorkerMessageType.init,
    exposed: {
      type: "module",
      methods: methodNames
    }
  }
  Implementation.postMessageToMaster(initMessage)
}

function postJobErrorMessage(uid: number, error: Error) {
  const errorMessage: WorkerJobErrorMessage = {
    type: WorkerMessageType.error,
    uid,
    error: serializeError(error)
  }
  Implementation.postMessageToMaster(errorMessage)
}

function postJobResultMessage(uid: number, completed: boolean, payload?: any) {
  const startMessage: WorkerJobResultMessage = {
    type: WorkerMessageType.result,
    uid,
    complete: completed ? true : undefined,
    payload
  }
  Implementation.postMessageToMaster(startMessage)
}

function postJobStartMessage(uid: number, resultType: WorkerJobStartMessage["resultType"]) {
  const startMessage: WorkerJobStartMessage = {
    type: WorkerMessageType.running,
    uid,
    resultType
  }
  Implementation.postMessageToMaster(startMessage)
}

async function runFunction(jobUID: number, fn: WorkerFunction, args: any[]) {
  let syncResult: any

  try {
    syncResult = fn(...args)
  } catch (error) {
    return postJobErrorMessage(jobUID, error)
  }

  const resultType = isObservable(syncResult) ? "observable" : "promise"
  postJobStartMessage(jobUID, resultType)

  if (isObservable(syncResult)) {
    syncResult.subscribe(
      value => postJobResultMessage(jobUID, false, value),
      error => postJobErrorMessage(jobUID, error),
      () => postJobResultMessage(jobUID, true)
    )
  } else {
    try {
      const result = await syncResult
      postJobResultMessage(jobUID, true, result)
    } catch (error) {
      postJobErrorMessage(jobUID, error)
    }
  }
}

export function expose(exposed: WorkerFunction | WorkerModule<any>) {
  if (exposedCalled) {
    throw Error("expose() called more than once. This is not possible. Pass an object to expose() if you want to expose multiple functions.")
  }
  exposedCalled = true

  if (typeof exposed === "function") {
    Implementation.subscribeToMasterMessages(messageData => {
      if (isMasterJobRunMessage(messageData) && !messageData.method) {
        runFunction(messageData.uid, exposed, messageData.args)
      }
    })
    postFunctionInitMessage()
  } else if (typeof exposed === "object" && exposed) {
    Implementation.subscribeToMasterMessages(messageData => {
      if (isMasterJobRunMessage(messageData) && messageData.method) {
        runFunction(messageData.uid, exposed[messageData.method], messageData.args)
      }
    })

    const methodNames = Object.keys(exposed).filter(key => typeof exposed[key] === "function")
    postModuleInitMessage(methodNames)
  } else {
    throw Error(`Invalid argument passed to expose(). Expected a function or an object, got: ${exposed}`)
  }
}

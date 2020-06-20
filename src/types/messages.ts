import { SerializedError } from "./serializers"

export enum CommonMessageType {
  cancel = "call:cancel",
  error = "call:error",
  invoke = "call:invoke",
  result = "call:result",
  running = "call:running"
}

export type CallCancelMessage = {
  type: CommonMessageType.cancel,
  uid: number
}

export type CallErrorMessage = {
  type: CommonMessageType.error,
  uid: number,
  error: SerializedError
}

export type CallInvocationMessage = {
  type: CommonMessageType.invoke,
  /** Function ID */
  fid: number,
  /** Unique call ID */
  uid: number,
  args: any[]
}

export type CallResultMessage = {
  type: CommonMessageType.result,
  uid: number,
  complete?: true,
  payload?: any
}

export type CallRunningMessage = {
  type: CommonMessageType.running,
  uid: number,
  resultType: "observable" | "promise"
}

////////////////////////////
// Messages sent by worker:

export enum WorkerMessageType {
  init = "init",
  uncaughtError = "uncaughtError"
}

export type WorkerUncaughtErrorMessage = {
  type: WorkerMessageType.uncaughtError,
  error: {
    message: string,
    name: string,
    stack?: string
  }
}

export type WorkerInitMessage = {
  type: WorkerMessageType.init,
  exposed: { type: "function" } | { type: "module", methods: Record<string, number> }
}

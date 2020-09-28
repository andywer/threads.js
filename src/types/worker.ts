import { MessageRelay } from "./common"

export interface AbstractedWorkerAPI extends MessageRelay {
  isWorkerRuntime(): boolean
}

export type WorkerFunction = ((...args: any[]) => any) | (() => any)

export type WorkerModule<Keys extends string> = {
  [key in Keys]: WorkerFunction
}

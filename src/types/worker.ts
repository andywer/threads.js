type UnsubscribeFn = () => void

export interface AbstractedWorkerAPI {
  postMessageToMaster(message: any): void
  subscribeToMasterMessages(onMessage: (data: any) => void): UnsubscribeFn
}

export type WorkerFunction = ((...args: any[]) => any) | (() => any)

export type WorkerModule<Keys extends string> = {
  [key in Keys]: WorkerFunction
}

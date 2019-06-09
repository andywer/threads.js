type UnsubscribeFn = () => void

export interface AbstractedWorkerAPI {
  isWorkerRuntime(): boolean
  postMessageToMaster(message: any, transferList?: Transferable[]): void
  subscribeToMasterMessages(onMessage: (data: any) => void): UnsubscribeFn
}

export type WorkerFunction = ((...args: any[]) => any) | (() => any)

export type WorkerModule<Keys extends string> = {
  [key in Keys]: WorkerFunction
}

type UnsubscribeFn = () => void

export interface AbstractedWorkerAPI {
  isWorkerRuntime(): boolean
  postMessageToMaster(context: any, message: any, transferList?: Transferable[]): void
  subscribeToMasterMessages(context: any, onMessage: (context: any, data: any) => void): UnsubscribeFn
}

export type WorkerFunction = ((...args: any[]) => any) | (() => any)

export type WorkerModule<Keys extends string> = {
  [key in Keys]: WorkerFunction
}

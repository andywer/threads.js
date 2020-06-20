export type TransferList = Transferable[]

/**
 * A thing than send and receive messages, usually a worker.
 * Pretty much identical to a `MessagePort`, but with less strict types,
 * so it really is an interface implemented by Worker, MessagePort, self.
 */
export interface MessageRelay {
  addEventListener(event: "error", handler: (event: ErrorEvent) => void): any
  addEventListener(event: "message", handler: (event: MessageEvent) => void): any
  addEventListener(event: string, handler: EventListener): any
  postMessage(value: any, transferList?: TransferList): void
  removeEventListener(event: "error" | "message", handler: (arg: any) => any): any
}

import Observable from "zen-observable"
import { ObservablePromise } from "../observable-promise"
import { $errors, $events, $terminate, $worker } from "../symbols"

export type ModuleMethods = { [methodName: string]: (...args: any) => any }

export type ProxyableFunction<Args extends any[], ReturnType> =
  Args extends []
    ? () => ObservablePromise <ReturnType>
    : (...args: Args) => ObservablePromise<ReturnType>

export type ModuleProxy<Methods extends ModuleMethods> = {
  [method in keyof Methods]: ProxyableFunction<Parameters<Methods[method]>, ReturnType<Methods[method]>>
}

export interface PrivateThreadProps {
  [$errors]: Observable<Error>
  [$events]: Observable<WorkerEvent>
  [$terminate]: () => Promise<void>
  [$worker]: Worker
}

export type FunctionThread<Args extends any[] = any[], ReturnType = any> = ProxyableFunction<Args, ReturnType> & PrivateThreadProps
export type ModuleThread<Methods extends ModuleMethods = any> = ModuleProxy<Methods> & PrivateThreadProps

export type Thread = FunctionThread<any, any> | ModuleThread<any>

export type TransferList = Transferable[]

export interface Worker extends EventTarget {
  postMessage(value: any, transferList?: TransferList): void
  terminate(callback?: (error?: Error, exitCode?: number) => void): void
}

export declare class WorkerImplementation extends EventTarget implements Worker {
  constructor(path: string)
  public postMessage(value: any, transferList?: TransferList): void
  public terminate(): void
}

export enum WorkerEventType {
  internalError = "internalError",
  message = "message",
  termination = "termination"
}

export interface WorkerInternalErrorEvent {
  type: WorkerEventType.internalError
  error: Error
}

export interface WorkerMessageEvent<Data> {
  type: WorkerEventType.message,
  data: Data
}

export interface WorkerTerminationEvent {
  type: WorkerEventType.termination
}

export type WorkerEvent = WorkerInternalErrorEvent | WorkerMessageEvent<any> | WorkerTerminationEvent

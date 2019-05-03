import Observable from "zen-observable"
import { $errors, $events, $terminate } from "../symbols"
import { Thread as ThreadType, Worker as WorkerType, WorkerEvent } from "../types/master"
import Implementation from "./implementation"

export { FunctionThread, ModuleThread } from "../types/master"
export { spawn } from "./spawn"

function fail(message: string): never {
  throw Error(message)
}

export type Thread = ThreadType

export const Thread = {
  errors<ThreadT extends ThreadType>(thread: ThreadT): Observable<Error> {
    return thread[$errors] || fail("Error observable not found. Make sure to pass a thread instance as returned by the spawn() promise.")
  },
  events<ThreadT extends ThreadType>(thread: ThreadT): Observable<WorkerEvent> {
    return thread[$events] || fail("Events observable not found. Make sure to pass a thread instance as returned by the spawn() promise.")
  },
  terminate<ThreadT extends ThreadType>(thread: ThreadT) {
    return thread[$terminate]()
  }
}

export type Worker = WorkerType

export const Worker = Implementation.selectWorkerImplementation()

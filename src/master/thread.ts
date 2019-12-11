import { Observable } from "observable-fns"
import { $errors, $events, $terminate } from "../symbols"
import { Thread as ThreadType, WorkerEvent } from "../types/master"

function fail(message: string): never {
  throw Error(message)
}

export type Thread = ThreadType

/** Thread utility functions. Use them to manage or inspect a `spawn()`-ed thread. */
export const Thread = {
  /** Return an observable that can be used to subscribe to all errors happening in the thread. */
  errors<ThreadT extends ThreadType>(thread: ThreadT): Observable<Error> {
    return thread[$errors] || fail("Error observable not found. Make sure to pass a thread instance as returned by the spawn() promise.")
  },
  /** Return an observable that can be used to subscribe to internal events happening in the thread. Useful for debugging. */
  events<ThreadT extends ThreadType>(thread: ThreadT): Observable<WorkerEvent> {
    return thread[$events] || fail("Events observable not found. Make sure to pass a thread instance as returned by the spawn() promise.")
  },
  /** Terminate a thread. Remember to terminate every thread when you are done using it. */
  terminate<ThreadT extends ThreadType>(thread: ThreadT) {
    return thread[$terminate]()
  }
}

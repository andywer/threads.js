// Webpack hack
// tslint:disable no-eval

declare function __non_webpack_require__(module: string): any

// FIXME
type MessagePort = any

interface WorkerThreadsModule {
  MessagePort: typeof MessagePort
  isMainThread: boolean
  parentPort: MessagePort
}

let implementation: WorkerThreadsModule | undefined

function selectImplementation(): WorkerThreadsModule {
  return typeof __non_webpack_require__ === "function"
    ? __non_webpack_require__("worker_threads")
    : eval("require")("worker_threads")
}

export default function getImplementation(): WorkerThreadsModule {
  if (!implementation) {
    implementation = selectImplementation()
  }
  return implementation
}

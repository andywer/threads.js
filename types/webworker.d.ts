/// <reference no-default-lib="true"/>
/// <reference lib="webworker" />

interface WorkerGlobalScope {
  postMessage(message: any, transferables?: any[]): void
}

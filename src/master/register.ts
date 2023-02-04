import { Worker as WorkerImplementation, SharedWorker as SharedWorkerImplementation } from "./index"

declare const window: any

if (typeof global !== "undefined") {
  (global as any).Worker = WorkerImplementation;
  (global as any).SharedWorker = SharedWorkerImplementation;
} else if (typeof window !== "undefined") {
  (window as any).Worker = WorkerImplementation;
  (window as any).SharedWorker = SharedWorkerImplementation;
}

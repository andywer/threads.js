import { Worker as WorkerImplementation } from "./index"

declare const window: any

if (typeof global !== "undefined") {
  (global as any).Worker = WorkerImplementation
} else if (typeof window !== "undefined") {
  (window as any).Worker = WorkerImplementation
}

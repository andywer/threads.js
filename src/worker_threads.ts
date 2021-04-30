// TODO this file isn't used!

// Webpack hack
import { requireFunction } from './webpack-hack'

let implementation: typeof import("worker_threads") | undefined
export default function getImplementation() {
  if (!implementation) {
    implementation = (requireFunction("worker_threads") as typeof import("worker_threads"))
  }
  return implementation
}

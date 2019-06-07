import { WorkerImplementation } from "../types/master"

const defaultPoolSize = navigator.hardwareConcurrency || 4

function selectWorkerImplementation(): typeof WorkerImplementation {
  return Worker
}

export = {
  defaultPoolSize,
  selectWorkerImplementation
}

import { WorkerImplementation } from "../types/master"

function selectWorkerImplementation(): typeof WorkerImplementation {
  return Worker
}

export = {
  selectWorkerImplementation
}

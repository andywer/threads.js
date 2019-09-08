import { WorkerImplementation } from "../types/master"

const defaultPoolSize = navigator.hardwareConcurrency || 4

const isAbsoluteURL = (value: string) => /^(https?:)?\/\//i.test(value)

function selectWorkerImplementation(): typeof WorkerImplementation {
  return class BrowserWorker extends Worker {
    constructor(url: string | URL, options?: WorkerOptions, prefixFunc? : Function) {
      if (typeof url === "string" && isAbsoluteURL(url)) {
        // Create source code blob loading JS file via `importScripts()`
        // to circumvent worker CORS restrictions
        const blob = new Blob(
          [`importScripts(${JSON.stringify(url)});`],
          { type: "application/javascript" }
        )
        url = URL.createObjectURL(blob)
      }

      if (typeof prefixFunc === "function") {
        super(`${prefixFunc()}/${url}`, options);
      } else if (typeof prefixFunc === "string") {
        super(`${prefixFunc}/${url}`, options);
      } else {
        super(url, options);
      }
    }
  }
}

export default {
  defaultPoolSize,
  selectWorkerImplementation
}

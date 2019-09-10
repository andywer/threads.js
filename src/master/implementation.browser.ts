import { ThreadsWorkerOptions, WorkerImplementation } from "../types/master"

const defaultPoolSize = navigator.hardwareConcurrency || 4

const isAbsoluteURL = (value: string) => /^(https?:)?\/\//i.test(value)

function createSourceBlobURL(code: string): string {
  const blob = new Blob(
    [code],
    { type: "application/javascript" }
  )
  return URL.createObjectURL(blob)
}


function selectWorkerImplementation(): typeof WorkerImplementation {
  return class WebWorker extends Worker {
    constructor(url: string | URL, options?: ThreadsWorkerOptions) {
      if (typeof url === "string" && options && options._baseURL) {
        url = new URL(url, options._baseURL)
      }
      if (typeof url === "string" && isAbsoluteURL(url)) {
        // Create source code blob loading JS file via `importScripts()`
        // to circumvent worker CORS restrictions
        url = createSourceBlobURL(`importScripts(${JSON.stringify(url)});`)
      }
      super(url, options)
    }
  }
}

export default {
  defaultPoolSize,
  selectWorkerImplementation
}

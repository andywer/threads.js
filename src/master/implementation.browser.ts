// tslint:disable max-classes-per-file

import { ThreadsWorkerOptions, WorkerImplementation } from "../types/master"
import { getBundleURL } from "./get-bundle-url.browser"

export const defaultPoolSize = typeof navigator !== "undefined" && navigator.hardwareConcurrency
  ? navigator.hardwareConcurrency
  : 4

const isAbsoluteURL = (value: string) => /^(file|https?:)?\/\//i.test(value)

function createSourceBlobURL(code: string): string {
  const blob = new Blob(
    [code],
    { type: "application/javascript" }
  )
  return URL.createObjectURL(blob)
}

function selectWorkerImplementation(): typeof WorkerImplementation {
  if (typeof Worker === "undefined") {
    // Might happen on Safari, for instance
    // The idea is to only fail if the constructor is actually used
    return class NoWebWorker {
      constructor() {
        throw Error("No web worker implementation available. You might have tried to spawn a worker within a worker in a browser that doesn't support workers in workers.")
      }
    } as any
  }

  return class WebWorker extends Worker {
    constructor(url: string | URL, options?: ThreadsWorkerOptions) {
      if (typeof url === "string" && options && options._baseURL) {
        url = new URL(url, options._baseURL)
      } else if (typeof url === "string" && !isAbsoluteURL(url) && getBundleURL().match(/^file:\/\//i)) {
        url = new URL(url, getBundleURL().replace(/\/[^\/]+$/, "/"))
        url = createSourceBlobURL(`importScripts(${JSON.stringify(url)});`)
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

let implementation: typeof WorkerImplementation

export function getWorkerImplementation(): typeof WorkerImplementation {
  if (!implementation) {
    implementation = selectWorkerImplementation()
  }
  return implementation
}

export function isWorkerRuntime() {
  const isWindowContext = typeof self !== "undefined" && typeof Window !== "undefined" && self instanceof Window
  return typeof self !== "undefined" && self.postMessage && !isWindowContext ? true : false
}

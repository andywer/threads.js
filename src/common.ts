export interface SerializedError {
  message: string
  name: string
  stack?: string
}

export function rehydrateError(error: SerializedError): Error {
  return Object.assign(Error(error.message), {
    name: error.name,
    stack: error.stack
  })
}

export function serializeError(error: Error): SerializedError {
  return {
    message: error.message,
    name: error.name,
    stack: error.stack
  }
}

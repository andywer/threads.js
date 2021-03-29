const doNothing = () => undefined

/**
 * Creates a new promise and exposes its resolver function.
 * Use with care!
 */
export function createPromiseWithResolver<T>(): [Promise<T>, (result: T) => void] {
  let alreadyResolved = false
  let resolvedTo: T
  let resolver: (value: T | PromiseLike<T>) => void = doNothing

  const promise = new Promise<T>(resolve => {
    if (alreadyResolved) {
      resolve(resolvedTo)
    } else {
      resolver = resolve
    }
  })
  const exposedResolver = (value: T) => {
    alreadyResolved = true
    resolvedTo = value
    resolver(resolvedTo)
  }
  return [promise, exposedResolver]
}

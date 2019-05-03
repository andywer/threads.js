const doNothing = () => undefined

export function createPromiseWithResolver<T>(): [Promise<T>, (result: T) => void] {
  let alreadyResolved = false
  let resolvedTo: T
  let resolver: () => void = doNothing

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
    resolver()
  }
  return [promise, exposedResolver]
}

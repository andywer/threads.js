import Observable from "zen-observable"

export type ObservablePromise<T> = Promise<T> & Observable<T>

type OnFulfilled<T, Result = void> = (value: T) => Result
type OnRejected<Result = void> = (error: Error) => Result

type Initializer<T> = (
  resolve: (value?: T) => void,
  reject: (error: Error) => void,
  observer: ZenObservable.SubscriptionObserver<T>
) => UnsubscribeFn | void

type UnsubscribeFn = () => void

const doNothing = () => undefined
const returnInput = <T>(input: T): T => input
const runDeferred = (fn: () => void) => Promise.resolve().then(fn)

function fail(error: Error): never {
  throw error
}

/**
 * Creates a hybrid, combining the APIs of an Observable and a Promise.
 *
 * It is used to proxy async process states when we are initially not sure
 * if that async process will yield values once (-> Promise) or multiple
 * times (-> Observable).
 *
 * Note that the observable promise inherits some of zen-observable's characteristics:
 * The `init` function will be called *once for every time anyone subscribes to it*.
 *
 * If this is undesired, derive a hot observable from it using `makeHot()` and
 * subscribe to that.
 */
export function ObservablePromise<T>(init: Initializer<T>): ObservablePromise<T> {
  let initHasRun = false
  const fulfillmentCallbacks: Array<OnFulfilled<T>> = []
  const rejectionCallbacks: OnRejected[] = []

  let firstValue: T | undefined
  let firstValueSet = false
  let rejection: Error | undefined
  let state: "fulfilled" | "pending" | "rejected" = "pending"

  const onNext = (value: T) => {
    if (!firstValueSet) {
      firstValue = value
      firstValueSet = true
    }
  }
  const onError = (error: Error) => {
    state = "rejected"
    rejection = error

    for (const onRejected of rejectionCallbacks) {
      // Promisifying the call to turn errors into unhandled promise rejections
      // instead of them failing sync and cancelling the iteration
      runDeferred(() => onRejected(error))
    }
  }
  const onCompletion = () => {
    state = "fulfilled"

    for (const onFulfilled of fulfillmentCallbacks) {
      // Promisifying the call to turn errors into unhandled promise rejections
      // instead of them failing sync and cancelling the iteration
      runDeferred(() => onFulfilled(firstValue as T))
    }
  }

  const observable = new Observable<T>(originalObserver => {
    const observer = {
      ...originalObserver,
      complete() {
        originalObserver.complete()
        onCompletion()
      },
      error(error: Error) {
        originalObserver.error(error)
        onError(error)
      },
      next(value: T) {
        originalObserver.next(value)
        onNext(value)
      }
    }
    const resolve: OnFulfilled<T | undefined> = (value?: T) => {
      if (value !== undefined) {
        observer.next(value)
      }
      observer.complete()
    }
    const reject: OnRejected = observer.error.bind(observer)

    try {
      initHasRun = true
      return init(resolve, reject, observer)
    } catch (error) {
      reject(error)
    }
  })

  function then<Result1 = T, Result2 = never>(
    onFulfilledRaw: OnFulfilled<T, Result1> | null | undefined,
    onRejectedRaw?: OnRejected<Result2> | null | undefined
  ): Promise<Result1 | Result2> {
    const onFulfilled: OnFulfilled<T, Result1> = onFulfilledRaw || returnInput as any
    const onRejected = onRejectedRaw || fail
    let onRejectedCalled = false

    return new Promise<Result1 | Result2>((resolve, reject) => {
      const rejectionCallback = (error: Error) => {
        if (onRejectedCalled) return
        onRejectedCalled = true

        try {
          resolve(onRejected(error))
        } catch (anotherError) {
          reject(anotherError)
        }
      }
      const fulfillmentCallback = (value: T) => {
        try {
          resolve(onFulfilled(value))
        } catch (error) {
          rejectionCallback(error)
        }
      }
      if (!initHasRun) {
        observable.subscribe({ error: rejectionCallback })
      }
      if (state === "fulfilled") {
        return resolve(onFulfilled(firstValue as T))
      }
      if (state === "rejected") {
        onRejectedCalled = true
        return resolve(onRejected(rejection as Error))
      }
      fulfillmentCallbacks.push(fulfillmentCallback)
      rejectionCallbacks.push(rejectionCallback)
    })
  }

  const catchFn = <Result = never>(
    onRejected: ((error: Error) => Promise<Result> | Result | void) | null | undefined
  ) => {
    return then(undefined, onRejected) as Promise<Result>
  }
  const finallyFn = (onCompleted: () => void) => {
    onCompleted = onCompleted || doNothing
    return then(
      (value: T) => {
        onCompleted()
        return value
      },
      () => onCompleted()
    )
  }

  // tslint:disable-next-line prefer-object-spread
  return Object.assign(observable, {
    [Symbol.toStringTag]: "[object ObservablePromise]",

    then: then as Promise<T>["then"],
    catch: catchFn as Promise<T>["catch"],
    finally: finallyFn as Promise<T>["finally"]
  })
}

/**
 * Turns a cold observable into a hot observable.
 *
 * Returns a new observable promise that does exactly the same, but acts as a subscription aggregator,
 * so that N subscriptions to it only result in one subscription to the input observable promise.
 *
 * That one subscription on the input observable promise is setup immediately.
 */
export function makeHot<T>(async: ObservablePromise<T> | Observable<T>): ObservablePromise<T> {
  let observers: Array<ZenObservable.SubscriptionObserver<T>> = []

  async.subscribe({
    complete() {
      observers.forEach(observer => observer.complete())
    },
    error(error) {
      observers.forEach(observer => observer.error(error))
    },
    next(value) {
      observers.forEach(observer => observer.next(value))
    }
  })

  const aggregator = ObservablePromise<T>((resolve, reject, observer) => {
    observers.push(observer)

    const unsubscribe = () => {
      observers = observers.filter(someObserver => someObserver !== observer)
    }
    return unsubscribe
  })
  return aggregator
}

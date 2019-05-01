import Observable from "zen-observable"

export type ObservablePromise<T> = Promise<T> & Observable<T>

type OnFulfilled<T, Result = void> = (value: T) => Result
type OnRejected<Result = void> = (error: Error) => Result

type AsyncProxyInitializer<T> = (
  resolve: (value?: T) => void,
  reject: (error: Error) => void,
  observer: ZenObservable.Observer<T>
) => UnsubscribeFn | void

type UnsubscribeFn = () => void

const isThenable = (thing: any): thing is Promise<any> => thing && typeof thing.then === "function"
const runDeferred = (fn: () => void) => Promise.resolve().then(fn)

/**
 * Creates a hybrid, combining the APIs of an Observable and a Promise.
 *
 * It is used to proxy async process states when we are initially not sure
 * if that async process will yield values/errors once (-> Promise) or
 * multiple times (-> Observable).
 *
 * Note that the returned ObservablePromise implicitly inherits some of
 * zen-observable's characteristics: Most prominently the `init` function
 * will be called *once for every time anyone subscribes to it*.
 */
export default function ObservablePromise<T>(init: AsyncProxyInitializer<T>): ObservablePromise<T> {
  const fulfillmentCallbacks: OnFulfilled<T>[] = []
  const rejectionCallbacks: OnRejected[] = []

  const observable = new Observable<T>(observer => {
    const resolve: OnFulfilled<T | undefined> = (value?: T) => {
      if (value !== undefined) {
        observer.next(value)
      }
      observer.complete()
    }
    const reject: OnRejected = (error: Error) => {
      observer.error(error)
      observer.complete()
    }

    try {
      return init(resolve, reject, observer)
    } catch (error) {
      reject(error)
    }
  })

  let firstValue: T | undefined
  let firstValueSet = false
  let rejection: Error | undefined
  let state: "fulfilled" | "pending" | "rejected" = "pending"

  const unsubscribePromisification = observable.subscribe({
    next(value) {
      if (!firstValueSet) {
        firstValue = value
        firstValueSet = true
      }
    },
    error(error) {
      if (state === "pending") {
        state = "rejected"
        rejection = error
        unsubscribePromisification.unsubscribe()

        for (const onRejected of rejectionCallbacks) {
          runDeferred(() => onRejected(error))
        }
      }
    },
    complete() {
      if (state === "pending") {
        state = "fulfilled"

        for (const onFulfilled of fulfillmentCallbacks) {
          // Promisifying the call to turn errors into unhandled promise rejections
          // instead of them failing sync and cancelling the iteration
          runDeferred(() => onFulfilled(firstValue as T))
        }
      }
    }
  })

  function then<Result1 = T, Result2 = never>(
    onFulfilled: OnFulfilled<T, Result1> | null | undefined,
    onRejected?: OnRejected<Result2> | null | undefined
  ): Promise<Result1 | Result2> {
    if (state === "fulfilled" && onFulfilled) {
      return Promise.resolve().then<Result1>(() => onFulfilled(firstValue as T))
    }
    if (state === "rejected" && onRejected) {
      return Promise.resolve().then<Result2>(() => onRejected(rejection as Error))
    }
    if (!onFulfilled && !onRejected) {
      return Promise.resolve<any>(undefined)
    }
    return new Promise<Result1 | Result2>((resolve, reject) => {
      if (onFulfilled) {
        fulfillmentCallbacks.push(value => resolve(onFulfilled(value)))
      }
      if (onRejected) {
        rejectionCallbacks.push(error => {
          const errorHandlerResult = onRejected(error)
          if (isThenable(errorHandlerResult)) {
            errorHandlerResult.then(resolve, reject)
          } else {
            reject(errorHandlerResult || error)
          }
        })
      }
    })
  }

  const catchFn = <Result = never>(
    onRejected: ((error: Error) => Promise<Result> | Result | void) | null | undefined
  ) => {
    return then(undefined, onRejected) as Promise<Result>
  }
  const finallyFn = (onCompleted: () => void) => {
    return then(
      (value: T) => {
        onCompleted()
        return value
      },
      () => onCompleted()
    )
  }

  return Object.assign(observable, {
    [Symbol.toStringTag]: "[object ObservablePromise]",

    then: then as Promise<T>["then"],
    catch: catchFn as Promise<T>["catch"],
    finally: finallyFn as Promise<T>["finally"]
  })
}

import { Observable, SubscriptionObserver } from "observable-fns"

type OnFulfilled<T, Result = void> = (value: T) => Result
type OnRejected<Result = void> = (error: Error) => Result

type Initializer<T> = (
  resolve: (value?: T) => void,
  reject: (error: Error) => void,
  observer: SubscriptionObserver<T>
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
 * Note that the observable promise inherits some of the observable's characteristics:
 * The `init` function will be called *once for every time anyone subscribes to it*.
 *
 * If this is undesired, derive a hot observable from it using `makeHot()` and
 * subscribe to that.
 */
export class ObservablePromise<T> extends Observable<T> implements Promise<T> {
  private initHasRun = false
  private fulfillmentCallbacks: Array<OnFulfilled<T>> = []
  private rejectionCallbacks: OnRejected[] = []

  private firstValue: T | undefined
  private firstValueSet = false
  private rejection: Error | undefined
  private state: "fulfilled" | "pending" | "rejected" = "pending"

  public readonly [Symbol.toStringTag]: "[object ObservablePromise]"

  constructor(init: Initializer<T>) {
    super(originalObserver => {
      // tslint:disable-next-line no-this-assignment
      const self = this
      const observer = {
        ...originalObserver,
        complete() {
          originalObserver.complete()
          self.onCompletion()
        },
        error(error: Error) {
          originalObserver.error(error)
          self.onError(error)
        },
        next(value: T) {
          originalObserver.next(value)
          self.onNext(value)
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
        this.initHasRun = true
        return init(resolve, reject, observer)
      } catch (error) {
        reject(error)
      }
    })
  }

  private onNext(value: T) {
    if (!this.firstValueSet) {
      this.firstValue = value
      this.firstValueSet = true
    }
  }

  private onError(error: Error) {
    this.state = "rejected"
    this.rejection = error

    for (const onRejected of this.rejectionCallbacks) {
      // Promisifying the call to turn errors into unhandled promise rejections
      // instead of them failing sync and cancelling the iteration
      runDeferred(() => onRejected(error))
    }
  }

  private onCompletion() {
    this.state = "fulfilled"

    for (const onFulfilled of this.fulfillmentCallbacks) {
      // Promisifying the call to turn errors into unhandled promise rejections
      // instead of them failing sync and cancelling the iteration
      runDeferred(() => onFulfilled(this.firstValue as T))
    }
  }

  public then<TResult1 = T, TResult2 = never>(
    onFulfilledRaw?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null,
    onRejectedRaw?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null
  ): Promise<TResult1 | TResult2> {
    const onFulfilled: OnFulfilled<T, TResult1> = onFulfilledRaw || returnInput as any
    const onRejected = onRejectedRaw || fail
    let onRejectedCalled = false

    return new Promise<TResult1 | TResult2>((resolve, reject) => {
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
      if (!this.initHasRun) {
        this.subscribe({ error: rejectionCallback })
      }
      if (this.state === "fulfilled") {
        return resolve(onFulfilled(this.firstValue as T))
      }
      if (this.state === "rejected") {
        onRejectedCalled = true
        return resolve(onRejected(this.rejection as Error))
      }
      this.fulfillmentCallbacks.push(fulfillmentCallback)
      this.rejectionCallbacks.push(rejectionCallback)
    })
  }

  public catch<Result = never>(
    onRejected: ((error: Error) => Promise<Result> | Result) | null | undefined
  ) {
    return this.then(undefined, onRejected) as Promise<Result>
  }

  public finally(onCompleted?: (() => void) | null | undefined) {
    const handler = onCompleted || doNothing
    return this.then(
      (value: T) => {
        handler()
        return value
      },
      () => handler()
    ) as Promise<T>
  }
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
  let observers: Array<SubscriptionObserver<T>> = []

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

  const aggregator = new ObservablePromise<T>((resolve, reject, observer) => {
    observers.push(observer)

    const unsubscribe = () => {
      observers = observers.filter(someObserver => someObserver !== observer)
    }
    return unsubscribe
  })
  return aggregator
}

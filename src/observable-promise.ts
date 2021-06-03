import { Observable, ObservableLike, SubscriptionObserver } from "observable-fns"

type OnFulfilled<T, Result = void> = (value: T) => Result
type OnRejected<Result = void> = (error: Error) => Result

type Initializer<T> = (observer: SubscriptionObserver<T>) => UnsubscribeFn | void

type Thenable<T> = { then: (onFulfilled?: (value: T) => any, onRejected?: (error: any) => any) => any }

type UnsubscribeFn = () => void

const doNothing = () => undefined
const returnInput = <T>(input: T): T => input
const runDeferred = (fn: () => void) => Promise.resolve().then(fn)

function fail(error: Error): never {
  throw error
}

function isThenable(thing: any): thing is Thenable<any> {
  return thing && typeof thing.then === "function"
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
    super((originalObserver: SubscriptionObserver<T>) => {
      // tslint:disable-next-line no-this-assignment
      const self = this
      const observer: SubscriptionObserver<T> = {
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

      try {
        this.initHasRun = true
        return init(observer)
      } catch (error) {
        observer.error(error)
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

  public static from<T>(thing: Observable<T> | ObservableLike<T> | ArrayLike<T> | Thenable<T>): ObservablePromise<T> {
    if (isThenable(thing)) {
      return new ObservablePromise(observer => {
        const onFulfilled = (value: T) => {
          observer.next(value)
          observer.complete()
        }
        const onRejected = (error: any) => {
          observer.error(error)
        }
        thing.then(onFulfilled, onRejected)
      })
    } else {
      return super.from(thing) as ObservablePromise<T>
    }
  }
}

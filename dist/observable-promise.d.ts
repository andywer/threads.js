import Observable from "zen-observable";
export declare type ObservablePromise<T> = Promise<T> & Observable<T>;
declare type Initializer<T> = (resolve: (value?: T) => void, reject: (error: Error) => void, observer: ZenObservable.SubscriptionObserver<T>) => UnsubscribeFn | void;
declare type UnsubscribeFn = () => void;
/**
 * Creates a hybrid, combining the APIs of an Observable and a Promise.
 *
 * It is used to proxy async process states when we are initially not sure
 * if that async process will yield values/errors once (-> Promise) or
 * multiple times (-> Observable).
 *
 * Note that the observable promise inherits some of zen-observable's characteristics:
 * The `init` function will be called *once for every time anyone subscribes to it*.
 *
 * If this is undesired, derive a hot observable from it using `makeHot()` and
 * subscribe to that.
 */
export declare function ObservablePromise<T>(init: Initializer<T>): ObservablePromise<T>;
/**
 * Turns a cold observable into a hot observable.
 *
 * Returns a new observable promise that does exactly the same, but acts as a subscription aggregator,
 * so that N subscriptions to it only result in one subscription to the input observable promise.
 *
 * That one subscription on the input observable promise is setup immediately.
 */
export declare function makeHot<T>(async: ObservablePromise<T>): ObservablePromise<T>;
export {};

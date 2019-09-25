import Observable from "zen-observable"

const $observers = Symbol("observers");

/**
 * Observable subject. Implements the Observable interface, but also exposes
 * the `next()`, `error()`, `complete()` methods to initiate observable
 * updates "from the outside".
 *
 * Use `Observable.from(subject)` to derive an observable that proxies all
 * values, errors and the completion raised on this subject, but does not
 * expose the `next()`, `error()`, `complete()` methods.
 */
class Subject<T> extends Observable<T> implements ZenObservable.ObservableLike<T> {
  private [$observers]: Array<ZenObservable.SubscriptionObserver<T>>

  constructor() {
    super(observer => {
      this[$observers] = [
        ...(this[$observers] || []),
        observer
      ]
      const unsubscribe = () => {
        this[$observers] = this[$observers].filter(someObserver => someObserver !== observer)
      }
      return unsubscribe
    })
  }

  public complete() {
      if(this.hasObservables()) {
          this[ $observers ].forEach( observer => observer.complete() )
      }
  }

  public error(error: any) {
      if(this.hasObservables()) {
          this[ $observers ].forEach( observer => observer.error( error ) )
      }
  }

  public next(value: T) {
      if(this.hasObservables()){
          this[$observers].forEach(observer => observer.next(value))
      }
  }

  protected hasObservables(): boolean{
      return this[$observers] && Array.isArray(this[$observers];
  }
}

export {
  Observable,
  Subject
}

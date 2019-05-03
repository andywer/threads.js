declare module "is-observable" {
  import Observable from "zen-observable"

  function isObservable(thing: any): thing is Observable<any>
  export = isObservable
}

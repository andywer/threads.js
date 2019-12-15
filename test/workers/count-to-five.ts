import { Observable } from "observable-fns"
import { expose } from "../../src/worker"

expose(function countToFive() {
  return new Observable(observer => {
    for (let counter = 1; counter <= 5; counter++) {
      observer.next(counter)
    }
    observer.complete()
  })
})

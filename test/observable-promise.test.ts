import test from "ava"
import { Observable } from "observable-fns"
import { ObservablePromise } from "../src/observable-promise"

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

test("can create an observable promise", async t => {
  t.plan(1)

  await new ObservablePromise((observer) => {
    t.true(true)
    observer.complete()
  })
})

test("init function is only called once", async t => {
  let initCallCount = 0

  const async = new ObservablePromise((observer) => {
    initCallCount++
    setTimeout(() => observer.complete(), 10)
  })

  await Promise.all([
    async.then(() => t.true(true)),
    async.then(() => t.true(true)),
    async.then(() => t.true(true))
  ])

  t.is(initCallCount, 1)
})

test("can proxy a promise fulfillment", async t => {
  t.plan(2)

  const async = new ObservablePromise((observer) => {
    setTimeout(() => {
      observer.next(123)

      // Ignore all values after the first one
      observer.next(456)
      observer.complete()
    }, 1)
  })

  const promise1 = async.then(value => t.is(value, 123), t.fail)
  await delay(10)
  const promise2 = async.then(value => t.is(value, 123), t.fail)

  await Promise.all([promise1, promise2])
})

test("can proxy a promise rejection", async t => {
  let handlerCallCount = 0

  const async = new ObservablePromise((observer) => {
    setTimeout(() => observer.error(Error("I am supposed to be rejected.")), 1)
  })

  const promise1 = async.then(
    () => t.fail("Promise should not become fulfilled"),
    () => Promise.resolve(handlerCallCount++)
  )
  await delay(10)
  const promise2 = async.then(
    () => t.fail("Promise should not become fulfilled"),
    () => Promise.resolve(handlerCallCount++)
  )

  await Promise.all([promise1.catch(() => true), promise2.catch(() => true)])
  t.is(handlerCallCount, 2)
})

test("can proxy a promise rejection caused by a sync throw", async t => {
  let handlerCallCount = 0

  const async = new ObservablePromise(() => {
    throw Error("I am supposed to be rejected.")
  })

  const promise1 = async.then(
    () => t.fail("Promise should not become fulfilled"),
    () => Promise.resolve(handlerCallCount++)
  )
  await delay(10)
  const promise2 = async.then(
    () => t.fail("Promise should not become fulfilled"),
    () => Promise.resolve(handlerCallCount++)
  )

  await Promise.all([promise1, promise2])
  t.is(handlerCallCount, 2)
})

test("can subscribe to values and completion", async t => {
  let capturedValues: any[] = []
  let capturedCompletions = 0

  const async = new ObservablePromise((observer) => {
    setTimeout(() => observer.next(1), 10)
    setTimeout(() => observer.next(2), 20)
    setTimeout(() => observer.complete(), 30)
  })

  for (let index = 0; index < 2; index++) {
    async.subscribe(
      value => capturedValues.push(value),
      () => undefined,
      () => capturedCompletions++
    )
  }

  await async.finally()
  await delay(1)

  t.deepEqual(capturedValues, [1, 1, 2, 2])
  t.is(capturedCompletions, 2)
})

test("can subscribe to errors", async t => {
  let capturedErrorMessages: string[] = []
  let capturedValues: any[] = []
  let capturedCompletions = 0

  const async = new ObservablePromise((observer) => {
    setTimeout(() => observer.next(1), 10)
    setTimeout(() => observer.error(Error("Fails as expected.")), 20)
    setTimeout(() => observer.next(2), 30)
    setTimeout(() => observer.complete(), 40)
  })

  for (let index = 0; index < 2; index++) {
    async.subscribe(
      value => capturedValues.push(value),
      error => capturedErrorMessages.push(error.message),
      () => capturedCompletions++
    )
  }

  await async.finally()
  await delay(35)

  t.deepEqual(capturedValues, [1, 1])
  t.deepEqual(capturedErrorMessages, ["Fails as expected.", "Fails as expected."])
  t.is(capturedCompletions, 0)
})

test("from(Observable) works", async t => {
  let capturedErrorMessages: string[] = []
  let capturedValues: any[] = []
  let capturedCompletions = 0

  const async = ObservablePromise.from(new Observable((observer) => {
    setTimeout(() => observer.next(1), 10)
    setTimeout(() => observer.error(Error("Fails as expected.")), 20)
    setTimeout(() => observer.next(2), 30)
    setTimeout(() => observer.complete(), 40)
  }))

  for (let index = 0; index < 2; index++) {
    async.subscribe(
      value => capturedValues.push(value),
      error => capturedErrorMessages.push(error.message),
      () => capturedCompletions++
    )
  }

  await async.finally()
  await delay(35)

  t.deepEqual(capturedValues, [1, 1])
  t.deepEqual(capturedErrorMessages, ["Fails as expected.", "Fails as expected."])
  t.is(capturedCompletions, 0)
})

test("from(Promise) works", async t => {
  const resolved = ObservablePromise.from(new Promise(resolve => {
    setTimeout(() => resolve("Works"), 10)
  }))
  t.is(await resolved, "Works")

  const rejected = ObservablePromise.from(Promise.reject(Error("Fails")))
  const error = await t.throwsAsync(rejected)

  t.is(error.message, "Fails")
})

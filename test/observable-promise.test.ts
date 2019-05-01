import test from "ava"
import ObservablePromise from "../src/observable-promise"

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

test("can create an observable promise", t => {
  ObservablePromise((resolve) => {
    resolve()
    t.pass()
  })
})

test("init function is only called once", async t => {
  let initCallCount = 0

  const async = ObservablePromise((resolve) => {
    initCallCount++
    setTimeout(() => resolve(), 10)
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

  const async = ObservablePromise((resolve) => {
    resolve()
  })

  const promise1 = async.then(() => t.true(true), t.fail)
  await sleep(10)
  const promise2 = async.then(() => t.true(true), t.fail)

  await Promise.all([promise1, promise2])
})

test("can proxy a promise rejection", async t => {
  let handlerCallCount = 0

  const async = ObservablePromise((resolve, reject) => {
    reject(Error("I am supposed to be rejected."))
  })

  const promise1 = async.then(
    () => t.fail("Promise should not become fulfilled"),
    () => Promise.resolve(handlerCallCount++)
  )
  await sleep(10)
  const promise2 = async.then(
    () => t.fail("Promise should not become fulfilled"),
    () => Promise.resolve(handlerCallCount++)
  )

  await Promise.all([promise1, promise2])
  t.is(handlerCallCount, 2)
})

test("can proxy a promise rejection caused by a sync throw", async t => {
  let handlerCallCount = 0

  const async = ObservablePromise((resolve, reject) => {
    throw Error("I am supposed to be rejected.")
  })

  const promise1 = async.then(
    () => t.fail("Promise should not become fulfilled"),
    () => Promise.resolve(handlerCallCount++)
  )
  await sleep(10)
  const promise2 = async.then(
    () => t.fail("Promise should not become fulfilled"),
    () => Promise.resolve(handlerCallCount++)
  )

  await Promise.all([promise1, promise2])
  t.is(handlerCallCount, 2)
})

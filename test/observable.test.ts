import test from "ava"
import { Observable, Subject } from "../src/observable"

test("Observable subject emits values and completion event", async t => {
  let completed1 = false
  const values1: number[] = []
  let completed2 = false
  const values2: number[] = []
  let completed3 = false
  const values3: number[] = []

  const subject = new Subject<number>()
  const observable = Observable.from(subject)

  const subscription1 = subject.subscribe(
    value => values1.push(value),
    undefined,
    () => completed1 = true
  )
  subject.subscribe(
    value => values2.push(value),
    undefined,
    () => completed2 = true
  )
  observable.subscribe(
    value => values3.push(value),
    undefined,
    () => completed3 = true
  )

  subject.next(1)
  subscription1.unsubscribe()

  subject.next(2)
  subject.complete()

  t.deepEqual(values1, [1])
  t.deepEqual(values2, [1, 2])
  t.deepEqual(values3, [1, 2])
  t.is(completed1, false)
  t.is(completed2, true)
  t.is(completed3, true)
})

test("Observable subject propagates errors", async t => {
  let completed1 = false
  let error1: Error | undefined
  let completed2 = false
  let error2: Error | undefined
  let completed3 = false
  let error3: Error | undefined

  const subject = new Subject<number>()
  const observable = Observable.from(subject)

  const subscription1 = subject.subscribe(
    () => undefined,
    error => error1 = error,
    () => completed1 = true
  )
  subject.subscribe(
    () => undefined,
    error => error2 = error,
    () => completed2 = true
  )
  observable.subscribe(
    () => undefined,
    error => error3 = error,
    () => completed3 = true
  )

  const testingError = Error("Test, test!")

  subscription1.unsubscribe()
  subject.error(testingError)

  t.is(completed1, false)
  t.is(error1, undefined)
  t.is(completed2, false)
  t.is(error2, testingError)
  t.is(completed3, false)
  t.is(error3, testingError)
})

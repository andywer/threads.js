import test from "ava"
import { Observable } from "observable-fns"
import { spawn, Thread, Worker } from "../src/index"
import { Counter } from "./workers/counter"

test("can spawn and terminate a thread", async t => {
  // We also test here that running spawn() without type parameters works
  const helloWorld = await spawn(new Worker("./workers/hello-world"))
  t.is(await helloWorld(), "Hello World")
  await Thread.terminate(helloWorld)
  t.pass()
})

test("can call a function thread more than once", async t => {
  const increment = await spawn<() => number>(new Worker("./workers/increment"))
  t.is(await increment(), 1)
  t.is(await increment(), 2)
  t.is(await increment(), 3)
  await Thread.terminate(increment)
})

test("can subscribe to an observable returned by a thread call", async t => {
  const countToFive = await spawn<() => Observable<number>>(new Worker("./workers/count-to-five"))
  const encounteredValues: any[] = []

  const observable = countToFive()
  observable.subscribe(value => encounteredValues.push(value))
  await observable

  t.deepEqual(encounteredValues, [1, 2, 3, 4, 5])
  await Thread.terminate(countToFive)
})

test("can iterate over an AsyncIterableIterator returned by a thread call", async t => {
  const countToFiveGenerator = await spawn<() => AsyncGenerator<number, number | undefined, boolean | undefined>>(new Worker("./workers/count-to-five-generator"))
  const encounteredValues: number[] = []

  for await (const value of countToFiveGenerator()) {
    encounteredValues.push(value)
  }

  t.deepEqual(encounteredValues, [1, 2, 3, 4, 5])
  await Thread.terminate(countToFiveGenerator)
})

test("can call next() and return() of an AsyncIterableIterator returned by a thread call", async t => {
  const countToFiveGenerator = await spawn<() => AsyncGenerator<number, number | undefined, boolean | undefined>>(new Worker("./workers/count-to-five-generator"))

  const iterator = countToFiveGenerator()
  t.deepEqual(
    await Promise.all([
      iterator.next(),
      iterator.next(),
      iterator.next(),
      iterator.next(true),
      iterator.next(),
      iterator.return(100),
      iterator.next(),
      iterator.return(10)
    ]),
    [
      { value: 1, done: false },
      { value: 2, done: false },
      { value: 3, done: false },
      { value: 1, done: false },
      { value: 2, done: false },
      { value: 100, done: true },
      { value: undefined, done: true },
      { value: 10, done: true }
    ]
  )
  await Thread.terminate(countToFiveGenerator)
})

test("can call throw() of an AsyncIterableIterator returned by a thread call", async t => {
  const countToFiveGenerator = await spawn<() => AsyncGenerator<number, number | undefined, boolean | undefined>>(new Worker("./workers/count-to-five-generator"))
  
  const iterator = countToFiveGenerator()
  t.deepEqual(
    await Promise.all([
      iterator.next(),
      iterator.next(),
      iterator.throw(new Error('error thrown with throw()')).catch(() => undefined),
      iterator.next(),
      iterator.next(),
      iterator.return(100),
      iterator.next(),
      iterator.return(10)
    ]),
    [
      { value: 1, done: false },
      { value: 2, done: false },
      undefined,
      { value: undefined, done: true },
      { value: undefined, done: true },
      { value: 100, done: true },
      { value: undefined, done: true },
      { value: 10, done: true }
    ]
  )
  await Thread.terminate(countToFiveGenerator)
})

test("can spawn a module thread", async t => {
  const counter = await spawn<Counter>(new Worker("./workers/counter"))
  t.is(await counter.getCount(), 0)
  await Promise.all([
    counter.increment(),
    counter.increment()
  ])
  t.is(await counter.getCount(), 2)
  await counter.decrement()
  t.is(await counter.getCount(), 1)
  await Thread.terminate(counter)
})

test("thread job errors are handled", async t => {
  const fail = await spawn<() => Promise<never>>(new Worker("./workers/faulty-function"))
  await t.throwsAsync(fail(), "I am supposed to fail.")
  await Thread.terminate(fail)
})

test("thread transfer errors are handled", async t => {
  const builtin = require('module').builtinModules;
  if (builtin.indexOf('worker_threads') > -1) {
    // test is actual for native worker_threads only
    const helloWorld = await spawn(new Worker("./workers/hello-world"))
    const badTransferObj = { fn: () => {} };
    await t.throwsAsync(helloWorld(badTransferObj), {name: 'DataCloneError'})
    await Thread.terminate(helloWorld)
  } else {
    t.pass();
  }
})

test("catches top-level thread errors", async t => {
  await t.throwsAsync(spawn(new Worker("./workers/top-level-throw")), "Top-level worker error")
})

test.todo("can subscribe to thread events")

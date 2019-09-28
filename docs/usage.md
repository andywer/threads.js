---
layout: article
title: Usage
permalink: /usage
excerpt: How to use the threads.js API, observables, thread pools and more.
aside:
  toc: true
---

## Introduction

Here is what a simple use case looks like.

```js
// master.js
import { spawn, Thread, Worker } from "threads"

async function main() {
  const add = await spawn(new Worker("./workers/add"))
  const sum = await add(2, 3)

  console.log(`2 + 3 = ${sum}`)

  await Thread.terminate(add)
}

main().catch(console.error)
```

```js
// workers/add.js
import { expose } from "threads/worker"

expose(function add(a, b) {
  return a + b
})
```

### spawn()

The return value of `add()` in the master code depends on the `add()` return value in the worker:

If the function returns a promise or an observable, then in the master code you will receive a promise or observable that proxies the one returned by the thread function.

If the function returns a primitive value, expect the master thread function to return a promise resolving to that value.

### expose()

Use `expose()` to make either a function or an object callable from the master thread.

In case of exposing an object, `spawn()` will asynchronously return an object exposing all the object's functions, following the same rules as functions directly `expose()`-ed.

## Basics

### Function thread

There are two kinds of threads – this is the first one. A function thread exposes a single function that can be called from the master thread.

```js
// master.js
import { spawn, Thread, Worker } from "threads"

const fetchGithubProfile = await spawn(new Worker("./workers/fetch-github-profile"))
const andywer = await fetchGithubProfile("andywer")

console.log(`User "andywer" has signed up on ${new Date(andywer.created_at).toLocaleString()}`)

await Thread.terminate(fetchGithubProfile)
```

```js
// workers/fetch-github-profile.js
import fetch from "isomorphic-fetch"
import { expose } from "threads/worker"

expose(async function fetchGithubProfile(username) {
  const response = await fetch(`https://api.github.com/users/${username}`)
  return response.json()
})
```

### Module thread

This is the second kind of thread. A module thread exposes an object whose values are functions. Use it if you want your thread to expose more than one function.

```js
// master.js
import { spawn, Thread, Worker } from "threads"

const counter = await spawn(new Worker("./workers/counter"))
await counter.increment()
await counter.increment()
await counter.decrement()

console.log(`Counter is now at ${await counter.getCount()}`)

await Thread.terminate(counter)
```

```js
// workers/counter.js
import { expose } from "threads/worker"

let currentCount = 0

const counter = {
  getCount() {
    return currentCount
  },
  increment() {
    return ++currentCount
  },
  decrement() {
    return --currentCount
  }
}

expose(counter)
```

### Error handling

Works fully transparent - the promise in the master code's call will be rejected with the error thrown in the worker, also yielding the worker error's stack trace.

```js
// master.js
import { spawn, Thread, Worker } from "threads"

const counter = await spawn(new Worker("./workers/counter"))

try {
  await counter.increment()
  await counter.increment()
  await counter.decrement()

  console.log(`Counter is now at ${await counter.getCount()}`)
} catch (error) {
  console.error("Counter thread errored:", error)
} finally {
  await Thread.terminate(counter)
}
```

## TypeScript

### Type-safe threads

When using TypeScript you can declare the type of a `spawn()`-ed thread:

```ts
// master.ts
import { spawn, Thread, Worker } from "threads"

type HashFunction = (input: string) => Promise<string>

const sha512 = await spawn<HashFunction>(new Worker("./workers/sha512"))
const hashed = await sha512("abcdef")
```

It's also easy to export the type from the worker module and use it when `spawn()`-ing:

```ts
// master.ts
import { spawn, Thread, Worker } from "threads"
import { Counter } from "./workers/counter"

const counter = await spawn<Counter>(new Worker("./workers/counter"))
await counter.increment()
```

```ts
// counter.ts
import { expose } from "threads/worker"

let currentCount = 0

const counter = {
  getCount() {
    return currentCount
  },
  increment() {
    return ++currentCount
  },
  decrement() {
    return --currentCount
  }
}

export type Counter = typeof counter

expose(counter)
```

### TypeScript workers

**In node.js without webpack** you can spawn `*.ts` workers out-of-the-box without prior transpiling if <a href="https://github.com/TypeStrong/ts-node" rel="nofollow">ts-node</a> is installed.

If the path passed to `new Worker()` resolves to a `*.ts` file, threads.js will check if `ts-node` is available. If so, it will create an in-memory module that wraps the actual worker module and initializes `ts-node` before running the worker code.

In case `ts-node` is not available, `new Worker()` will attempt to load the same file, but with a `*.js` extension. It is then in your hands to transpile the worker module before running the code.

**When building your app with webpack**, the module path will automatically be replaced with the path of the worker's resulting bundle file.

## Observables

### Returning observables

You can return observables in your worker. It works fully transparent - just subscribe to the returned observable in the master code. The returned observable is based on the [`zen-observable`](https://github.com/zenparsing/zen-observable) implementation.

Note that in contrast to the usual `zen-observable` behavior, the observable returned here is "hot". That means that if you subscribe to it twice, it will yield the same values, but won't run the thread twice. It also means, however, that if you subscribe to it late, you might miss data.

```js
// master.js
import { spawn, Thread, Worker } from "threads"

const counter = await spawn(new Worker("./workers/counter"))

counter.subscribe(newCount => console.log(`Counter incremented to:`, newCount))
```

```js
// workers/counter.js
import { expose } from "threads/worker"
import Observable from "zen-observable"

function startCounting() {
  return new Observable(observer => {
    for (let currentCount = 1; currentCount <= 10; currentCount++) {
      observer.next(currentCount)
    }
    observer.complete()
  })
}

expose(startCounting)
```

### Observable subjects

As described earlier, we can always return observables from our threads. While observables usually isolate the code that create observable events from the surrounding code, we do provide a way to trigger updates to the observable "from the outside".

Using `Subject` we can create objects that implement the `Observable` interface, allowing other code to `.subscribe()` to it, while also exposing `.next(value)`, `.complete()` and `.error(error)`, so we can trigger those observable updates "from outside".

In a nutshell:

```js
const observable = new Observable(observer => {
  // We can call `.next()`, `.error()`, `.complete()` only here
  // as they are only exposed on the `observer`
  observer.complete()
})

const subject = new Subject()
subject.complete()
// We are free to call `.next()`, `.error()`, `.complete()` from anywhere now
// Beware: With great power comes great responsibility! Don't write spaghetti code.
```

Subscribing still works the same:

```js
const subscriptionOne = observable.subscribe(/* ... */)
subscriptionOne.unsubscribe()

const subscriptionTwo = subject.subscribe(/* ... */)
subscriptionTwo.unsubscribe()
```

To get a plain observable that proxies all values, errors, completion of the
subject, but does not expose the `.next()`, ... methods, use `Observable.from()`:

```js
// The returned observable will be read-only
return Observable.from(subject)
```

### Streaming results

We can easily use observable subjects to stream results as they are computed.

```js
// master.js
import { spawn, Thread, Worker } from "threads"

const minmax = await spawn(new Worker("./workers/minmax"))
minmax.values().subscribe(values => console.log(`Min: ${values.min}  Max: ${values.max}`))

await minmax.push(2)
await minmax.push(3)
await minmax.push(4)
await minmax.push(1)
await minmax.push(5)
await minmax.finish()

await Thread.terminate(minmax)
```

```js
// minmax.js
import { Subject } from "threads/observable"
import { expose } from "threads/worker"

let max = -Infinity
let min = Infinity

let subject = new Subject()

const minmax = {
  finish() {
    subject.complete()
    subject = new Subject()
  },
  push(value) {
    max = Math.max(max, value)
    min = Math.min(min, value)
    subject.next({ max, min })
  },
  values() {
    return Observable.from(subject)
  }
}

expose(minmax)
```

## Thread pool

### Basics

A `Pool` allows you to create a set of worker threads and queue thread calls. The queued tasks are pulled from the queue and executed as previous tasks have finished.

Use it if you have a lot of work to offload to other threads and don't want to drown them in a huge pile of work at once, but run it in a controlled way with limited concurrency.

```js
import { spawn, Pool } from "threads"

const pool = Pool(() => spawn(new Worker("./workers/multiplier")), 8 /* optional size */)

pool.queue(async multiplier => {
  const multiplied = await multiplier(2, 3)
  console.log(`2 * 3 = ${multiplied}`)
})

await pool.completed()
await pool.terminate()
```

Note that `pool.queue()` will schedule a task to be run in a deferred way. It might execute straight away or it might take a while until a new worker thread becomes available.

When a pool worker finishes a job, the next pool job is de-queued (that is the function you passed to `pool.queue()`). It is called with the worker as the first argument. The job function is supposed to return a promise - when this promise resolves, the job is considered done and the next job is de-queued and dispatched to the worker.

The promise returned by `pool.completed()` will resolve once the scheduled callbacks have been executed and completed. A failing job will also make the promise reject.

### Cancel a queued task

You can cancel queued tasks, too. If the pool has already started to execute the task, you cannot cancel it anymore, though.

```js
const task = pool.queue(multiplier => multiplier(2, 3))
task.cancel()
```

## Transferable objects

Use `Transfer()` to mark [transferable objects](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers#Passing_data_by_transferring_ownership_(transferable_objects)) like ArrayBuffers to be transferred to the receiving thread. It can speed up your code a lot if you are working with big pieces of binary data.

`Transfer()` comes in two flavors:
* `Transfer(myBuffer: Transferable)`
* `Transfer(arrayOrObjectContainingBuffers: any, [myBuffer]: Transferable[])`

Use it when calling a thread function or returning from a thread function:

```js
// master.js
import { spawn, Transfer, Worker } from "threads"

const xorBuffer = await spawn(new Worker("./workers/arraybuffer-xor"))
const resultBuffer = await xorBuffer(Transfer(testData), 127)
```

```js
// workers/arraybuffer-xor.js
import { expose, Transfer } from "threads/worker"

expose(function xorBuffer(username) {
  const view = new Uint8Array(buffer)
  view.forEach((byte, offset) => view.set([byte ^ value], offset))
  return Transfer(buffer)
})
```

Without `Transfer()` the buffers would be copied on every call and every return. Using `Transfer()` their ownership is transferred to the other thread instead only, to make sure it is accessible in a thread-safe way. This is a much faster operation.

## Thread events

Every spawned thread emits events during its lifetime that you can subscribe to. This can be useful for debugging.

```js
import { spawn, Thread, Worker } from "threads"

const myThread = await spawn(new Worker("./mythread"))

Thread.events(myThread).subscribe(event => console.log("Thread event:", event))
```

There is a specialized function to subscribe only to thread error events:

```js
Thread.errors(myThread).subscribe(error => console.log("Thread error:", error))
```

## Debug logging

We are using the [`debug`](https://github.com/visionmedia/debug) package to provide opt-in debug logging. All the package's debug messages have a scope starting with `threads:`, with different sub-scopes:

- `threads:master:messages`
- `threads:master:spawn`
- `threads:master:thread-utils`
- `threads:pool:${poolName || poolID}`

Set it to `DEBUG=threads:*` to enable all the library's debug logging. To run its tests with full debug logging, for instance:

```
DEBUG=threads:* npm test
```

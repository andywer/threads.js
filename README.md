<h1 align="center">threads</h1>
<p align="center">
  <a href="https://travis-ci.org/andywer/threads.js" target="_blank"><img alt="Build status" src="https://img.shields.io/travis/andywer/threads.js/v1.svg?style=flat-square"></a>
  <a href="https://www.npmjs.com/package/threads" target="_blank"><img alt="npm (tag)" src="https://img.shields.io/npm/v/threads.svg?style=flat-square"></a>
</p>

Offload CPU-intensive tasks to worker threads in node.js, web browsers and electron using one uniform API.

Uses web workers in the browser, `worker_threads` in node 12+ and [`tiny-worker`](https://github.com/avoidwork/tiny-worker) in node 8 to 11.

### Features

* **Speed up** code by parallel processing
* **Keep UI responsive** by offloading work from rendering thread
* First-class support for **async functions** & **observables**
* Manage bulk task executions with **thread pools**
* Works great with **webpack**

### Version 0.x

You can find the old version 0.12 on the [`v0` branch](https://github.com/andywer/threads.js/tree/v1). All the content on this page refers to version 1.0 which is a rewrite of the library with a whole new API.

## Installation

```
npm install threads tiny-worker
```

*You only need to install the `tiny-worker` package to support node.js < 12. It's an optional dependency and used as a fallback if `worker_threads` are not available.*

<details>
<summary>Run on node.js</summary>

<p></p>

Running code using threads.js in node works out of the box.

Note that we wrap the native `Worker`, so `new Worker("./foo/bar")` will resolve the path relative to the module that calls it, not relative to the current working directory.

That aligns it with the behavior when bundling the code with webpack or parcel.

</details>

<details>
<summary>Webpack build setup</summary>

#### Webpack config

Use with the [`threads-plugin`](https://github.com/andywer/threads-plugin). It will transparently detect all `new Worker("./unbundled-path")` expressions, bundles the worker code and replaces the `new Worker(...)` path with the worker bundle path, so you don't need to explicitly use the `worker-loader` or define extra entry points.

```sh
  npm install -D threads-plugin
```

Then add it to your `webpack.config.js`:

```diff
+ const ThreadsPlugin = require('threads-plugin');

  module.exports = {
    // ...
    plugins: [
+     new ThreadsPlugin()
    ]
    // ...
  }
```

#### Node.js bundles

If you are using webpack to create a bundle that will be run in node (webpack config `target: "node"`), you also need to specify that the `tiny-worker` package used for node < 12 should not be bundled:

```diff
  module.exports = {
    // ...
+   externals: {
+     "tiny-worker": "tiny-worker"
+   }
    // ...
}
```

Make sure that `tiny-worker` is listed in your `package.json` `dependencies` in that case.

#### When using TypeScript

Make sure the TypeScript compiler keeps the `import` / `export` statements intact, so webpack resolves them. Otherwise the `threads-plugin` won't be able to do its job.

```diff
  module.exports = {
    // ...
    module: {
      rules: [
        {
          test: /\.ts$/,
          loader: "ts-loader",
+         options: {
+           compilerOptions: {
+             module: "esnext"
+           }
+         }
        }
      ]
    },
    // ...
  }
```

</details>

<details>
<summary>Parcel bundler setup</summary>

<p></p>

You need to import `threads/register` once at the beginning of your application code (in the master code, not in the workers):

```diff
  import { spawn } from "threads"
+ import "threads/register"

  // ...

  const work = await spawn(new Worker("./worker"))
```

This registers the library's `Worker` implementation for your platform as the global `Worker`. This is necessary, since you cannot `import { Worker } from "threads"` or Parcel won't recognize `new Worker()` as a web worker anymore.

Be aware that this might affect any code that tries to instantiate a normal web worker `Worker` and now instead instantiates a threads.js `Worker`. The threads.js `Worker` is just a web worker with some sugar on top, but that sugar might have unexpected side effects on third-party libraries.

Everything else should work out of the box.

</details>

## Getting Started

### Basics

```js
// master.js
import { spawn, Thread, Worker } from "threads"

async function main() {
  const add = await spawn(new Worker("./workers/add"))
  const sum = await add(2, 3)

  console.log(`2 + 3 = ${sum}`)

  await Thread.terminate(sum)
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

If the function returns a promise or an observable then you can just use the return value as such in the master code. If the function returns a primitive value, expect the master function to return a promise resolving to that value.

### expose()

Use `expose()` to make either a function or an object callable from the master thread.

In case of exposing an object, `spawn()` will asynchronously return an object exposing all the object's functions, following the same rules as functions directly `expose()`-ed.

## Usage

<details>
<summary>Basics - Function thread</summary>

<p></p>

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
</details>

<details>
<summary>Basics - Module thread</summary>

<p></p>

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

</details>

<details>
<summary>Basics - TypeScript</summary>

<p></p>

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

</details>

<details>
<summary>Basics - Error handling</summary>

<p></p>

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

</details>

<details>
<summary>Basics - Returning observables</summary>

<p></p>

You can return observables in your worker. It works fully transparent - just subscribe to the returned observable in the master code. The returned observable is based on the [`zen-observable`](https://github.com/zenparsing/zen-observable) implementation.

Note that in contrast to the usual `zen-observable` behavior, the observable returned here is "hot". That means that if you subscribe to it twice, it will yield the same values, but won't run the thread twice. It also means, however, that if you subscribe to it late, you might miss data.

```js
// master.js
import { spawn, Thread, Worker } from "threads"

const counter = await spawn(new Worker("./workers/counter"))
const counting = counter()

counting.subscribe(newCount => console.log(`Counter incremented to:`, newCount))
await counting

await Thread.terminate(counter)
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

</details>

<details>
<summary>Thread pool</summary>

<p></p>

A `Pool` allows you to create a set of worker threads and queue thread calls. The queued tasks are pulled from the queue and executed as previous tasks have finished.

Use it if you have a lot of work to offload to other threads and don't want to drown them in a huge pile of work at once, but run it in a controlled way with limited concurrency.

```js
import { spawn, Pool } from "threads"

const pool = Pool(() => spawn(new Worker("./workers/multiplier")), 8 /* optional size */)

pool.events().subscribe(console.log)

pool.queue(async multiplier => {
  const multiplied = await multiplier(2, 3)
  console.log(`2 * 3 = ${multiplied}`)

  // When this async call completes, the worker thread (`multiplier`) will
  // be marked as available for new work scheduled via `pool.queue()`
})

await pool.completed()
await pool.terminate()
```

Note that `pool.queue()` will schedule a task to be run in a deferred way. It might execute straight away or it might take a while until a new worker thread becomes available.

The promise returned by `pool.completed()` will resolve once the scheduled callbacks have been executed and completed. A failing job will also make the promise reject.

You can cancel queued tasks, too. If the pool has already started to execute the task, you cannot cancel it anymore, though.

```js
const task = pool.queue(multiplier => multiplier(2, 3))
task.cancel()
```

</details>

<details>
<summary>Transferable objects</summary>

<p></p>

Use `Transfer()` to mark [`transferable objects`](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers#Passing_data_by_transferring_ownership_(transferable_objects)) like ArrayBuffers to be transferred to the receiving thread. It can speed up your code a lot if you are working with big chunks of binary data.

`Transfer()` comes in two flavors:
* `Transfer(myBuffer: Transferable)`
* `Transfer(someObjectOrArrayContainingMyBuffers: any, [myBuffer, /* ... */]: Transferable[])`

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

Without `Transfer()` the buffers would be copied on every call and every return. Using `Transfer()` only their ownership is transferred to the other thread instead to make sure it is accessible in a thread-safe way. This is a much faster operation.

</details>

<details>
<summary>Observable subjects</summary>

<p></p>

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

</details>

<details>
<summary>Basics - Streaming</summary>

<p></p>

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

</details>

<details>
<summary>Subscribe to thread events</summary>

<p></p>

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

</details>

<details>
<summary>Tests</summary>

<p></p>

Check out the [integration tests](./test) and [their workers](./test/workers) to see it in action.

</details>

<!--
## API

TODO
-->

## Debug

We are using the [`debug`](https://github.com/visionmedia/debug) package to provide opt-in debug logging. All the package's debug messages have a scope starting with `threads:`, with different sub-scopes:

- `threads:master:messages`
- `threads:master:spawn`
- `threads:master:thread-utils`
- `threads:pool:${poolName || poolID}`

Set it to `DEBUG=threads:*` to enable all the library's debug logging. To run its tests with full debug logging, for instance:

```
DEBUG=threads:* npm test
```

## License

MIT

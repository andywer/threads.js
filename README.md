# threads

Version 1.0 - Work in progress.

Here you can find a complete rewrite of the `threads` library.

Comes with a new robust API, it's all functional, and all statically typed. It's still fully isomorphic - run the same code in the browser, in node.js or an electron app!

New paradigm: Full focus on worker code in separate modules instead of inline functions.
Running inlined functions in a worker was nice for concise code samples, but offered limited value in real-world applications.

## Installation

Not yet published to npm.

## Compatibility

#### Platform: Web (browsers)

Use [web workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API).

#### Platform: Node.js 12+

Use native [worker threads](https://nodejs.org/api/worker_threads.html).

#### Platform: Node.js < 12

Use [`tiny-worker`](https://github.com/avoidwork/tiny-worker) as fallback if native worker threads are not available.

## Usage

### Concept

```js
// master.js
import { spawn, Thread, Worker } from "threads"

const add = await spawn(new Worker("./workers/add"))
const sum = await add(2, 3)

console.log(`2 + 3 = ${sum}`)

await Thread.terminate(sum)
```

```js
// workers/add.js
import { expose } from "threads/worker"

expose(function add(a, b) {
  return a + b
})
```

### Code Samples

<details>
<summary>Basics - Function thread</summary>

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
import { expose } from "../../src/worker"

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
<summary>TODO: Basics - Returning observables</summary>

Just return an observable in your worker, subscribe to it in the master code. Fully transparent.
</details>

<details>
<summary>TODO: Basics - Error handling</summary>

Fully transparent. The promise in the master code's call will be rejected with the error thrown in the worker, also yielding the worker error's stack trace.
</details>

<details>
<summary>TODO: Cancelling a thread job</summary>
</details>

<details>
<summary>TODO: Thread pool & Task queue</summary>
</details>

<details>
<summary>TODO: Subscribe to thread debugging events</summary>
</details>

<details>
<summary>Tests</summary>

Check out the [integration tests](./test) and [their workers](./test/workers) to see it in action.
</details>

### Usage with node.js

Works out of the box. Note that we wrap the native `Worker`, so `new Worker("./foo/bar")` will resolve the path relative to the module that calls it, not relative to the current working directory.

That aligns it with the behavior when bundling the code with webpack or parcel.

### Usage with Webpack

TODO

### Usage with Parcel

TODO

## API

TODO

## Debug

We are using the [`debug`](https://github.com/visionmedia/debug) package to provide opt-in debug logging. All the package's debug messages have a scope starting with `threads:`, with different sub-scopes.

Set it to `DEBUG=threads:*` to enable all the library's debug logging. To run its tests with full debug logging, for instance:

```
DEBUG=threads:* npm test
```

## License

MIT

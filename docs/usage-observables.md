---
layout: article
title: Observables
permalink: /usage-observables
excerpt: How to stream results from workers.
sidebar:
  nav: sidebar
aside:
  toc: true
---

## Basics

### Returning observables

You can return observables in your worker. It works fully transparent - just subscribe to the returned observable in the master code. The returned observable is based on the [`zen-observable`](https://github.com/zenparsing/zen-observable) implementation.

```js
// master.js
import { spawn, Thread, Worker } from "threads"

const counter = await spawn(new Worker("./workers/counter"))

counter().subscribe(newCount => console.log(`Counter incremented to:`, newCount))
```

```js
// workers/counter.js
import { Observable } from "observable-fns"
import { expose } from "threads/worker"

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

### Hot observables

Note that in contrast to the default Observable behavior, the observable returned here is "hot". That means that if you subscribe to it twice, the second subscription will mirror the first one, yielding the same values without subscribing to the data source a second time.

It will **not** replay values from the past, in case the second subscriber subscribes after the first one has already received values.

## Observable subjects

As described earlier, we can always return observables from our workers. While observables usually isolate the code that create observable events from the surrounding code, we do provide a way to trigger updates to the observable "from the outside".

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

## Streaming results

We can easily use observable subjects to stream results as they are computed.

```js
// master.js
import { spawn, Thread, Worker } from "threads"

const minmax = await spawn(new Worker("./workers/minmax"))

minmax.values().subscribe(({ min, max }) => {
  console.log(`Min: ${min} | Max: ${max}`)
})

await minmax.add(2)
await minmax.add(3)
await minmax.add(4)
await minmax.add(1)
await minmax.add(5)
await minmax.finish()

await Thread.terminate(minmax)
```

```js
// minmax.js
import { Observable, Subject } from "threads/observable"
import { expose } from "threads/worker"

let max = -Infinity
let min = Infinity

let subject = new Subject()

const minmax = {
  finish() {
    subject.complete()
    subject = new Subject()
  },
  add(value) {
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

And there we go! A simple worker that keeps track of the minimum and maximum value passed to it, yielding observable updates we can subscribe to. The updated values will be streamed as they happen.

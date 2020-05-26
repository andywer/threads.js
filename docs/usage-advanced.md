---
layout: article
title: Advanced
permalink: /usage-advanced
excerpt: How to send transferable objects and debug workers.
sidebar:
  nav: sidebar
aside:
  toc: true
---

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

expose(function xorBuffer(buffer, value) {
  const view = new Uint8Array(buffer)
  view.forEach((byte, offset) => view.set([byte ^ value], offset))
  return Transfer(buffer)
})
```

Without `Transfer()` the buffers would be copied on every call and every return. Using `Transfer()` their ownership is transferred to the other thread instead only, to make sure it is accessible in a thread-safe way. This is a much faster operation.

You can use transferable objects with observables, too.

```js
import { expose, Observable, Transfer } from "threads/worker"
import { DataSource } from "./my-data-source"

expose(function streamBuffers() {
  return new Observable(observer => {
    const datasource = new DataSource()
    datasource.on("data", arrayBuffer => observer.next(Transfer(arrayBuffer)))
    return () => datasource.close()
  })
})
```

## Task queue

It is a fairly common use case to have a lot of work that needs to be done by workers, but is just too much to be run efficiently at once. You will need to schedule tasks and have them dispatched and run on workers in a controlled fashion.

Threads.js does not provide a distinct task queue implementation, but it comes with [thread pools](./usage-pool.md) that covers the task queue functionality and more. Create a `Pool` and `.queue()` tasks to be dispatched to workers as they finish previous tasks.

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

## Custom message serializers

Usually you can only pass values between threads that can be processed by the [Structured clone algorithm](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm). That means you cannot pass functions and if you pass an instance of some class, you will on the other end receive a plain object that's no longer an instance of that class.

You can however define and register custom serializers to provide support for passing instances of classes and other complex data that would not work out-of-the-box.

First you need to implement your serializer. Fortunately, this is pretty straight-forward.

```typescript
import { SerializerImplementation } from "threads"

interface SerializedMyClass {
  __type: "$$MyClass"
  state: string
}

class MyClass {
  state: string

  constructor(initialState: string) {
    this.state = initialState
  }

  doStuff() {
    // Do fancy things
  }

  serialize(): SerializedMyClass {
    return {
      __type: "$$MyClass",
      state: this.state
    }
  }

  static deserialize(message: SerializedMyClass) {
    return new MyClass(message.state)
  }
}

const MySerializer: SerializerImplementation = {
  deserialize(message, defaultHandler) {
    if (message && message.__type === "$$MyClass") {
      return MyClass.deserialize(message as any)
    } else {
      return defaultHandler(message)
    }
  },
  serialize(thing, defaultHandler) {
    if (thing instanceof MyClass) {
      return thing.serialize()
    } else {
      return defaultHandler(thing)
    }
  }
}
```

Finally, register your serializer in both the main thread and the worker. Register it early, before you `spawn()` or `expose()` anything.

```typescript
import { registerSerializer } from "threads"
// also exported from the worker sub-module:
// import { registerSerializer } from "threads/worker"

registerSerializer(MySerializer)
```

You can also register multiple serializers. Just call `registerSerializer()` multiple times – make sure to register the same serializers in the worker and main thread.

The registered serializers will then be chained. The serializer that was registered at last is invoked first. If it does not know how to serialize the data, it will call its fallback handler which is the second-to-last serializer and so forth.

```typescript
import { registerSerializer } from "threads"

registerSerializer(SomeSerializer)
registerSerializer(AnotherSerializer)

// threads.js will first try to use AnotherSerializer, will fall back to SomeSerializer,
// eventually falls back to passing the data as is if no serializer can handle it
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

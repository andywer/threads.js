---
layout: article
title: Thread pools
permalink: /usage-pool
excerpt: How to use thread pools.
sidebar:
  nav: sidebar
aside:
  toc: true
---

## Pool basics

A `Pool` allows you to create a set of workers and queue worker calls. The queued tasks are pulled from the queue and executed as previous tasks are finished.

Use it if you have a lot of work to offload to workers and don't want to drown them in a pile of work at once, but run those tasks in a controlled way with limited concurrency.

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

## Pool creation

```ts
interface PoolOptions {
  concurrency?: number
  maxQueuedJobs?: number
  name?: string
  size?: number
}

function Pool(threadFactory: () => Thread, size?: number): Pool
function Pool(threadFactory: () => Thread, options?: PoolOptions): Pool
```

The first argument passed to the `Pool()` factory must be a function that spawns a worker thread of your choice. The pool will use this function to create its workers.

The second argument is optional and can either be the number of workers to spawn as a `number` or an options object (see `PoolOptions`):

- `options.concurrency`: number of tasks to run simultaneously per worker, defaults to one
- `options.maxQueuedJobs`: maximum number of tasks to queue before throwing on `.queue()`, defaults to unlimited
- `options.name`: give the pool a custom name to use in the debug log, so you can tell multiple pools apart when debugging
- `options.size`: number of workers to spawn, defaults to the number of CPU cores

## Scheduling tasks

```ts
let pool: Pool<ThreadType>
type TaskFunction<ThreadType, T> = (thread: ThreadType) => Promise<T> | T

pool.queue<T>(task: TaskFunction<ThreadType, T>): Promise<T>
```

The promise returned by `pool.queue()` resolves or rejects when the queued task function has been run and resolved / rejected. That means *you should usually not `await` that promise straight away* when calling `pool.queue()`, since the code after this line will then not be run until the task has been run and completed.

Whenever a pool worker finishes a job, the next pool job is de-queued (that is the function you passed to `pool.queue()`). It is called with the worker as the first argument. The job function is supposed to return a promise - when this promise resolves, the job is considered done and the next job is de-queued and dispatched to the worker.

The promise returned by `pool.completed()` will resolve once the scheduled callbacks have been executed and completed. A failing job will also make the promise reject.

## Cancelling a queued task

You can cancel queued tasks, too. If the pool has already started to execute the task, you cannot cancel it anymore, though.

```js
const task = pool.queue(multiplierWorker => multiplierWorker(2, 3))
task.cancel()
```

## Pool termination

```js
// Terminate gracefully
pool.terminate()

// Force-terminate pool workers
pool.terminate(true)
```

By default the pool will wait until all scheduled tasks have completed before terminating the workers. Pass `true` to force-terminate the pool immediately.

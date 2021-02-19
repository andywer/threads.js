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
import { spawn, Pool, Worker } from "threads"

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

The promise returned by `pool.completed()` will resolve once the scheduled callbacks have been executed and completed. A failing job will make the promise reject. Use `pool.settled()` if you need a promise that resolves without an error even if a task has failed.

## Handling task results

Track a pooled task via the object that the `pool.queue()` promise resolves to. You can `await pool.queue()` to obtain the job's result. Be aware, though, that if you `await` the result directly on queueing, you will only queue another job after this one has finished. You might rather want to `pool.queue().then()` to defer handling the outcome and keep queueing tasks uninterruptedly.

```js
import { spawn, Pool, Worker } from "threads"

const pool = Pool(() => spawn(new Worker("./workers/crytpo")))
const task = pool.queue(crypto => crypto.encrypt("some-password"))

task.then(result => {
  // do something with the result 
})

await pool.completed()
await pool.terminate()
```

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

## Waiting for tasks to complete

The pool comes with two methods that allow `await`-ing the completion of all tasks.

The first one is `pool.completed()`. It returns a promise that resolves once all tasks have been executed and there are no more tasks left to run. If a task fails, the promise will be rejected.

The second one is `pool.settled()`. It also returns a promise that resolves when all tasks have been executed, but it will also resolve instead of reject if a task fails. The returned promise resolves to an array of errors.

As outlined before, pool tasks provide a Promise-like `.then()` method. You can use it to await the completion of a subset of a pool's queued tasks only.

```ts
// (Created a pool and queued other pool tasks before…)

const myTasks: QueuedTask[] = []

for (let input = 0; input < 5; input++) {
  const task = pool.queue(worker => worker.work(input))
  myTasks.push(task)
}

await Promise.all(myTasks)
console.log("All worker.work() tasks have completed. Other pool tasks might still be running.")
```

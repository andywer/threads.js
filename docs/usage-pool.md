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

When a pool worker finishes a job, the next pool job is de-queued (that is the function you passed to `pool.queue()`). It is called with the worker as the first argument. The job function is supposed to return a promise - when this promise resolves, the job is considered done and the next job is de-queued and dispatched to the worker.

The promise returned by `pool.completed()` will resolve once the scheduled callbacks have been executed and completed. A failing job will also make the promise reject.

## Cancel a queued task

You can cancel queued tasks, too. If the pool has already started to execute the task, you cannot cancel it anymore, though.

```js
const task = pool.queue(multiplier => multiplier(2, 3))
task.cancel()
```

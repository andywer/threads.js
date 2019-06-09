import test from "ava"
import { spawn, Pool, Worker } from "../src/index"
import { PoolEventType } from "../src/master/pool";

test.serial("thread pool basics work and events are emitted", async t => {
  const events: Pool.Event[] = []
  let spawnCalled = 0
  let taskFnCalled = 0

  const spawnHelloWorld = () => {
    spawnCalled++
    return spawn<() => string>(new Worker("./workers/hello-world"))
  }
  const pool = Pool(spawnHelloWorld, 4)
  pool.events().subscribe(event => events.push(event))

  // Just to make sure all worker threads are initialized before starting to queue
  // This is only necessary for testing to make sure that this is the first event recorded
  await new Promise((resolve, reject) => {
    pool.events()
      .filter(event => event.type === PoolEventType.initialized)
      .subscribe(resolve, reject)
  })

  await pool.queue(async helloWorld => {
    taskFnCalled++
    const result = await helloWorld()
    t.is(result, "Hello World")
    return result
  })
  await pool.terminate()
  t.is(spawnCalled, 4)
  t.is(taskFnCalled, 1)
  t.deepEqual(events, [
    {
      type: Pool.EventType.initialized,
      size: 4
    },
    {
      type: Pool.EventType.taskQueued,
      taskID: 1
    },
    {
      type: Pool.EventType.taskStart,
      taskID: 1,
      workerID: 1
    },
    {
      type: Pool.EventType.taskCompleted,
      returnValue: "Hello World",
      taskID: 1,
      workerID: 1
    },
    {
      type: Pool.EventType.terminated,
      remainingQueue: []
    }
  ])
})

test.serial("pool.completed() works", async t => {
  const returned: any[] = []

  const spawnHelloWorld = () => spawn(new Worker("./workers/hello-world"))
  const pool = Pool(spawnHelloWorld, 2)

  for (let i = 0; i < 3; i++) {
    pool.queue(async helloWorld => {
      returned.push(await helloWorld())
    })
  }

  await pool.completed()

  t.deepEqual(returned, [
    "Hello World",
    "Hello World",
    "Hello World"
  ])
})

test.serial("pool.completed(true) works", async t => {
  const spawnHelloWorld = () => spawn(new Worker("./workers/hello-world"))
  const pool = Pool(spawnHelloWorld, 2)

  await pool.completed(true)
  t.pass()
})

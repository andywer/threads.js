import test from "ava"
import { spawn, Callback, Thread, Worker } from "../src/index"
import { AsyncGenerator } from "./workers/async-generator"
import { Generator } from "./workers/generator"

test("can use a generator function exposed by a worker", async t => {
  const generate = await spawn<Generator>(new Worker("./workers/generator"))

  try {
    const results: number[] = []

    for await (const i of await generate(3)) {
      results.push(i)
    }

    t.deepEqual(results, [1, 2, 3])
  } finally {
    await Thread.terminate(generate)
  }
})

test("can use an async generator function exposed by a worker", async t => {
  const generate = await spawn<AsyncGenerator>(new Worker("./workers/async-generator"))

  try {
    const results: number[] = []

    for await (const i of await generate(3)) {
      results.push(i)
    }

    t.deepEqual(results, [1, 2, 3])
  } finally {
    await Thread.terminate(generate)
  }
})

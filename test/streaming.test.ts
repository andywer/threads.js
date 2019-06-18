import test from "ava"
import { spawn, Thread, Worker } from "../src/index"

test("can use worker returning an observable subject", async t => {
  const captured: Array<{ min: number, max: number }> = []

  const minmax = await spawn(new Worker("./workers/minmax"))
  minmax.values().subscribe(values => captured.push(values))

  await minmax.push(2)
  await minmax.push(3)
  await minmax.push(4)
  await minmax.push(1)
  await minmax.push(5)
  await minmax.finish()

  await Thread.terminate(minmax)
  t.deepEqual(captured, [
    { min: 2, max: 2 },
    { min: 2, max: 3 },
    { min: 2, max: 4 },
    { min: 1, max: 4 },
    { min: 1, max: 5 }
  ])
})

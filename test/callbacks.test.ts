import test from "ava"
import { spawn, Callback, Thread, Worker } from "../src/index"
import { MapWorker } from "./workers/map"

test("can register, use and release a callback", async t => {
  const callback = Callback((x: number) => x * 2)
  const map = await spawn<MapWorker>(new Worker("./workers/map"))

  try {
    const mapped = await map([1, 2, 3], callback)
    t.deepEqual(mapped, [2, 4, 6])
    callback.release()
  } finally {
    await Thread.terminate(map)
  }
})

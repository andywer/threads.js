import { spawn, Pool, Worker } from "../../src/index"

type HelloWorker = (text: string) => string

async function test() {
  const pool = await Pool(() => spawn<HelloWorker>(new Worker("./worker")))
  const results = await Promise.all([
    pool.queue(hello => hello("World")),
    pool.queue(hello => hello("World")),
    pool.queue(hello => hello("World")),
    pool.queue(hello => hello("World"))
  ])
  await pool.terminate()

  for (const result of results) {
    if (result !== "Hello, World") {
      throw Error("Unexpected result returned by worker: " + result)
    }
  }
}

export default test

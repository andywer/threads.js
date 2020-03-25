import { isWorkerRuntime, spawn, Pool, Worker } from "../../src/index"

type AdditionWorker = (a: number, b: number) => number
type HelloWorker = (text: string) => string

async function test() {
  const pool = Pool(() => spawn<HelloWorker>(new Worker("./pool-worker")))
  const results = await Promise.all([
    pool.queue(hello => hello("World")),
    pool.queue(hello => hello("World")),
    pool.queue(hello => hello("World")),
    pool.queue(hello => hello("World"))
  ])
  await pool.terminate()

  for (const result of results) {
    if (result !== "Hello, World") {
      throw Error("Unexpected result returned by pool worker: " + result)
    }
  }
}

async function test2() {
  // We also want to test if referencing multiple different workers in a module
  // built using webpack works

  const add = await spawn<AdditionWorker>(new Worker("./addition-worker"))
  const result = await add(2, 3)

  if (result !== 5) {
    throw Error("Unexpected result returned by addition worker: " + result)
  }
}

async function test3() {
  if (!(process as any).browser) {
    // Running workers from remote URLs is disabled in node.js
    return
  }

  const hello = await spawn<HelloWorker>(new Worker("https://infallible-turing-115958.netlify.com/hello-worker.js"))
  const result = await hello("World")

  if (result !== "Hello, World") {
    throw Error("Unexpected result returned by hello worker: " + result)
  }
}

function test4() {
  if (isWorkerRuntime() !== false) {
    throw Error("Expected isWorkerRuntime() to return false. Got: " + isWorkerRuntime())
  }
}

export default () => Promise.all([
  test(),
  test2(),
  test3(),
  test4()
])

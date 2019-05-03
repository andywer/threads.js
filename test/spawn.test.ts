import test from "ava"
import { spawn, Thread, Worker } from "../src/index"

test("can spawn and terminate a thread", async t => {
  const helloWorld = await spawn<() => string>(new Worker("./workers/hello-world"))
  t.is(await helloWorld(), "Hello World")
  await Thread.terminate(helloWorld)
  t.pass()
})

test.todo("can call a function thread more than once")
test.todo("can subscribe to an observable returned by a thread call")
test.todo("can spawn a module thread")
test.todo("can subscribe to thread errors")
test.todo("can subscribe to thread events")

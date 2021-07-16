import test from "ava"
import { createWorker } from '../src/createWorker'
import { spawn, Thread } from "../src/index"

test("createWorker web", async t => {
  const worker = await createWorker("./workers/hello-world", "web")
  const helloWorld = await spawn(worker)
  t.is(await helloWorld(), "Hello World")
  await Thread.terminate(helloWorld)
  t.pass()
})

test("createWorker node", async t => {
  const worker = await createWorker("./workers/hello-world", "node")
  const helloWorld = await spawn(worker)
  t.is(await helloWorld(), "Hello World")
  await Thread.terminate(helloWorld)
  t.pass()
})

test("createWorker tiny", async t => {
  const worker = await createWorker("./workers/hello-world", "tiny")
  const helloWorld = await spawn(worker)
  t.is(await helloWorld(), "Hello World")
  await Thread.terminate(helloWorld)
  t.pass()
})

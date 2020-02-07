import test from "ava"
import { fooSerializer, Foo } from "./lib/serialization"
import { registerSerializer, spawn, Thread, Worker } from "../src/index"

registerSerializer(fooSerializer)

test("can use a custom serializer", async t => {
  const run = await spawn(new Worker("./workers/serialization.ts"))

  try {
    const input = new Foo("Test")
    const result: Foo<string> = await run(input)

    t.true(result instanceof Foo)
    t.is(result.getValue(), "TestTest")
  } finally {
    await Thread.terminate(run)
  }
})

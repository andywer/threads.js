import test from "ava"
import { spawn, Thread, Transfer, TransferDescriptor, Worker } from "../src/index"
import { XorBuffer } from "./workers/arraybuffer-xor"

type SpyInit<Args extends any[], OriginalReturn, NewReturn> =
  (originalFn: (...args: Args) => OriginalReturn) =>
  (...args: Args) =>
  NewReturn

const arrayBufferPlaceholder = Symbol("ArrayBufferPlaceholder")

function spyOn<Args extends any[], OriginalReturn, NewReturn>(
  target: ((...args: Args) => OriginalReturn),
  spy: SpyInit<Args, OriginalReturn, NewReturn>
): (...args: Args) => NewReturn {
  return spy(target)
}

function replaceArrayBufferWithPlaceholder<In extends any>(obj: In, arrayBuffer: ArrayBuffer): In extends ArrayBuffer ? (In | typeof arrayBufferPlaceholder) : In {
  if ((obj as any) === arrayBuffer) {
    return arrayBufferPlaceholder as any
  } else if (Array.isArray(obj)) {
    return (obj as any[]).map(element => replaceArrayBufferWithPlaceholder(element, arrayBuffer)) as any
  } else if (obj && typeof obj === "object") {
    const result: In = Object.create(Object.getPrototypeOf(obj))

    for (const key of Object.getOwnPropertyNames(obj)) {
      (result as any)[key] = replaceArrayBufferWithPlaceholder((obj as any)[key], arrayBuffer)
    }
    return result as any
  } else {
    return obj as any
  }
}

test("can pass transferable objects on thread call", async t => {
  const testData = new ArrayBuffer(64)

  const worker = new Worker("./workers/arraybuffer-xor")
  const postMessageCalls: Array<any[]> = []

  worker.postMessage = spyOn(worker.postMessage.bind(worker), postMessage => (...args) => {
    postMessageCalls.push(replaceArrayBufferWithPlaceholder(args, testData))
    return postMessage(...args)
  })

  const xorBuffer = await spawn<XorBuffer>(worker)
  const returnedBuffer = await xorBuffer(Transfer(testData), 15)

  t.is(returnedBuffer.byteLength, 64)

  t.is(postMessageCalls.length, 1)
  t.is(postMessageCalls[0].length, 2)
  t.deepEqual(postMessageCalls[0][0], {
    args: [arrayBufferPlaceholder, 15],
    method: undefined,
    type: "run",
    uid: postMessageCalls[0][0].uid
  })
  t.deepEqual(postMessageCalls[0][1], [arrayBufferPlaceholder])

  await Thread.terminate(xorBuffer)
})

test.todo("can pass transferable objects as observable values")

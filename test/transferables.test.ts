import test from "ava"
import { spawn, Thread, Transfer, TransferDescriptor, Worker } from "../src/index"

type SpyInit<Args extends any[], OriginalReturn, NewReturn> =
  (originalFn: (...args: Args) => OriginalReturn) =>
  (...args: Args) =>
  NewReturn

function spyOn<Args extends any[], OriginalReturn, NewReturn>(
  target: ((...args: Args) => OriginalReturn),
  spy: SpyInit<Args, OriginalReturn, NewReturn>
): (...args: Args) => NewReturn {
  return spy(target)
}

test("can pass transferable objects on thread call", async t => {
  const testData = new ArrayBuffer(64)

  const worker = new Worker("./workers/arraybuffer-xor")
  const postMessageCalls: Array<any[]> = []

  worker.postMessage = spyOn(worker.postMessage.bind(worker), postMessage => (...args) => {
    postMessageCalls.push(args)
    return postMessage(...args)
  })

  const xorBuffer = await spawn<(buffer: ArrayBuffer | TransferDescriptor<ArrayBuffer>, value: number) => ArrayBuffer>(worker)
  await xorBuffer(Transfer(testData), 15)

  t.is(postMessageCalls.length, 1)
  t.is(postMessageCalls[0].length, 2)
  t.deepEqual(postMessageCalls[0][0], {
    args: [testData, 15],
    method: undefined,
    type: "run",
    uid: postMessageCalls[0][0].uid
  })
  t.deepEqual(postMessageCalls[0][1], [testData])

  await Thread.terminate(xorBuffer)
})

test.todo("can pass transferable objects as observable values")

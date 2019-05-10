import "ts-node/register"
import { expose, Transfer } from "../../src/worker"

expose(function xor(buffer: ArrayBuffer, value: number) {
  const view = new Uint8Array(buffer)
  view.forEach((byte, offset) => view.set([byte ^ value], offset))
  return Transfer(buffer)
})

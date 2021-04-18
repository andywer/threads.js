import { expose, Transfer } from "../../src/worker"

function xor(buffer: ArrayBuffer, value: number) {
  const view = new Uint8Array(buffer)
  view.forEach((byte, offset) => view.set([byte ^ value], offset))
  return Transfer(buffer)
}

expose(xor)
export type XorBuffer = typeof xor

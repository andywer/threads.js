import { expose } from "../../src/worker"

export type AsyncGenerator = (count: number) => AsyncIterator<number>

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

expose(async function* generator(count: number) {
  for (let i = 1; i <= count; i++) {
    await delay(2)
    yield i
  }
})

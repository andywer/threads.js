import { expose } from "../../src/worker"

export type Generator = (count: number) => Iterator<number>

expose(function *generator(count: number) {
  for (let i = 1; i <= count; i++) {
    yield i
  }
})

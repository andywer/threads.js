import { expose } from "../../src/worker"

expose(function add(a: number, b: number) {
  return a + b
})

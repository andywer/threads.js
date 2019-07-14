import { expose } from "../../src/worker"

let counter = 0

expose(function increment(by: number = 1) {
  counter += by
  return counter
})

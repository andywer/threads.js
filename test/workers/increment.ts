import "ts-node/register"
import { expose } from "../../src/worker"

let counter = 1

expose(function increment() {
  return counter++
})

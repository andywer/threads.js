import { expose } from "../../src/worker"

expose(function fail() {
  throw Error("I am supposed to fail.")
})

import { expose } from "../../src/worker"

expose(function helloWorld() {
  return "Hello World"
})

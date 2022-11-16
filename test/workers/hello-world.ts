import { expose } from "../../src/worker"

onconnect = () => {
  expose(function helloWorld() {
    return "Hello World"
  })
}

console.log('hello from worker')

expose(function helloWorld() {
  return "Hello World"
})

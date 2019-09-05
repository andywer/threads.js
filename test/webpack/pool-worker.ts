import { expose } from "../../src/worker"

expose(function hello(text: string) {
  return `Hello, ${text}`
})

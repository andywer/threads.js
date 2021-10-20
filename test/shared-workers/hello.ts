import { expose } from "../../src/shared-worker"

expose(function helloWorld() {
  return "Hello World"
});

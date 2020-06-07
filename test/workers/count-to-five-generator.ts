import { expose } from "../../src/worker"

expose(async function* countToFive() {
  for (let counter = 1; counter <= 5; counter++) {
    await new Promise(resolve => setTimeout(resolve, 1))
    const reset = yield(counter)
    if (reset) {
      counter = 0
    }
  }
})

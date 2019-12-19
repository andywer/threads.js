import { spawn, Thread, Worker } from "../../"

async function run() {
  const add = await spawn(new Worker("./worker.js"))
  const result = await add(2, 3)
  await Thread.terminate(add)
  return result
}

run().then(result => {
  console.log(`Result: ${result}`)
  puppet.exit(0)
}).catch(error => {
  console.error(error)
  puppet.exit(1)
})

import { spawn, Thread, Worker } from "../../"

async function main() {
  const helloWorld = await spawn(new Worker("./workers/hello-world"))
  await Thread.terminate(helloWorld)
}

main()

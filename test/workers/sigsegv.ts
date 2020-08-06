import { expose } from "../../src/worker"

expose(async function sigsegv() {
  process.kill(process.pid, 'SIGSEGV')
})

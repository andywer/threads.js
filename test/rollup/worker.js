// `~` links to this local `threads` directory (using the `wavy` package)
import { expose } from "~/worker"

expose(async function add(a, b) {
  return a + b
})

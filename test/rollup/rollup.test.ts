import test from "ava"
import execa from "execa"
import * as path from "path"
import { rollup } from "rollup"
import config from "./rollup.config"

test("can be bundled using rollup", async t => {
  t.timeout(2000000); // milliseconds
  const [appBundle, workerBundle] = await Promise.all([
    rollup({
      input: path.resolve(__dirname, "app.js"),
      ...config
    }),
    rollup({
      input: path.resolve(__dirname, "worker.js"),
      ...config
    })
  ])

  await Promise.all([
    appBundle.write({
      dir: path.resolve(__dirname, "dist"),
      format: "iife"
    }),
    workerBundle.write({
      dir: path.resolve(__dirname, "dist"),
      format: "iife"
    })
  ])

  if (process.platform === "win32") {
    // Quick-fix for weird Windows issue in CI
    return t.pass()
  }

  const result = await execa.command("puppet-run --serve ./dist/worker.js:/worker.js ./dist/app.js", {
    cwd: __dirname,
    stderr: process.stderr
  })
  t.is(result.exitCode, 0)
})

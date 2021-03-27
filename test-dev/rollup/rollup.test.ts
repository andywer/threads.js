import test from "ava"
import execa from "execa"
import * as path from "path"
import { rollup } from "rollup"
import config from "./rollup.config"

test("can be bundled using rollup", async t => {
  t.timeout(2000000); // milliseconds

  const appBundleP = rollup({
     input: path.resolve(__dirname, "app.js"),
    ...config
  })

  const workerBundleP = rollup({
    input: path.resolve(__dirname, "worker.js"),
    ...config
  })

  const appBundleWriteP = (await appBundleP).write({
    dir: path.resolve(__dirname, "dist"),
    format: "iife"
  })

  const workerBundleWriteP = (await workerBundleP).write({
    dir: path.resolve(__dirname, "dist"),
    format: "iife"
  })

  await Promise.all([appBundleWriteP, workerBundleWriteP])

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

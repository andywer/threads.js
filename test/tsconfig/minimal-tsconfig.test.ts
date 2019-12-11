import test from "ava"
import execa from "execa"

test("can compile with a minimal TypeScript config", async t => {
  const result = await execa("tsc", ["--project", require.resolve("./minimal-tsconfig.json")])
  t.is(result.exitCode, 0, `tsc exited with non-zero exit code.\nStderr:\n${result.stderr}`)
})

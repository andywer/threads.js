import test from "ava"
import Webpack from "webpack"

const browserConfig = require("./webpack.web.config")
const serverConfig = require("./webpack.node.config")

const stringifyWebpackError = (error: any) =>
  !error
  ? ""
  : typeof error.stack === "string"
  ? error.stack
  : typeof error.message === "string"
  ? error.message
  : error

async function runWebpack(config: any) {
  return new Promise<Webpack.Stats>((resolve, reject) => {
    Webpack(config).run((error, stats) => {
      error ? reject(error) : resolve(stats)
    })
  })
}

test("can create a browser bundle with webpack", async t => {
  const stats = await runWebpack(browserConfig)
  t.deepEqual(stats.compilation.errors, [], stringifyWebpackError(stats.compilation.errors[0]))
})

test("can create a working server bundle with webpack", async t => {
  const stats = await runWebpack(serverConfig)
  t.deepEqual(stats.compilation.errors, [], stringifyWebpackError(stats.compilation.errors[0]))

  const bundle = require("./dist.node/main")
  await bundle.test()
})

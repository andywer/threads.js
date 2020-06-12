import test from "ava"
import * as path from "path"
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

  const bundle = require("./dist/app.node/main")
  await bundle.test()
})

test("can inline a worker into an app bundle", async t => {
  // Bundle browser worker
  let stats = await runWebpack({
    ...browserConfig,
    entry: require.resolve("./addition-worker"),
    output: {
      filename: "worker.js",
      path: path.resolve(__dirname, "dist/addition-worker.web")
    },
    target: "webworker"
  })
  t.deepEqual(stats.compilation.errors, [], stringifyWebpackError(stats.compilation.errors[0]))

  // Bundle server worker
  stats = await runWebpack({
    ...serverConfig,
    entry: require.resolve("./addition-worker"),
    output: {
      filename: "worker.js",
      path: path.resolve(__dirname, "dist/addition-worker.node")
    }
  })
  t.deepEqual(stats.compilation.errors, [], stringifyWebpackError(stats.compilation.errors[0]))

  // Bundle browser app
  stats = await runWebpack({
    ...browserConfig,
    entry: require.resolve("./app-with-inlined-worker"),
    output: {
      ...serverConfig.output,
      path: path.resolve(__dirname, "dist/app-inlined.web")
    }
  })
  t.deepEqual(stats.compilation.errors, [], stringifyWebpackError(stats.compilation.errors[0]))

  // Bundle server app
  stats = await runWebpack({
    ...serverConfig,
    entry: require.resolve("./app-with-inlined-worker"),
    output: {
      ...serverConfig.output,
      path: path.resolve(__dirname, "dist/app-inlined.node")
    }
  })
  t.deepEqual(stats.compilation.errors, [], stringifyWebpackError(stats.compilation.errors[0]))

  const bundle = require("./dist/app-inlined.node/main")
  const result = await bundle.test()

  t.is(result, "test succeeded")
})

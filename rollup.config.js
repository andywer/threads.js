const commonjs = require("@rollup/plugin-commonjs")
const { nodeResolve } = require("@rollup/plugin-node-resolve")

module.exports = {
  plugins: [
    nodeResolve({
      browser: true,
      mainFields: ["module", "main"],
      preferBuiltins: true
    }),

    commonjs()
  ]
};

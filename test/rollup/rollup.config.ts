/* tslint:disable */
let commonjs, nodeResolve;
if (parseFloat(process.version.match(/^v(\d+\.\d+)/)[1]) < 10) {
  commonjs = require("rollup-plugin-commonjs");
  nodeResolve = require("rollup-plugin-node-resolve");
} else {
  commonjs = require("@rollup/plugin-commonjs");
  nodeResolve = require("@rollup/plugin-node-resolve").nodeResolve;
}

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

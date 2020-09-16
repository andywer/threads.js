/* tslint:disable */
//@ts-ignore
let commonjs, nodeResolve; //@ts-ignore
//@ts-ignore
if (parseFloat(process.version.match(/^v(\d+\.\d+)/)[1]) < 10) {
  //@ts-ignore
  commonjs = require("rollup-plugin-commonjs");
  //@ts-ignore
  nodeResolve = require("rollup-plugin-node-resolve");
} else {
  //@ts-ignore
  commonjs = require("@rollup/plugin-commonjs");
  //@ts-ignore
  nodeResolve = require("@rollup/plugin-node-resolve").nodeResolve;
}

//@ts-ignore
export default {
  plugins: [
    nodeResolve({
      browser: true,
      mainFields: ["module", "main"],
      preferBuiltins: true
    }),

    commonjs()
  ]
};

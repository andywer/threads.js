const path = require("path")
const ThreadsPlugin = require("threads-plugin")

module.exports = {
  context: __dirname,
  mode: "development",
  entry: require.resolve("./app.ts"),
  output: {
    library: "test",
    libraryExport: "default",
    libraryTarget: "commonjs",
    path: path.resolve(__dirname, "./dist.node")
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        loader: "ts-loader",
        options: {
          compilerOptions: {
            module: "esnext",
            target: "es2017"
          }
        }
      }
    ]
  },
  plugins: [
    new ThreadsPlugin()
  ],
  resolve: {
    extensions: [".js", ".ts"]
  },
  target: "node"
}

const path = require("path")
const ThreadsPlugin = require("threads-plugin")

module.exports = {
  context: __dirname,
  mode: "development",
  devtool: false,
  entry: require.resolve("./app.ts"),
  externals: {
    "tiny-worker": "tiny-worker"
  },
  output: {
    library: "test",
    libraryExport: "default",
    libraryTarget: "commonjs",
    path: path.resolve(__dirname, "./dist/app.node")
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        loader: "ts-loader",
        options: {
          compilerOptions: {
            module: "esnext"
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

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
    path: path.resolve(__dirname, "./dist.web")
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        loader: "ts-loader"
      }
    ]
  },
  plugins: [
    new ThreadsPlugin()
  ],
  resolve: {
    extensions: [".js", ".ts"]
  },
  target: "web"
}

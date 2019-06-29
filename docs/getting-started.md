---
layout: article
title: Getting started
permalink: /getting-started
aside:
  toc: true
---

## Installation

```
npm install threads tiny-worker
```

*You only need to install the `tiny-worker` package to support node.js < 12. It's an optional dependency and used as a fallback if `worker_threads` are not available.*

## Environments

### Run using node.js

Running code using threads.js in node works out of the box.

Note that we wrap the native `Worker`, so `new Worker("./foo/bar")` will resolve the path relative to the module that calls it, not relative to the current working directory.

That aligns it with the behavior when bundling the code with webpack or parcel.

### Build with webpack

#### Webpack config

Use with the [`threads-plugin`](https://github.com/andywer/threads-plugin).

It will transparently detect all `new Worker("./unbundled-path")` expressions, bundles the worker code and replaces the `new Worker(...)` path with the worker bundle path, so you don't need to explicitly use the `worker-loader` or define extra entry points.

```sh
  npm install -D threads-plugin
```

Then add it to your `webpack.config.js`:

```diff
+ const ThreadsPlugin = require('threads-plugin')

  module.exports = {
    // ...
    plugins: [
+     new ThreadsPlugin()
    ]
    // ...
  }
```

#### Node.js bundles

If you are using webpack to create a bundle that will be run in node (webpack config `target: "node"`), you also need to specify that the `tiny-worker` package used for node < 12 should not be bundled:

```diff
  module.exports = {
    // ...
+   externals: {
+     "tiny-worker": "tiny-worker"
+   }
    // ...
}
```

Make sure that `tiny-worker` is listed in your `package.json` `dependencies` in that case.

#### When using TypeScript

Make sure the TypeScript compiler keeps the `import` / `export` statements intact, so webpack resolves them. Otherwise the `threads-plugin` won't be able to do its job.

```diff
  module.exports = {
    // ...
    module: {
      rules: [
        {
          test: /\.ts$/,
          loader: "ts-loader",
+         options: {
+           compilerOptions: {
+             module: "esnext"
+           }
+         }
        }
      ]
    },
    // ...
  }
```

### Build with parcel bundler

You need to import `threads/register` once at the beginning of your application code (in the master code, not in the workers):

```diff
  import { spawn } from "threads"
+ import "threads/register"

  // ...

  const work = await spawn(new Worker("./worker"))
```

This registers the library's `Worker` implementation for your platform as the global `Worker`. This is necessary, since you cannot `import { Worker } from "threads"` or Parcel won't recognize `new Worker()` as a web worker anymore.

Be aware that this might affect any code that tries to instantiate a normal web worker `Worker` and now instead instantiates a threads.js `Worker`. The threads.js `Worker` is just a web worker with some sugar on top, but that sugar might have unexpected side effects on third-party libraries.

Everything else should work out of the box.

## Next

Learn how to use the library. Let's write some code!

<div class="mt-5">
  <p class="text-center">
    <a class="button button--rounded button--secondary button--xl" href="/usage">
      <i class="fas fa-arrow-right mr-2" style="font-size: 90%"></i>
      Usage
    </a>
  </p>
</div>

---
layout: article
title: Quick start
permalink: /getting-started
excerpt: Get started using threads.js – Install the package, optionally set up Webpack and TypeScript.
aside:
  toc: true
---

## Quick start

This is how to spawn a simple worker managed using threads.js. The worker will hash passwords, lifting the main CPU load off the master thread.

```js
// master.js
import { spawn, Thread, Worker } from "threads"

async function main() {
  const auth = await spawn(new Worker("./workers/auth"))
  const hashed = await auth.hashPassword("Super secret password", "1234")

  console.log("Hashed password:", hashed)

  await Thread.terminate(auth)
}

main().catch(console.error)
```

```js
// workers/auth.js - will be run in worker thread
import sha256 from "js-sha256"
import { expose } from "threads/worker"

expose({
  hashPassword(password, salt) {
    return sha256(password + salt)
  }
})
```

### Moving parts

The interesting bits in the sample code above are

* `spawn()` to create a new worker
* `expose()` to declare what functionality you want your worker to expose
* `Thread.terminate()` to kill the worker once you don't need it anymore

Also note that we imported `Worker` from threads.js. This is an important detail as you would usually use the global `Worker` on the `window` in browsers or import `Worker` from `worker_threads` in node.js.

Importing the `Worker` from threads.js allows us not only to run the same code in browsers and node, but the threads.js `Worker` transparently provides additional functionality, too, to make using it as easy as possible.

Learn more about it on the [Basic usage](/usage) page.


## Installation

```
npm install threads tiny-worker
```

*You only need to install the `tiny-worker` package to support node.js < 12. It's an optional dependency and used as a fallback if `worker_threads` are not available.*

## Platform setup

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

#### Electron & webpack

In case you are using `electron-webpack` for your electron application and your bundle does not work, you probably need to add `threads` to `whiteListedModules`. Add this to your `webpackElectron` field in your `package.json`:

```diff
  "electronWebpack": {
    "whiteListedModules": [
+     "threads"
    ]
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

### Electron

When building an Electron application you probably want to enable ASAR packaging – it's usually enabled by default. Your JavaScript files will then be packaged into an ASAR archive which can help reducing the executable size and time to launch.

The problem is that you can `require()` / `import` JavaScript modules from within the ASAR archive, but you cannot spawn workers packaged in the archive as easily. In order to spawn workers, you can use the [`asarUnpack`](https://www.electron.build/configuration/configuration#configuration-asarUnpack) option to unpack the archive when the app launches. `threads.js` will automatically look for the worker in the unpacked archive directory.

The following sample snippet shows how to set that option in your `package.json` file. You will have to use the right paths for your application's files.

```diff
+ "asarUnpack": {
+   "dist/main/0.bundle.worker.js",
+   "dist/main/0.bundle.worker.js.map"
+ }
```

## Next

Learn about the details and all the other features of the threads.js API, like

* Exposing more than one function
* Writing stateful workers
* Using thread pools
* Using observables to stream data
* and more…

<div class="mt-5">
  <p class="text-center">
    <a class="button button--rounded button--secondary button--lg" href="/usage">
      <i class="fas fa-arrow-right mr-2" style="font-size: 90%"></i>
      API & Usage
    </a>
  </p>
</div>

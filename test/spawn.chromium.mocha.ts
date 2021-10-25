/*
 * This code here will be run in a headless Chromium browser using `puppet-run`.
 * Check the package.json scripts `test:puppeteer:*`.
 */

import { expect } from "chai"
import { spawn, BlobWorker, SharedWorker, Thread } from "../"

// We need this as a work-around to make our threads Worker global, since
// the bundler would otherwise not recognize `new Worker()` as a web worker
import "../src/master/register"

describe("threads in browser", function() {
  it("can spawn and terminate a thread", async function() {
    const helloWorld = await spawn<() => string>(new Worker("./workers/hello-world.js"))
    expect(await helloWorld()).to.equal("Hello World")
    await Thread.terminate(helloWorld)
  })

  it("can call a function thread more than once", async function() {
    const increment = await spawn<() => number>(new Worker("./workers/increment.js"))
    expect(await increment()).to.equal(1)
    expect(await increment()).to.equal(2)
    expect(await increment()).to.equal(3)
    await Thread.terminate(increment)
  })

  it("can spawn and use a blob worker", async function() {
    const baseUrl = new URL(window.location.href).origin
    const workerSource = `
      // Makes expose() available on global scope
      importScripts(${JSON.stringify(baseUrl + "/worker.js")})

      let counter = 0

      expose(function() {
        return ++counter
      })
    `
    const increment = await spawn<() => number>(BlobWorker.fromText(workerSource))
    expect(await increment()).to.equal(1)
    expect(await increment()).to.equal(2)
    expect(await increment()).to.equal(3)
    await Thread.terminate(increment)
  })

  it("can spawn and terminate a thread with a shared worker", async function () {
    const sharedWorker = new SharedWorker("./workers/hello-world.js");

    console.log('hello before spawn');

    const helloWorld = await spawn<() => string>(sharedWorker);

    console.log("hello world fn", helloWorld);

    expect(await helloWorld()).to.equal("Hello World");
    await Thread.terminate(helloWorld);
  })

  it("can call a function thread with a shared worker more than once", async function () {
    const sharedWorker = new SharedWorker("./workers/increment.js");

    const increment = await spawn<() => number>(sharedWorker);
    expect(await increment()).to.equal(1);
    expect(await increment()).to.equal(2);
    expect(await increment()).to.equal(3);
    await Thread.terminate(increment);
  })
})

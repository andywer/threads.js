/*
 * This code here will be run in a headless Chromium browser using `puppet-run`.
 * Check the package.json scripts `test:puppeteer:*`.
 */

import { expect } from "chai";
import { spawn, Thread } from "../";

describe("threads in browser", function () {
  it("can spawn and terminate a thread", async function () {
    const sharedWorker = new SharedWorker("./shared-workers/hello.js");

    // TODO: Why does not spawn complete for shared workers?
    const helloWorld = await spawn<() => string>(sharedWorker);

    console.log("hello world fn", helloWorld);

    expect(await helloWorld()).to.equal("Hello World");
    await Thread.terminate(helloWorld);
  });

  it("can call a function thread more than once", async function () {
    const sharedWorker = new SharedWorker("./shared-workers/increment.js");

    const increment = await spawn<() => number>(sharedWorker);
    expect(await increment()).to.equal(1);
    expect(await increment()).to.equal(2);
    expect(await increment()).to.equal(3);
    await Thread.terminate(increment);
  });
});

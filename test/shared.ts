/*
 * This code here will be run in a headless Chromium browser using `puppet-run`.
 * Check the package.json scripts `test:puppeteer:*`.
 */

import { expect } from "chai";
import { spawn, Thread } from "../";

// We need this as a work-around to make our threads Worker global, since
// the bundler would otherwise not recognize `new Worker()` as a web worker
// import "../src/master/register";

describe("threads in browser", function () {
  it("can spawn and terminate a thread", async function () {
    const helloWorld = await spawn<() => string>(
      // @ts-ignore TODO: Figure out how to type this
      new SharedWorker("./shared-workers/hello-world.js")
    );
    expect(await helloWorld()).to.equal("Hello World");
    await Thread.terminate(helloWorld);
  });

  it("can call a function thread more than once", async function () {
    const increment = await spawn<() => number>(
      // @ts-ignore TODO: Figure out how to type this
      new SharedWorker("./shared-workers/increment.js")
    );
    expect(await increment()).to.equal(1);
    expect(await increment()).to.equal(2);
    expect(await increment()).to.equal(3);
    await Thread.terminate(increment);
  });
});

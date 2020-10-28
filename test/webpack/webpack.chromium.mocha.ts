// NOTE:
// We are gonna test the bundles previously built by the AVA tests (see webpack.test.ts)

describe("threads webpack browser bundle", function() {
  this.timeout(80000)

  it("works fine", async function() {
    const bundle = require("./dist/app.web/main")
    await bundle.test()
  })
})

describe("threads webpack browser bundle with inlined worker", function() {
  this.timeout(80000)

  it("works fine", async function() {
    const bundle = require("./dist/app-inlined.web/main")
    await bundle.test()
  })
})

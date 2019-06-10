// NOTE:
// We are gonna test the bundle that previously been built by the AVA tests (see webpack.test.ts)

describe("threads webpack browser bundle", function() {
  this.timeout(8000)

  it("works fine", async function() {
    const bundle = require("./dist.web/main")
    await bundle.test()
  })
})

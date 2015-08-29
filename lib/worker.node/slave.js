// not using ES6 import/export syntax, since we need to require() in a handler
// what the ES6 syntax does not permit
'use strict';

var vm = require('vm');

var errorCatcherInPlace = false;
var messageHandler = function messageHandler() {
  console.error('No thread logic initialized.'); // eslint-disable-line no-console
};

function setupErrorCatcher() {
  if (errorCatcherInPlace) {
    return;
  }

  process.on('uncaughtException', function (error) {
    process.send({
      error: { message: error.message, stack: error.stack }
    });
  });

  errorCatcherInPlace = true;
}

function runAsSandboxedModule(code) {
  var sandbox = {
    Buffer: Buffer,
    console: console,
    clearInterval: clearInterval,
    clearTimeout: clearTimeout,
    module: { exports: null },
    require: require,
    setInterval: setInterval,
    setTimeout: setTimeout
  };

  vm.runInNewContext(code, sandbox);
  return sandbox.module.exports;
}

process.on('message', function (data) {
  if (data.initByScript) {
    messageHandler = require(data.script);
  }

  if (data.initByMethod) {
    messageHandler = runAsSandboxedModule('module.exports = ' + data.method);
  }

  if (data.doRun) {
    // it's a good idea to wait until first thread logic run to set this up,
    // so initialization errors will be printed to console
    setupErrorCatcher();

    messageHandler(data.param, function (response) {
      process.send({ response: response });
    });
  }
});
//# sourceMappingURL=../worker.node/slave.js.map
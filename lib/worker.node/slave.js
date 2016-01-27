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

function messageHandlerDone() {
  for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
    args[_key] = arguments[_key];
  }

  process.send({ response: args });
}

messageHandlerDone.transfer = function () {
  for (var _len2 = arguments.length, args = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
    args[_key2] = arguments[_key2];
  }

  args.pop(); // ignore last parameter, since it's only useful for browser code
  messageHandlerDone.apply(undefined, args);
};

function messageHandlerProgress(progress) {
  process.send({ progress: progress });
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

    messageHandler(data.param, messageHandlerDone, messageHandlerProgress);
  }
});
//# sourceMappingURL=slave.js.map

// not using ES6 import/export syntax, since we need to require() in a handler
// what the ES6 syntax does not permit
const vm = require('vm');

let errorCatcherInPlace = false;
let messageHandler = function() {
  console.error('No thread logic initialized.');    // eslint-disable-line no-console
};

function setupErrorCatcher() {
  if (errorCatcherInPlace) { return; }

  process.on('uncaughtException', function(error) {
    process.send({
      error : { message : error.message, stack : error.stack }
    });
  });

  errorCatcherInPlace = true;
}


function runAsSandboxedModule(code) {
  var sandbox = {
    Buffer,
    console,
    clearInterval,
    clearTimeout,
    module        : { exports : null },
    require,
    setInterval,
    setTimeout
  };

  vm.runInNewContext(code, sandbox);
  return sandbox.module.exports;
}


function messageHandlerDone(...args) {
  process.send({ response: args });
}

messageHandlerDone.transfer = function(...args) {
  args.pop();         // ignore last parameter, since it's only useful for browser code
  messageHandlerDone(...args);
};

function messageHandlerProgress(progress) {
  process.send({ progress });
}


process.on('message', function(data) {
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

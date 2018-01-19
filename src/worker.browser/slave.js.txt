/*eslint-env worker*/
/*global importScripts*/
/*eslint-disable no-console*/
self.module = {
  exports : function() {
    if (console) { console.error('No thread logic initialized.'); }
  }
};

function handlerDone() {
  var args = Array.prototype.slice.call(arguments, 0);
  this.postMessage({ response : args });
}

function handlerProgress(progress) {
  this.postMessage({ progress : progress });
}

function handlerError(error) {
  // Need to clone error manually to avoid DataCloneError, since errors cannot be send
  var cloned = {
    message: error.message,
    name: error.name,
    stack: error.stack
  };
  this.postMessage({ error : cloned });
}

function handlerDoneTransfer() {
  var args = Array.prototype.slice.call(arguments);
  var lastArg = args.pop();

  if (!(lastArg instanceof Array) && this.console) {
    console.error('Expected 2nd parameter of <doneCallback>.transfer() to be an array. Got:', lastArg);
  }

  this.postMessage({ response : args }, lastArg);
}

function isPromise (thing) {
  return thing && typeof thing.then === 'function';
}

self.onmessage = function (event) {
  var scripts = event.data.scripts;
  if (scripts && scripts.length > 0 && typeof importScripts !== 'function') {
    throw new Error('importScripts() not supported.');
  }

  if (event.data.initByScripts) {
    importScripts.apply(null, scripts);
  }

  if (event.data.initByMethod) {
    // Clear `this.module.exports` first, to avoid trouble with importScripts' CommonJS detection
    delete this.module.exports;
  
    if (scripts && scripts.length > 0) {
      importScripts.apply(null, scripts);
    }

    var method = event.data.method;
    this.module.exports = Function.apply(null, method.args.concat(method.body));
  }

  if (event.data.doRun) {
    var handler = this.module.exports;

    if (typeof handler !== 'function') {
      throw new Error('Cannot run thread logic. No handler has been exported.');
    }

    var preparedHandlerDone = handlerDone.bind(this);
    preparedHandlerDone.transfer = handlerDoneTransfer.bind(this);

    var returned = handler.call(this, event.data.param, preparedHandlerDone, handlerProgress.bind(this));

    if (isPromise(returned)) {
      returned.then(preparedHandlerDone, handlerError.bind(this));
    }
  }
}.bind(self);

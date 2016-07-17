require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({"./defaults":[function(require,module,exports){
/*eslint-env browser*/

"use strict";

exports.__esModule = true;
exports["default"] = {
  pool: {
    size: navigator.hardwareConcurrency || 8
  }
};
module.exports = exports["default"];
//# sourceMappingURL=defaults.browser.js.map

},{}],1:[function(require,module,exports){
/*eslint-env browser, amd, commonjs*/
/*global module*/

'use strict';

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _index = require('./index');

var _index2 = _interopRequireDefault(_index);

if (typeof window === 'object') {
  window.thread = _index2['default'];
}

if (typeof define === 'function') {
  define([], function () {
    return _index2['default'];
  });
} else if (typeof module === 'object') {
  module.exports = _index2['default'];
}
//# sourceMappingURL=bundle.browser.js.map

},{"./index":3}],"./worker":[function(require,module,exports){
'use strict';

exports.__esModule = true;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _eventemitter3 = require('eventemitter3');

var _eventemitter32 = _interopRequireDefault(_eventemitter3);

var _slaveCodeUri = require('./slave-code-uri');

var _slaveCodeUri2 = _interopRequireDefault(_slaveCodeUri);

var _config = require('../config');

if (typeof window.Worker !== 'object' && typeof window.Worker !== 'function') {
  throw new Error('Browser does not support web workers!');
}

function joinPaths(path1, path2) {
  if (!path1 || !path2) {
    return path1 + path2;
  } else if (path1.charAt(path1.length - 1) === '/' || path2.charAt(0) === '/') {
    return path1 + path2;
  } else {
    return path1 + '/' + path2;
  }
}

function prependScriptUrl(scriptUrl) {
  var prefix = _config.getConfig().basepath.web;
  return prefix ? joinPaths(prefix, scriptUrl) : scriptUrl;
}

function convertToArray(input) {
  var outputArray = [];
  var index = 0;

  while (typeof input[index] !== 'undefined') {
    outputArray.push(input[index]);
    index++;
  }

  return outputArray;
}

function logError(error) {
  if (error.stack) {
    console.error(error.stack); // eslint-disable-line no-console
  } else if (error.message && error.filename && error.lineno) {
      var fileName = error.filename.match(/^data:text\/javascript/) && error.filename.length > 50 ? error.filename.substr(0, 50) + '...' : error.filename;
      console.error(error.message + ' @' + fileName + ':' + error.lineno); // eslint-disable-line no-console
    } else {
        console.error(error); // eslint-disable-line no-console
      }
}

var Worker = (function (_EventEmitter) {
  _inherits(Worker, _EventEmitter);

  function Worker() {
    var initialScript = arguments.length <= 0 || arguments[0] === undefined ? null : arguments[0];
    var importScripts = arguments.length <= 1 || arguments[1] === undefined ? [] : arguments[1];

    _classCallCheck(this, Worker);

    _EventEmitter.call(this);

    // used by `run()` to decide if the worker must be re-initialized
    this.currentRunnable = null;
    this.currentImportScripts = [];

    this.initWorker();
    this.worker.addEventListener('message', this.handleMessage.bind(this));
    this.worker.addEventListener('error', this.handleError.bind(this));

    if (initialScript) {
      this.run(initialScript, importScripts);
    }
  }

  Worker.prototype.initWorker = function initWorker() {
    try {
      this.worker = new window.Worker(_slaveCodeUri2['default']);
    } catch (error) {
      var slaveScriptUrl = _config.getConfig().fallback.slaveScriptUrl;
      if (slaveScriptUrl) {
        // try using the slave script file instead of the data URI
        this.worker = new window.Worker(_slaveCodeUri2['default']);
      } else {
        // re-throw
        throw error;
      }
    }
  };

  Worker.prototype.run = function run(toRun) {
    var importScripts = arguments.length <= 1 || arguments[1] === undefined ? [] : arguments[1];

    if (this.alreadyInitializedToRun(toRun, importScripts)) {
      // don't re-initialize with the new logic if it already has been
      return this;
    }

    if (typeof toRun === 'function') {
      this.runMethod(toRun, importScripts);
    } else {
      this.runScripts(toRun, importScripts);
    }

    this.currentRunnable = toRun;
    this.currentImportScripts = importScripts;

    return this;
  };

  Worker.prototype.runMethod = function runMethod(method, importScripts) {
    var methodStr = method.toString();
    var args = methodStr.substring(methodStr.indexOf('(') + 1, methodStr.indexOf(')')).split(',');
    var body = methodStr.substring(methodStr.indexOf('{') + 1, methodStr.lastIndexOf('}'));

    this.worker.postMessage({
      initByMethod: true,
      method: { args: args, body: body },
      scripts: importScripts.map(prependScriptUrl)
    });
  };

  Worker.prototype.runScripts = function runScripts(script, importScripts) {
    if (!script) {
      throw new Error('Must pass a function or a script URL to run().');
    }

    // attention: array for browser, single script for node
    this.worker.postMessage({
      initByScripts: true,
      scripts: importScripts.concat([script]).map(prependScriptUrl)
    });
  };

  Worker.prototype.send = function send(param) {
    var transferables = arguments.length <= 1 || arguments[1] === undefined ? [] : arguments[1];

    this.worker.postMessage({
      doRun: true,
      param: param
    }, transferables);
    return this;
  };

  Worker.prototype.kill = function kill() {
    this.worker.terminate();
    this.emit('exit');
    return this;
  };

  Worker.prototype.promise = function promise() {
    var _this = this;

    return new Promise(function (resolve, reject) {
      _this.once('message', resolve).once('error', reject);
    });
  };

  Worker.prototype.alreadyInitializedToRun = function alreadyInitializedToRun(toRun, importScripts) {
    var runnablesMatch = this.currentRunnable === toRun;
    var importScriptsMatch = this.currentImportScripts === importScripts || importScripts.length === 0 && this.currentImportScripts.length === 0;

    return runnablesMatch && importScriptsMatch;
  };

  Worker.prototype.handleMessage = function handleMessage(event) {
    if (event.data.error) {
      this.handleError(event.data.error);
    } else if (event.data.progress) {
      this.handleProgress(event.data.progress);
    } else {
      var responseArgs = convertToArray(event.data.response);
      this.emit.apply(this, ['message'].concat(responseArgs));
      this.emit.apply(this, ['done'].concat(responseArgs)); // this one is just for convenience
    }
  };

  Worker.prototype.handleProgress = function handleProgress(progress) {
    this.emit('progress', progress);
  };

  Worker.prototype.handleError = function handleError(error) {
    if (!this.listeners('error', true)) {
      logError(error);
    }

    if (error.preventDefault) {
      error.preventDefault();
    }

    this.emit('error', error);
  };

  return Worker;
})(_eventemitter32['default']);

exports['default'] = Worker;
module.exports = exports['default'];
//# sourceMappingURL=worker.js.map

},{"../config":2,"./slave-code-uri":6,"eventemitter3":8}],2:[function(require,module,exports){
'use strict';

exports.__esModule = true;
exports.getConfig = getConfig;
exports.setConfig = setConfig;
var configuration = {
  basepath: {
    node: '',
    web: ''
  },
  fallback: {
    slaveScriptUrl: ''
  }
};

function configDeepMerge(destObj, srcObj) {
  var ancestorProps = arguments.length <= 2 || arguments[2] === undefined ? [] : arguments[2];

  Object.keys(srcObj).forEach(function (propKey) {
    var srcValue = srcObj[propKey];
    var ancestorPropsAndThis = ancestorProps.concat([propKey]);

    if (typeof srcValue === 'object') {
      if (typeof destObj[propKey] !== 'undefined' && typeof destObj[propKey] !== 'object') {
        throw new Error('Expected config property not to be an object: ' + ancestorPropsAndThis.join('.'));
      }
      configDeepMerge(destObj[propKey], srcValue, ancestorPropsAndThis);
    } else {
      if (typeof destObj[propKey] === 'object') {
        throw new Error('Expected config property to be an object: ' + ancestorPropsAndThis.join('.'));
      }
      destObj[propKey] = srcValue;
    }
  });
}

var config = {
  get: function get() {
    return configuration;
  },

  set: function set(newConfig) {
    if (typeof newConfig !== 'object') {
      throw new Error('Expected config object.');
    }

    configDeepMerge(configuration, newConfig);
  }
};

exports['default'] = config;

function getConfig() {
  return config.get();
}

function setConfig() {
  return config.set.apply(config, arguments);
}
//# sourceMappingURL=config.js.map

},{}],3:[function(require,module,exports){
'use strict';

exports.__esModule = true;
exports.spawn = spawn;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

require('native-promise-only');

var _config = require('./config');

var _config2 = _interopRequireDefault(_config);

var _defaults = require('./defaults');

var _defaults2 = _interopRequireDefault(_defaults);

var _pool = require('./pool');

var _pool2 = _interopRequireDefault(_pool);

var _worker = require('./worker');

var _worker2 = _interopRequireDefault(_worker);

exports.config = _config2['default'];
exports.defaults = _defaults2['default'];
exports.Pool = _pool2['default'];

function spawn() {
  var runnable = arguments.length <= 0 || arguments[0] === undefined ? null : arguments[0];
  var importScripts = arguments.length <= 1 || arguments[1] === undefined ? [] : arguments[1];

  return new _worker2['default'](runnable, importScripts);
}

exports['default'] = {
  config: _config2['default'],
  defaults: _defaults2['default'],
  Pool: _pool2['default'],
  spawn: spawn,
  Worker: _worker2['default']
};
//# sourceMappingURL=index.js.map

},{"./config":2,"./defaults":"./defaults","./pool":5,"./worker":"./worker","native-promise-only":9}],4:[function(require,module,exports){
'use strict';

exports.__esModule = true;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _eventemitter3 = require('eventemitter3');

var _eventemitter32 = _interopRequireDefault(_eventemitter3);

var Job = (function (_EventEmitter) {
  _inherits(Job, _EventEmitter);

  function Job(pool) {
    _classCallCheck(this, Job);

    _EventEmitter.call(this);
    this.pool = pool;
    this.thread = null;

    this.runArgs = [];
    this.sendArgs = [];

    pool.emit('newJob', this);
  }

  Job.prototype.run = function run() {
    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    if (args.length === 0) {
      throw new Error('Cannot call .run() without arguments.');
    }

    this.runArgs = args;
    return this;
  };

  Job.prototype.send = function send() {
    if (this.runArgs.length === 0) {
      throw new Error('Cannot .send() before .run().');
    }

    for (var _len2 = arguments.length, args = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
      args[_key2] = arguments[_key2];
    }

    this.sendArgs = args;

    this.emit('readyToRun');
    return this;
  };

  Job.prototype.executeOn = function executeOn(thread) {
    var _thread$once$once$run, _thread$once$once;

    (_thread$once$once$run = (_thread$once$once = thread.once('message', this.emit.bind(this, 'done')).once('error', this.emit.bind(this, 'error'))).run.apply(_thread$once$once, this.runArgs)).send.apply(_thread$once$once$run, this.sendArgs);

    this.thread = thread;

    this.emit('threadChanged');
    return this;
  };

  Job.prototype.promise = function promise() {
    var _this = this;

    // Always return a promise
    return new Promise(function (resolve) {
      // If the thread isn't set, listen for the threadChanged event
      if (!_this.thread) {
        _this.once('threadChanged', function () {
          resolve(_this.thread.promise());
        });
      } else {
        resolve(_this.thread.promise());
      }
    });
  };

  return Job;
})(_eventemitter32['default']);

exports['default'] = Job;
module.exports = exports['default'];
//# sourceMappingURL=job.js.map

},{"eventemitter3":8}],5:[function(require,module,exports){
'use strict';

exports.__esModule = true;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _eventemitter3 = require('eventemitter3');

var _eventemitter32 = _interopRequireDefault(_eventemitter3);

var _job = require('./job');

var _job2 = _interopRequireDefault(_job);

var _defaults = require('./defaults');

var _defaults2 = _interopRequireDefault(_defaults);

var _ = require('./');

var Pool = (function (_EventEmitter) {
  _inherits(Pool, _EventEmitter);

  function Pool(threads) {
    var _this = this;

    _classCallCheck(this, Pool);

    _EventEmitter.call(this);
    this.threads = Pool.spawn(threads || _defaults2['default'].pool.size);
    this.idleThreads = this.threads.slice();
    this.jobQueue = [];
    this.runArgs = [];

    this.on('newJob', function (job) {
      return _this.handleNewJob(job);
    });
    this.on('threadAvailable', function () {
      return _this.dequeue();
    });
  }

  Pool.prototype.run = function run(args) {
    this.runArgs = args;
    return this;
  };

  Pool.prototype.send = function send() {
    if (!this.runArgs) {
      throw new Error('Pool.send() called without prior Pool.run(). You need to define what to run first.');
    }

    var job = new _job2['default'](this);
    job.run(this.runArgs);
    return job.send.apply(job, arguments);
  };

  Pool.prototype.killAll = function killAll() {
    this.threads.forEach(function (thread) {
      thread.kill();
    });
  };

  Pool.prototype.queueJob = function queueJob(job) {
    this.jobQueue.push(job);
    this.dequeue();
  };

  Pool.prototype.dequeue = function dequeue() {
    var _this2 = this;

    if (this.jobQueue.length === 0 || this.idleThreads.length === 0) {
      return;
    }

    var job = this.jobQueue.shift();
    var thread = this.idleThreads.shift();

    job.once('done', function () {
      for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }

      return _this2.handleJobSuccess.apply(_this2, [thread, job].concat(args));
    }).once('error', function () {
      for (var _len2 = arguments.length, args = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
        args[_key2] = arguments[_key2];
      }

      return _this2.handleJobError.apply(_this2, [thread, job].concat(args));
    });

    job.executeOn(thread);
  };

  Pool.prototype.handleNewJob = function handleNewJob(job) {
    var _this3 = this;

    this.lastCreatedJob = job;
    job.once('readyToRun', function () {
      return _this3.queueJob(job);
    }); // triggered by job.send()
  };

  Pool.prototype.handleJobSuccess = function handleJobSuccess(thread, job) {
    for (var _len3 = arguments.length, responseArgs = Array(_len3 > 2 ? _len3 - 2 : 0), _key3 = 2; _key3 < _len3; _key3++) {
      responseArgs[_key3 - 2] = arguments[_key3];
    }

    this.emit.apply(this, ['done', job].concat(responseArgs));
    this.handleJobDone(thread);
  };

  Pool.prototype.handleJobError = function handleJobError(thread, job, error) {
    this.emit('error', job, error);
    this.handleJobDone(thread);
  };

  Pool.prototype.handleJobDone = function handleJobDone(thread) {
    var _this4 = this;

    this.idleThreads.push(thread);
    this.emit('threadAvailable');

    if (this.idleThreads.length === this.threads.length) {
      // run deferred to give other job.on('done') handlers time to run first
      setTimeout(function () {
        _this4.emit('finished');
      }, 0);
    }
  };

  return Pool;
})(_eventemitter32['default']);

exports['default'] = Pool;

Pool.spawn = function (threadCount) {
  var threads = [];

  for (var threadIndex = 0; threadIndex < threadCount; threadIndex++) {
    threads.push(_.spawn());
  }

  return threads;
};
module.exports = exports['default'];
//# sourceMappingURL=pool.js.map

},{"./":3,"./defaults":"./defaults","./job":4,"eventemitter3":8}],6:[function(require,module,exports){
'use strict';

exports.__esModule = true;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _slaveCode = require('./slave-code');

var _slaveCode2 = _interopRequireDefault(_slaveCode);

var slaveCodeDataUri = 'data:text/javascript;charset=utf-8,' + encodeURI(_slaveCode2['default']);
var createBlobURL = window.createBlobURL || window.createObjectURL;

if (!createBlobURL) {
  var _URL = window.URL || window.webkitURL;

  if (_URL) {
    createBlobURL = _URL.createObjectURL;
  } else {
    throw new Error('No Blob creation implementation found.');
  }
}

if (typeof window.BlobBuilder === 'function' && typeof createBlobURL === 'function') {
  var blobBuilder = new window.BlobBuilder();
  blobBuilder.append(_slaveCode2['default']);
  slaveCodeDataUri = createBlobURL(blobBuilder.getBlob());
} else if (typeof window.Blob === 'function' && typeof createBlobURL === 'function') {
  var blob = new window.Blob([_slaveCode2['default']], { type: 'text/javascript' });
  slaveCodeDataUri = createBlobURL(blob);
}

exports['default'] = slaveCodeDataUri;
module.exports = exports['default'];
//# sourceMappingURL=slave-code-uri.js.map

},{"./slave-code":7}],7:[function(require,module,exports){
module.exports = "/*eslint-env worker*/\n/*global importScripts*/\n/*eslint-disable no-console*/\nself.module = {\n  exports : function() {\n    if (console) { console.error('No thread logic initialized.'); }\n  }\n};\n\nfunction handlerDone() {\n  var args = Array.prototype.slice.call(arguments, 0);\n  this.postMessage({ response : args });\n}\n\nfunction handlerProgress(progress) {\n  this.postMessage({ progress : progress });\n}\n\nfunction handlerDoneTransfer() {\n  var args = Array.prototype.slice.call(arguments);\n  var lastArg = args.pop();\n\n  if (!(lastArg instanceof Array) && this.console) {\n    console.error('Expected 2nd parameter of <doneCallback>.transfer() to be an array. Got:', lastArg);\n  }\n\n  this.postMessage({ response : args }, lastArg);\n}\n\nself.onmessage = function (event) {\n  var scripts = event.data.scripts;\n  if (scripts && scripts.length > 0 && typeof importScripts !== 'function') {\n    throw new Error('importScripts() not supported.');\n  }\n\n  if (event.data.initByScripts) {\n    importScripts.apply(null, scripts);\n  }\n\n  if (event.data.initByMethod) {\n    var method = event.data.method;\n    this.module.exports = Function.apply(null, method.args.concat(method.body));\n\n    if (scripts && scripts.length > 0) {\n      importScripts.apply(null, scripts);\n    }\n  }\n\n  if (event.data.doRun) {\n    var handler = this.module.exports;\n    if (typeof handler !== 'function') {\n      throw new Error('Cannot run thread logic. No handler has been exported.');\n    }\n\n    var preparedHandlerDone = handlerDone.bind(this);\n    preparedHandlerDone.transfer = handlerDoneTransfer.bind(this);\n\n    handler.call(this, event.data.param, preparedHandlerDone, handlerProgress.bind(this));\n  }\n}.bind(self);\n";
},{}],8:[function(require,module,exports){
'use strict';

var has = Object.prototype.hasOwnProperty;

//
// We store our EE objects in a plain object whose properties are event names.
// If `Object.create(null)` is not supported we prefix the event names with a
// `~` to make sure that the built-in object properties are not overridden or
// used as an attack vector.
// We also assume that `Object.create(null)` is available when the event name
// is an ES6 Symbol.
//
var prefix = typeof Object.create !== 'function' ? '~' : false;

/**
 * Representation of a single EventEmitter function.
 *
 * @param {Function} fn Event handler to be called.
 * @param {Mixed} context Context for function execution.
 * @param {Boolean} [once=false] Only emit once
 * @api private
 */
function EE(fn, context, once) {
  this.fn = fn;
  this.context = context;
  this.once = once || false;
}

/**
 * Minimal EventEmitter interface that is molded against the Node.js
 * EventEmitter interface.
 *
 * @constructor
 * @api public
 */
function EventEmitter() { /* Nothing to set */ }

/**
 * Hold the assigned EventEmitters by name.
 *
 * @type {Object}
 * @private
 */
EventEmitter.prototype._events = undefined;

/**
 * Return an array listing the events for which the emitter has registered
 * listeners.
 *
 * @returns {Array}
 * @api public
 */
EventEmitter.prototype.eventNames = function eventNames() {
  var events = this._events
    , names = []
    , name;

  if (!events) return names;

  for (name in events) {
    if (has.call(events, name)) names.push(prefix ? name.slice(1) : name);
  }

  if (Object.getOwnPropertySymbols) {
    return names.concat(Object.getOwnPropertySymbols(events));
  }

  return names;
};

/**
 * Return a list of assigned event listeners.
 *
 * @param {String} event The events that should be listed.
 * @param {Boolean} exists We only need to know if there are listeners.
 * @returns {Array|Boolean}
 * @api public
 */
EventEmitter.prototype.listeners = function listeners(event, exists) {
  var evt = prefix ? prefix + event : event
    , available = this._events && this._events[evt];

  if (exists) return !!available;
  if (!available) return [];
  if (available.fn) return [available.fn];

  for (var i = 0, l = available.length, ee = new Array(l); i < l; i++) {
    ee[i] = available[i].fn;
  }

  return ee;
};

/**
 * Emit an event to all registered event listeners.
 *
 * @param {String} event The name of the event.
 * @returns {Boolean} Indication if we've emitted an event.
 * @api public
 */
EventEmitter.prototype.emit = function emit(event, a1, a2, a3, a4, a5) {
  var evt = prefix ? prefix + event : event;

  if (!this._events || !this._events[evt]) return false;

  var listeners = this._events[evt]
    , len = arguments.length
    , args
    , i;

  if ('function' === typeof listeners.fn) {
    if (listeners.once) this.removeListener(event, listeners.fn, undefined, true);

    switch (len) {
      case 1: return listeners.fn.call(listeners.context), true;
      case 2: return listeners.fn.call(listeners.context, a1), true;
      case 3: return listeners.fn.call(listeners.context, a1, a2), true;
      case 4: return listeners.fn.call(listeners.context, a1, a2, a3), true;
      case 5: return listeners.fn.call(listeners.context, a1, a2, a3, a4), true;
      case 6: return listeners.fn.call(listeners.context, a1, a2, a3, a4, a5), true;
    }

    for (i = 1, args = new Array(len -1); i < len; i++) {
      args[i - 1] = arguments[i];
    }

    listeners.fn.apply(listeners.context, args);
  } else {
    var length = listeners.length
      , j;

    for (i = 0; i < length; i++) {
      if (listeners[i].once) this.removeListener(event, listeners[i].fn, undefined, true);

      switch (len) {
        case 1: listeners[i].fn.call(listeners[i].context); break;
        case 2: listeners[i].fn.call(listeners[i].context, a1); break;
        case 3: listeners[i].fn.call(listeners[i].context, a1, a2); break;
        default:
          if (!args) for (j = 1, args = new Array(len -1); j < len; j++) {
            args[j - 1] = arguments[j];
          }

          listeners[i].fn.apply(listeners[i].context, args);
      }
    }
  }

  return true;
};

/**
 * Register a new EventListener for the given event.
 *
 * @param {String} event Name of the event.
 * @param {Function} fn Callback function.
 * @param {Mixed} [context=this] The context of the function.
 * @api public
 */
EventEmitter.prototype.on = function on(event, fn, context) {
  var listener = new EE(fn, context || this)
    , evt = prefix ? prefix + event : event;

  if (!this._events) this._events = prefix ? {} : Object.create(null);
  if (!this._events[evt]) this._events[evt] = listener;
  else {
    if (!this._events[evt].fn) this._events[evt].push(listener);
    else this._events[evt] = [
      this._events[evt], listener
    ];
  }

  return this;
};

/**
 * Add an EventListener that's only called once.
 *
 * @param {String} event Name of the event.
 * @param {Function} fn Callback function.
 * @param {Mixed} [context=this] The context of the function.
 * @api public
 */
EventEmitter.prototype.once = function once(event, fn, context) {
  var listener = new EE(fn, context || this, true)
    , evt = prefix ? prefix + event : event;

  if (!this._events) this._events = prefix ? {} : Object.create(null);
  if (!this._events[evt]) this._events[evt] = listener;
  else {
    if (!this._events[evt].fn) this._events[evt].push(listener);
    else this._events[evt] = [
      this._events[evt], listener
    ];
  }

  return this;
};

/**
 * Remove event listeners.
 *
 * @param {String} event The event we want to remove.
 * @param {Function} fn The listener that we need to find.
 * @param {Mixed} context Only remove listeners matching this context.
 * @param {Boolean} once Only remove once listeners.
 * @api public
 */
EventEmitter.prototype.removeListener = function removeListener(event, fn, context, once) {
  var evt = prefix ? prefix + event : event;

  if (!this._events || !this._events[evt]) return this;

  var listeners = this._events[evt]
    , events = [];

  if (fn) {
    if (listeners.fn) {
      if (
           listeners.fn !== fn
        || (once && !listeners.once)
        || (context && listeners.context !== context)
      ) {
        events.push(listeners);
      }
    } else {
      for (var i = 0, length = listeners.length; i < length; i++) {
        if (
             listeners[i].fn !== fn
          || (once && !listeners[i].once)
          || (context && listeners[i].context !== context)
        ) {
          events.push(listeners[i]);
        }
      }
    }
  }

  //
  // Reset the array, or remove it completely if we have no more listeners.
  //
  if (events.length) {
    this._events[evt] = events.length === 1 ? events[0] : events;
  } else {
    delete this._events[evt];
  }

  return this;
};

/**
 * Remove all listeners or only the listeners for the specified event.
 *
 * @param {String} event The event want to remove all listeners for.
 * @api public
 */
EventEmitter.prototype.removeAllListeners = function removeAllListeners(event) {
  if (!this._events) return this;

  if (event) delete this._events[prefix ? prefix + event : event];
  else this._events = prefix ? {} : Object.create(null);

  return this;
};

//
// Alias methods names because people roll like that.
//
EventEmitter.prototype.off = EventEmitter.prototype.removeListener;
EventEmitter.prototype.addListener = EventEmitter.prototype.on;

//
// This function doesn't apply anymore.
//
EventEmitter.prototype.setMaxListeners = function setMaxListeners() {
  return this;
};

//
// Expose the prefix.
//
EventEmitter.prefixed = prefix;

//
// Expose the module.
//
if ('undefined' !== typeof module) {
  module.exports = EventEmitter;
}

},{}],9:[function(require,module,exports){
(function (global){
/*! Native Promise Only
    v0.8.1 (c) Kyle Simpson
    MIT License: http://getify.mit-license.org
*/

(function UMD(name,context,definition){
	// special form of UMD for polyfilling across evironments
	context[name] = context[name] || definition();
	if (typeof module != "undefined" && module.exports) { module.exports = context[name]; }
	else if (typeof define == "function" && define.amd) { define(function $AMD$(){ return context[name]; }); }
})("Promise",typeof global != "undefined" ? global : this,function DEF(){
	/*jshint validthis:true */
	"use strict";

	var builtInProp, cycle, scheduling_queue,
		ToString = Object.prototype.toString,
		timer = (typeof setImmediate != "undefined") ?
			function timer(fn) { return setImmediate(fn); } :
			setTimeout
	;

	// dammit, IE8.
	try {
		Object.defineProperty({},"x",{});
		builtInProp = function builtInProp(obj,name,val,config) {
			return Object.defineProperty(obj,name,{
				value: val,
				writable: true,
				configurable: config !== false
			});
		};
	}
	catch (err) {
		builtInProp = function builtInProp(obj,name,val) {
			obj[name] = val;
			return obj;
		};
	}

	// Note: using a queue instead of array for efficiency
	scheduling_queue = (function Queue() {
		var first, last, item;

		function Item(fn,self) {
			this.fn = fn;
			this.self = self;
			this.next = void 0;
		}

		return {
			add: function add(fn,self) {
				item = new Item(fn,self);
				if (last) {
					last.next = item;
				}
				else {
					first = item;
				}
				last = item;
				item = void 0;
			},
			drain: function drain() {
				var f = first;
				first = last = cycle = void 0;

				while (f) {
					f.fn.call(f.self);
					f = f.next;
				}
			}
		};
	})();

	function schedule(fn,self) {
		scheduling_queue.add(fn,self);
		if (!cycle) {
			cycle = timer(scheduling_queue.drain);
		}
	}

	// promise duck typing
	function isThenable(o) {
		var _then, o_type = typeof o;

		if (o != null &&
			(
				o_type == "object" || o_type == "function"
			)
		) {
			_then = o.then;
		}
		return typeof _then == "function" ? _then : false;
	}

	function notify() {
		for (var i=0; i<this.chain.length; i++) {
			notifyIsolated(
				this,
				(this.state === 1) ? this.chain[i].success : this.chain[i].failure,
				this.chain[i]
			);
		}
		this.chain.length = 0;
	}

	// NOTE: This is a separate function to isolate
	// the `try..catch` so that other code can be
	// optimized better
	function notifyIsolated(self,cb,chain) {
		var ret, _then;
		try {
			if (cb === false) {
				chain.reject(self.msg);
			}
			else {
				if (cb === true) {
					ret = self.msg;
				}
				else {
					ret = cb.call(void 0,self.msg);
				}

				if (ret === chain.promise) {
					chain.reject(TypeError("Promise-chain cycle"));
				}
				else if (_then = isThenable(ret)) {
					_then.call(ret,chain.resolve,chain.reject);
				}
				else {
					chain.resolve(ret);
				}
			}
		}
		catch (err) {
			chain.reject(err);
		}
	}

	function resolve(msg) {
		var _then, self = this;

		// already triggered?
		if (self.triggered) { return; }

		self.triggered = true;

		// unwrap
		if (self.def) {
			self = self.def;
		}

		try {
			if (_then = isThenable(msg)) {
				schedule(function(){
					var def_wrapper = new MakeDefWrapper(self);
					try {
						_then.call(msg,
							function $resolve$(){ resolve.apply(def_wrapper,arguments); },
							function $reject$(){ reject.apply(def_wrapper,arguments); }
						);
					}
					catch (err) {
						reject.call(def_wrapper,err);
					}
				})
			}
			else {
				self.msg = msg;
				self.state = 1;
				if (self.chain.length > 0) {
					schedule(notify,self);
				}
			}
		}
		catch (err) {
			reject.call(new MakeDefWrapper(self),err);
		}
	}

	function reject(msg) {
		var self = this;

		// already triggered?
		if (self.triggered) { return; }

		self.triggered = true;

		// unwrap
		if (self.def) {
			self = self.def;
		}

		self.msg = msg;
		self.state = 2;
		if (self.chain.length > 0) {
			schedule(notify,self);
		}
	}

	function iteratePromises(Constructor,arr,resolver,rejecter) {
		for (var idx=0; idx<arr.length; idx++) {
			(function IIFE(idx){
				Constructor.resolve(arr[idx])
				.then(
					function $resolver$(msg){
						resolver(idx,msg);
					},
					rejecter
				);
			})(idx);
		}
	}

	function MakeDefWrapper(self) {
		this.def = self;
		this.triggered = false;
	}

	function MakeDef(self) {
		this.promise = self;
		this.state = 0;
		this.triggered = false;
		this.chain = [];
		this.msg = void 0;
	}

	function Promise(executor) {
		if (typeof executor != "function") {
			throw TypeError("Not a function");
		}

		if (this.__NPO__ !== 0) {
			throw TypeError("Not a promise");
		}

		// instance shadowing the inherited "brand"
		// to signal an already "initialized" promise
		this.__NPO__ = 1;

		var def = new MakeDef(this);

		this["then"] = function then(success,failure) {
			var o = {
				success: typeof success == "function" ? success : true,
				failure: typeof failure == "function" ? failure : false
			};
			// Note: `then(..)` itself can be borrowed to be used against
			// a different promise constructor for making the chained promise,
			// by substituting a different `this` binding.
			o.promise = new this.constructor(function extractChain(resolve,reject) {
				if (typeof resolve != "function" || typeof reject != "function") {
					throw TypeError("Not a function");
				}

				o.resolve = resolve;
				o.reject = reject;
			});
			def.chain.push(o);

			if (def.state !== 0) {
				schedule(notify,def);
			}

			return o.promise;
		};
		this["catch"] = function $catch$(failure) {
			return this.then(void 0,failure);
		};

		try {
			executor.call(
				void 0,
				function publicResolve(msg){
					resolve.call(def,msg);
				},
				function publicReject(msg) {
					reject.call(def,msg);
				}
			);
		}
		catch (err) {
			reject.call(def,err);
		}
	}

	var PromisePrototype = builtInProp({},"constructor",Promise,
		/*configurable=*/false
	);

	// Note: Android 4 cannot use `Object.defineProperty(..)` here
	Promise.prototype = PromisePrototype;

	// built-in "brand" to signal an "uninitialized" promise
	builtInProp(PromisePrototype,"__NPO__",0,
		/*configurable=*/false
	);

	builtInProp(Promise,"resolve",function Promise$resolve(msg) {
		var Constructor = this;

		// spec mandated checks
		// note: best "isPromise" check that's practical for now
		if (msg && typeof msg == "object" && msg.__NPO__ === 1) {
			return msg;
		}

		return new Constructor(function executor(resolve,reject){
			if (typeof resolve != "function" || typeof reject != "function") {
				throw TypeError("Not a function");
			}

			resolve(msg);
		});
	});

	builtInProp(Promise,"reject",function Promise$reject(msg) {
		return new this(function executor(resolve,reject){
			if (typeof resolve != "function" || typeof reject != "function") {
				throw TypeError("Not a function");
			}

			reject(msg);
		});
	});

	builtInProp(Promise,"all",function Promise$all(arr) {
		var Constructor = this;

		// spec mandated checks
		if (ToString.call(arr) != "[object Array]") {
			return Constructor.reject(TypeError("Not an array"));
		}
		if (arr.length === 0) {
			return Constructor.resolve([]);
		}

		return new Constructor(function executor(resolve,reject){
			if (typeof resolve != "function" || typeof reject != "function") {
				throw TypeError("Not a function");
			}

			var len = arr.length, msgs = Array(len), count = 0;

			iteratePromises(Constructor,arr,function resolver(idx,msg) {
				msgs[idx] = msg;
				if (++count === len) {
					resolve(msgs);
				}
			},reject);
		});
	});

	builtInProp(Promise,"race",function Promise$race(arr) {
		var Constructor = this;

		// spec mandated checks
		if (ToString.call(arr) != "[object Array]") {
			return Constructor.reject(TypeError("Not an array"));
		}

		return new Constructor(function executor(resolve,reject){
			if (typeof resolve != "function" || typeof reject != "function") {
				throw TypeError("Not a function");
			}

			iteratePromises(Constructor,arr,function resolver(idx,msg){
				resolve(msg);
			},reject);
		});
	});

	return Promise;
});

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}]},{},[1]);

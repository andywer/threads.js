require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({"./defaults":[function(require,module,exports){
"use strict";

exports.__esModule = true;
/*eslint-env browser*/

exports.default = {
  pool: {
    size: navigator.hardwareConcurrency || 8
  }
};


},{}],"./worker":[function(require,module,exports){
'use strict';

exports.__esModule = true;

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _eventemitter = require('eventemitter3');

var _eventemitter2 = _interopRequireDefault(_eventemitter);

var _slaveCodeUri = require('./slave-code-uri');

var _slaveCodeUri2 = _interopRequireDefault(_slaveCodeUri);

var _config = require('../config');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

if (_typeof(window.Worker) !== 'object' && typeof window.Worker !== 'function') {
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
  var prefix = (0, _config.getConfig)().basepath.web;
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

var Worker = function (_EventEmitter) {
  _inherits(Worker, _EventEmitter);

  function Worker() {
    var initialScript = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
    var importScripts = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];

    _classCallCheck(this, Worker);

    // used by `run()` to decide if the worker must be re-initialized
    var _this = _possibleConstructorReturn(this, _EventEmitter.call(this));

    _this.currentRunnable = null;
    _this.currentImportScripts = [];

    _this.initWorker();
    _this.worker.addEventListener('message', _this.handleMessage.bind(_this));
    _this.worker.addEventListener('error', _this.handleError.bind(_this));

    if (initialScript) {
      _this.run(initialScript, importScripts);
    }
    return _this;
  }

  Worker.prototype.initWorker = function initWorker() {
    try {
      this.worker = new window.Worker(_slaveCodeUri2.default);
    } catch (error) {
      var slaveScriptUrl = (0, _config.getConfig)().fallback.slaveScriptUrl;
      if (slaveScriptUrl) {
        // try using the slave script file instead of the data URI
        this.worker = new window.Worker(slaveScriptUrl);
      } else {
        // re-throw
        throw error;
      }
    }
  };

  Worker.prototype.run = function run(toRun) {
    var importScripts = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];

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
    var transferables = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];

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
    var _this2 = this;

    return new Promise(function (resolve, reject) {
      var resolved = void 0,
          rejected = void 0;
      resolved = function resolved(result) {
        _this2.removeListener('error', rejected);
        resolve(result);
      };
      rejected = function rejected(err) {
        _this2.removeListener('message', resolved);
        reject(err);
      };

      _this2.once('message', resolved).once('error', rejected);
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
}(_eventemitter2.default);

exports.default = Worker;


},{"../config":2,"./slave-code-uri":6,"eventemitter3":8}],1:[function(require,module,exports){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; /*eslint-env browser, amd, commonjs*/
/*global module*/

var _index = require('./index');

var _index2 = _interopRequireDefault(_index);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

if ((typeof window === 'undefined' ? 'undefined' : _typeof(window)) === 'object') {
  window.thread = _index2.default;
}

if (typeof define === 'function') {
  define([], function () {
    return _index2.default;
  });
} else if ((typeof module === 'undefined' ? 'undefined' : _typeof(module)) === 'object') {
  module.exports = _index2.default;
}


},{"./index":3}],2:[function(require,module,exports){
'use strict';

exports.__esModule = true;

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

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
  var ancestorProps = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [];

  Object.keys(srcObj).forEach(function (propKey) {
    var srcValue = srcObj[propKey];
    var ancestorPropsAndThis = ancestorProps.concat([propKey]);

    if ((typeof srcValue === 'undefined' ? 'undefined' : _typeof(srcValue)) === 'object') {
      if (typeof destObj[propKey] !== 'undefined' && _typeof(destObj[propKey]) !== 'object') {
        throw new Error('Expected config property not to be an object: ' + ancestorPropsAndThis.join('.'));
      }
      configDeepMerge(destObj[propKey], srcValue, ancestorPropsAndThis);
    } else {
      if (_typeof(destObj[propKey]) === 'object') {
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
    if ((typeof newConfig === 'undefined' ? 'undefined' : _typeof(newConfig)) !== 'object') {
      throw new Error('Expected config object.');
    }

    configDeepMerge(configuration, newConfig);
  }
};

exports.default = config;
function getConfig() {
  return config.get();
}

function setConfig() {
  return config.set.apply(config, arguments);
}


},{}],3:[function(require,module,exports){
'use strict';

exports.__esModule = true;
exports.Pool = exports.defaults = exports.config = undefined;
exports.spawn = spawn;

require('native-promise-only');

var _config = require('./config');

var _config2 = _interopRequireDefault(_config);

var _defaults = require('./defaults');

var _defaults2 = _interopRequireDefault(_defaults);

var _pool = require('./pool');

var _pool2 = _interopRequireDefault(_pool);

var _worker = require('./worker');

var _worker2 = _interopRequireDefault(_worker);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.config = _config2.default;
exports.defaults = _defaults2.default;
exports.Pool = _pool2.default;
function spawn() {
  var runnable = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
  var importScripts = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];

  return new _worker2.default(runnable, importScripts);
}

exports.default = {
  config: _config2.default,
  defaults: _defaults2.default,
  Pool: _pool2.default,
  spawn: spawn,
  Worker: _worker2.default
};


},{"./config":2,"./defaults":"./defaults","./pool":5,"./worker":"./worker","native-promise-only":9}],4:[function(require,module,exports){
'use strict';

exports.__esModule = true;

var _eventemitter = require('eventemitter3');

var _eventemitter2 = _interopRequireDefault(_eventemitter);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Job = function (_EventEmitter) {
  _inherits(Job, _EventEmitter);

  function Job(pool) {
    _classCallCheck(this, Job);

    var _this = _possibleConstructorReturn(this, _EventEmitter.call(this));

    _this.pool = pool;
    _this.thread = null;

    _this.runArgs = [];
    _this.sendArgs = [];

    pool.emit('newJob', _this);
    return _this;
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
    var _this2 = this;

    // Always return a promise
    return new Promise(function (resolve) {
      // If the thread isn't set, listen for the threadChanged event
      if (!_this2.thread) {
        _this2.once('threadChanged', function () {
          resolve(_this2.thread.promise());
        });
      } else {
        resolve(_this2.thread.promise());
      }
    });
  };

  Job.prototype.destroy = function destroy() {
    this.removeAllListeners();
    delete this.runArgs;
    delete this.sendArgs;
  };

  return Job;
}(_eventemitter2.default);

exports.default = Job;


},{"eventemitter3":8}],5:[function(require,module,exports){
'use strict';

exports.__esModule = true;

var _eventemitter = require('eventemitter3');

var _eventemitter2 = _interopRequireDefault(_eventemitter);

var _job = require('./job');

var _job2 = _interopRequireDefault(_job);

var _defaults = require('./defaults');

var _defaults2 = _interopRequireDefault(_defaults);

var _ = require('./');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Pool = function (_EventEmitter) {
  _inherits(Pool, _EventEmitter);

  function Pool(threads) {
    _classCallCheck(this, Pool);

    var _this = _possibleConstructorReturn(this, _EventEmitter.call(this));

    _this.threads = Pool.spawn(threads || _defaults2.default.pool.size);
    _this.idleThreads = _this.threads.slice();
    _this.jobQueue = [];
    _this.runArgs = [];

    _this.on('newJob', function (job) {
      return _this.handleNewJob(job);
    });
    _this.on('threadAvailable', function () {
      return _this.dequeue();
    });
    return _this;
  }

  Pool.prototype.run = function run() {
    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    this.runArgs = args;
    return this;
  };

  Pool.prototype.send = function send() {
    var _job$run;

    if (!this.runArgs) {
      throw new Error('Pool.send() called without prior Pool.run(). You need to define what to run first.');
    }

    var job = new _job2.default(this);
    return (_job$run = job.run.apply(job, this.runArgs)).send.apply(_job$run, arguments);
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
      for (var _len2 = arguments.length, args = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
        args[_key2] = arguments[_key2];
      }

      return _this2.handleJobSuccess.apply(_this2, [thread, job].concat(args));
    }).once('error', function () {
      for (var _len3 = arguments.length, args = Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {
        args[_key3] = arguments[_key3];
      }

      return _this2.handleJobError.apply(_this2, [thread, job].concat(args));
    });

    job.executeOn(thread);
  };

  Pool.prototype.handleNewJob = function handleNewJob(job) {
    var _this3 = this;

    job.once('readyToRun', function () {
      return _this3.queueJob(job);
    }); // triggered by job.send()
  };

  Pool.prototype.handleJobSuccess = function handleJobSuccess(thread, job) {
    for (var _len4 = arguments.length, responseArgs = Array(_len4 > 2 ? _len4 - 2 : 0), _key4 = 2; _key4 < _len4; _key4++) {
      responseArgs[_key4 - 2] = arguments[_key4];
    }

    this.emit.apply(this, ['done', job].concat(responseArgs));
    this.handleJobDone(thread, job);
  };

  Pool.prototype.handleJobError = function handleJobError(thread, job, error) {
    this.emit('error', job, error);
    this.handleJobDone(thread, job);
  };

  Pool.prototype.handleJobDone = function handleJobDone(thread, job) {
    var _this4 = this;

    job.destroy(); // to prevent memory leak
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
}(_eventemitter2.default);

exports.default = Pool;


Pool.spawn = function (threadCount) {
  var threads = [];

  for (var threadIndex = 0; threadIndex < threadCount; threadIndex++) {
    threads.push((0, _.spawn)());
  }

  return threads;
};


},{"./":3,"./defaults":"./defaults","./job":4,"eventemitter3":8}],6:[function(require,module,exports){
'use strict';

exports.__esModule = true;

var _slaveCode = require('./slave-code');

var _slaveCode2 = _interopRequireDefault(_slaveCode);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var slaveCodeDataUri = 'data:text/javascript;charset=utf-8,' + encodeURI(_slaveCode2.default);
var createBlobURL = window.createBlobURL || window.createObjectURL;

if (!createBlobURL) {
  var URL = window.URL || window.webkitURL;

  if (URL) {
    createBlobURL = URL.createObjectURL;
  } else {
    throw new Error('No Blob creation implementation found.');
  }
}

if (typeof window.BlobBuilder === 'function' && typeof createBlobURL === 'function') {
  var blobBuilder = new window.BlobBuilder();
  blobBuilder.append(_slaveCode2.default);
  slaveCodeDataUri = createBlobURL(blobBuilder.getBlob());
} else if (typeof window.Blob === 'function' && typeof createBlobURL === 'function') {
  var blob = new window.Blob([_slaveCode2.default], { type: 'text/javascript' });
  slaveCodeDataUri = createBlobURL(blob);
}

exports.default = slaveCodeDataUri;


},{"./slave-code":7}],7:[function(require,module,exports){
module.exports = "/*eslint-env worker*/\n/*global importScripts*/\n/*eslint-disable no-console*/\nself.module = {\n  exports : function() {\n    if (console) { console.error('No thread logic initialized.'); }\n  }\n};\n\nfunction handlerDone() {\n  var args = Array.prototype.slice.call(arguments, 0);\n  this.postMessage({ response : args });\n}\n\nfunction handlerProgress(progress) {\n  this.postMessage({ progress : progress });\n}\n\nfunction handlerDoneTransfer() {\n  var args = Array.prototype.slice.call(arguments);\n  var lastArg = args.pop();\n\n  if (!(lastArg instanceof Array) && this.console) {\n    console.error('Expected 2nd parameter of <doneCallback>.transfer() to be an array. Got:', lastArg);\n  }\n\n  this.postMessage({ response : args }, lastArg);\n}\n\nself.onmessage = function (event) {\n  var scripts = event.data.scripts;\n  if (scripts && scripts.length > 0 && typeof importScripts !== 'function') {\n    throw new Error('importScripts() not supported.');\n  }\n\n  if (event.data.initByScripts) {\n    importScripts.apply(null, scripts);\n  }\n\n  if (event.data.initByMethod) {\n    var method = event.data.method;\n    this.module.exports = Function.apply(null, method.args.concat(method.body));\n\n    if (scripts && scripts.length > 0) {\n      importScripts.apply(null, scripts);\n    }\n  }\n\n  if (event.data.doRun) {\n    var handler = this.module.exports;\n    if (typeof handler !== 'function') {\n      throw new Error('Cannot run thread logic. No handler has been exported.');\n    }\n\n    var preparedHandlerDone = handlerDone.bind(this);\n    preparedHandlerDone.transfer = handlerDoneTransfer.bind(this);\n\n    handler.call(this, event.data.param, preparedHandlerDone, handlerProgress.bind(this));\n  }\n}.bind(self);\n";
},{}],8:[function(require,module,exports){
'use strict';

var has = Object.prototype.hasOwnProperty
  , prefix = '~';

/**
 * Constructor to create a storage for our `EE` objects.
 * An `Events` instance is a plain object whose properties are event names.
 *
 * @constructor
 * @api private
 */
function Events() {}

//
// We try to not inherit from `Object.prototype`. In some engines creating an
// instance in this way is faster than calling `Object.create(null)` directly.
// If `Object.create(null)` is not supported we prefix the event names with a
// character to make sure that the built-in object properties are not
// overridden or used as an attack vector.
//
if (Object.create) {
  Events.prototype = Object.create(null);

  //
  // This hack is needed because the `__proto__` property is still inherited in
  // some old browsers like Android 4, iPhone 5.1, Opera 11 and Safari 5.
  //
  if (!new Events().__proto__) prefix = false;
}

/**
 * Representation of a single event listener.
 *
 * @param {Function} fn The listener function.
 * @param {Mixed} context The context to invoke the listener with.
 * @param {Boolean} [once=false] Specify if the listener is a one-time listener.
 * @constructor
 * @api private
 */
function EE(fn, context, once) {
  this.fn = fn;
  this.context = context;
  this.once = once || false;
}

/**
 * Minimal `EventEmitter` interface that is molded against the Node.js
 * `EventEmitter` interface.
 *
 * @constructor
 * @api public
 */
function EventEmitter() {
  this._events = new Events();
  this._eventsCount = 0;
}

/**
 * Return an array listing the events for which the emitter has registered
 * listeners.
 *
 * @returns {Array}
 * @api public
 */
EventEmitter.prototype.eventNames = function eventNames() {
  var names = []
    , events
    , name;

  if (this._eventsCount === 0) return names;

  for (name in (events = this._events)) {
    if (has.call(events, name)) names.push(prefix ? name.slice(1) : name);
  }

  if (Object.getOwnPropertySymbols) {
    return names.concat(Object.getOwnPropertySymbols(events));
  }

  return names;
};

/**
 * Return the listeners registered for a given event.
 *
 * @param {String|Symbol} event The event name.
 * @param {Boolean} exists Only check if there are listeners.
 * @returns {Array|Boolean}
 * @api public
 */
EventEmitter.prototype.listeners = function listeners(event, exists) {
  var evt = prefix ? prefix + event : event
    , available = this._events[evt];

  if (exists) return !!available;
  if (!available) return [];
  if (available.fn) return [available.fn];

  for (var i = 0, l = available.length, ee = new Array(l); i < l; i++) {
    ee[i] = available[i].fn;
  }

  return ee;
};

/**
 * Calls each of the listeners registered for a given event.
 *
 * @param {String|Symbol} event The event name.
 * @returns {Boolean} `true` if the event had listeners, else `false`.
 * @api public
 */
EventEmitter.prototype.emit = function emit(event, a1, a2, a3, a4, a5) {
  var evt = prefix ? prefix + event : event;

  if (!this._events[evt]) return false;

  var listeners = this._events[evt]
    , len = arguments.length
    , args
    , i;

  if (listeners.fn) {
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
        case 4: listeners[i].fn.call(listeners[i].context, a1, a2, a3); break;
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
 * Add a listener for a given event.
 *
 * @param {String|Symbol} event The event name.
 * @param {Function} fn The listener function.
 * @param {Mixed} [context=this] The context to invoke the listener with.
 * @returns {EventEmitter} `this`.
 * @api public
 */
EventEmitter.prototype.on = function on(event, fn, context) {
  var listener = new EE(fn, context || this)
    , evt = prefix ? prefix + event : event;

  if (!this._events[evt]) this._events[evt] = listener, this._eventsCount++;
  else if (!this._events[evt].fn) this._events[evt].push(listener);
  else this._events[evt] = [this._events[evt], listener];

  return this;
};

/**
 * Add a one-time listener for a given event.
 *
 * @param {String|Symbol} event The event name.
 * @param {Function} fn The listener function.
 * @param {Mixed} [context=this] The context to invoke the listener with.
 * @returns {EventEmitter} `this`.
 * @api public
 */
EventEmitter.prototype.once = function once(event, fn, context) {
  var listener = new EE(fn, context || this, true)
    , evt = prefix ? prefix + event : event;

  if (!this._events[evt]) this._events[evt] = listener, this._eventsCount++;
  else if (!this._events[evt].fn) this._events[evt].push(listener);
  else this._events[evt] = [this._events[evt], listener];

  return this;
};

/**
 * Remove the listeners of a given event.
 *
 * @param {String|Symbol} event The event name.
 * @param {Function} fn Only remove the listeners that match this function.
 * @param {Mixed} context Only remove the listeners that have this context.
 * @param {Boolean} once Only remove one-time listeners.
 * @returns {EventEmitter} `this`.
 * @api public
 */
EventEmitter.prototype.removeListener = function removeListener(event, fn, context, once) {
  var evt = prefix ? prefix + event : event;

  if (!this._events[evt]) return this;
  if (!fn) {
    if (--this._eventsCount === 0) this._events = new Events();
    else delete this._events[evt];
    return this;
  }

  var listeners = this._events[evt];

  if (listeners.fn) {
    if (
         listeners.fn === fn
      && (!once || listeners.once)
      && (!context || listeners.context === context)
    ) {
      if (--this._eventsCount === 0) this._events = new Events();
      else delete this._events[evt];
    }
  } else {
    for (var i = 0, events = [], length = listeners.length; i < length; i++) {
      if (
           listeners[i].fn !== fn
        || (once && !listeners[i].once)
        || (context && listeners[i].context !== context)
      ) {
        events.push(listeners[i]);
      }
    }

    //
    // Reset the array, or remove it completely if we have no more listeners.
    //
    if (events.length) this._events[evt] = events.length === 1 ? events[0] : events;
    else if (--this._eventsCount === 0) this._events = new Events();
    else delete this._events[evt];
  }

  return this;
};

/**
 * Remove all listeners, or those of the specified event.
 *
 * @param {String|Symbol} [event] The event name.
 * @returns {EventEmitter} `this`.
 * @api public
 */
EventEmitter.prototype.removeAllListeners = function removeAllListeners(event) {
  var evt;

  if (event) {
    evt = prefix ? prefix + event : event;
    if (this._events[evt]) {
      if (--this._eventsCount === 0) this._events = new Events();
      else delete this._events[evt];
    }
  } else {
    this._events = new Events();
    this._eventsCount = 0;
  }

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
// Allow `EventEmitter` to be imported as module namespace.
//
EventEmitter.EventEmitter = EventEmitter;

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

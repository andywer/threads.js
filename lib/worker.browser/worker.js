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

'use strict';

exports.__esModule = true;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _eventemitter3 = require('eventemitter3');

var _eventemitter32 = _interopRequireDefault(_eventemitter3);

var _slaveCode = require('./slave-code');

var _slaveCode2 = _interopRequireDefault(_slaveCode);

var _config = require('../config');

if (typeof window.Worker !== 'object' && typeof window.Worker !== 'function') {
  throw new Error('Browser does not support web workers!');
}

var slaveCodeDataUri = 'data:text/javascript;charset=utf-8,' + encodeURI(_slaveCode2['default']);

function prependScriptUrl(scriptUrl) {
  var prefix = _config.getConfig().basepath.web;
  return prefix ? prefix + '/' + scriptUrl : scriptUrl;
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

    this.worker = new window.Worker(slaveCodeDataUri);
    this.worker.addEventListener('message', this.handleMessage.bind(this));
    this.worker.addEventListener('error', this.handleError.bind(this));

    if (initialScript) {
      this.run(initialScript, importScripts);
    }
  }

  Worker.prototype.run = function run(toRun) {
    var importScripts = arguments.length <= 1 || arguments[1] === undefined ? [] : arguments[1];

    if (typeof toRun === 'function') {
      this.runMethod(toRun, importScripts);
    } else {
      this.runScripts(toRun, importScripts);
    }
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

  Worker.prototype.handleMessage = function handleMessage(event) {
    if (event.data.error) {
      this.handleError(event.data.error);
    } else {
      var responseArgs = convertToArray(event.data.response);
      this.emit.apply(this, ['message'].concat(responseArgs));
    }
  };

  Worker.prototype.handleError = function handleError(error) {
    if (!this.listeners('error', true)) {
      logError(error);
    }

    error.preventDefault();
    this.emit('error', error);
  };

  return Worker;
})(_eventemitter32['default']);

exports['default'] = Worker;
module.exports = exports['default'];
//# sourceMappingURL=../worker.browser/worker.js.map
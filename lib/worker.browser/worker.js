'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x5, _x6, _x7) { var _again = true; _function: while (_again) { var object = _x5, property = _x6, receiver = _x7; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x5 = parent; _x6 = property; _x7 = receiver; _again = true; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _eventemitter3 = require('eventemitter3');

var _eventemitter32 = _interopRequireDefault(_eventemitter3);

var _slaveJsTxt = require('./slave.js.txt');

var _slaveJsTxt2 = _interopRequireDefault(_slaveJsTxt);

var _config = require('../config');

if (typeof window.Worker !== 'object') {
  throw new Error('Browser does not support web workers!');
}

var slaveCodeDataUri = 'data:text/javascript;charset=utf-8,' + encodeURI(_slaveJsTxt2['default']);

function prependScriptUrl(scriptUrl) {
  var prefix = (0, _config.getConfig)().basepath.web;
  return prefix ? prefix + '/' + scriptUrl : scriptUrl;
}

var Worker = (function (_EventEmitter) {
  _inherits(Worker, _EventEmitter);

  function Worker() {
    var initialScript = arguments.length <= 0 || arguments[0] === undefined ? null : arguments[0];
    var importScripts = arguments.length <= 1 || arguments[1] === undefined ? [] : arguments[1];

    _classCallCheck(this, Worker);

    _get(Object.getPrototypeOf(Worker.prototype), 'constructor', this).call(this);

    this.worker = new Worker(slaveCodeDataUri);
    this.setupListeners();

    if (initialScript) {
      this.run(initialScript, importScripts);
    }
  }

  _createClass(Worker, [{
    key: 'run',
    value: function run(toRun) {
      var importScripts = arguments.length <= 1 || arguments[1] === undefined ? [] : arguments[1];

      if (typeof toRun === 'function') {
        this.runMethod(toRun, importScripts);
      } else {
        this.runScripts(toRun, importScripts);
      }
      return this;
    }
  }, {
    key: 'runMethod',
    value: function runMethod(method, importScripts) {
      this.worker.postMessage({
        initByMethod: true,
        scripts: importScripts
      });
    }
  }, {
    key: 'runScripts',
    value: function runScripts(script, importScripts) {
      if (!script) {
        throw new Error('Must pass a function or a script URL to run().');
      }

      // attention: array for browser, single script for node
      this.worker.postMessage({
        initByScripts: true,
        scripts: importScripts.concat([script]).map(prependScriptUrl)
      });
    }
  }, {
    key: 'send',
    value: function send(param) {
      var transferables = arguments.length <= 1 || arguments[1] === undefined ? [] : arguments[1];

      this.worker.postMessage({
        doRun: true,
        param: param
      }, transferables);
      return this;
    }
  }, {
    key: 'kill',
    value: function kill() {
      this.worker.terminate();
      this.emit('exit');
      return this;
    }
  }, {
    key: 'setupListeners',
    value: function setupListeners() {
      this.worker.addEventListener('message', this.emit.bind(this, 'message'));
      this.worker.addEventListener('error', this.emit.bind(this, 'error'));
    }
  }]);

  return Worker;
})(_eventemitter32['default']);

exports['default'] = Worker;
module.exports = exports['default'];
//# sourceMappingURL=../worker.browser/worker.js.map
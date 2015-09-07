'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x2, _x3, _x4) { var _again = true; _function: while (_again) { var object = _x2, property = _x3, receiver = _x4; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x2 = parent; _x3 = property; _x4 = receiver; _again = true; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) arr2[i] = arr[i]; return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _child_process = require('child_process');

var _child_process2 = _interopRequireDefault(_child_process);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _eventemitter3 = require('eventemitter3');

var _eventemitter32 = _interopRequireDefault(_eventemitter3);

var _config = require('../config');

var Worker = (function (_EventEmitter) {
  _inherits(Worker, _EventEmitter);

  function Worker(initialRunnable) {
    var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

    _classCallCheck(this, Worker);

    _get(Object.getPrototypeOf(Worker.prototype), 'constructor', this).call(this);

    this.slave = _child_process2['default'].fork(_path2['default'].join(__dirname, 'slave.js'), [], options);
    this.slave.on('message', this.handleMessage.bind(this));
    this.slave.on('error', this.handleError.bind(this));
    this.slave.on('exit', this.emit.bind(this, 'exit'));

    if (initialRunnable) {
      this.run(initialRunnable);
    }
  }

  _createClass(Worker, [{
    key: 'run',
    value: function run(toRun) {
      if (typeof toRun === 'function') {
        this.runMethod(toRun);
      } else {
        this.runScript(toRun);
      }
      return this;
    }
  }, {
    key: 'runMethod',
    value: function runMethod(method) {
      this.slave.send({
        initByMethod: true,
        method: method.toString()
      });
    }
  }, {
    key: 'runScript',
    value: function runScript(script) {
      if (!script) {
        throw new Error('Must pass a function or a script path to run().');
      }

      var prefixedScriptPath = _path2['default'].join((0, _config.getConfig)().basepath.node, script);

      // attention: single script for node, array for browser
      this.slave.send({
        initByScript: true,
        script: _path2['default'].resolve(prefixedScriptPath)
      });
    }
  }, {
    key: 'send',
    value: function send(param) {
      this.slave.send({
        doRun: true,
        param: param
      });
      return this;
    }
  }, {
    key: 'kill',
    value: function kill() {
      this.slave.kill();
      return this;
    }
  }, {
    key: 'promise',
    value: function promise() {
      var _this = this;

      return new Promise(function (resolve, reject) {
        _this.once('message', resolve).once('error', reject);
      });
    }
  }, {
    key: 'handleMessage',
    value: function handleMessage(message) {
      if (message.error) {
        var error = new Error(message.error.message);
        error.stack = message.error.stack;

        this.handleError(error);
      } else {
        this.emit.apply(this, ['message'].concat(_toConsumableArray(message.response)));
      }
    }
  }, {
    key: 'handleError',
    value: function handleError(error) {
      if (!this.listeners('error', true)) {
        console.error(error.stack || error); // eslint-disable-line no-console
      }
      this.emit('error', error);
    }
  }]);

  return Worker;
})(_eventemitter32['default']);

exports['default'] = Worker;
module.exports = exports['default'];
//# sourceMappingURL=../worker.node/worker.js.map
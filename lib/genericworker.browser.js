/*eslint-env browser*/

'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x3, _x4, _x5) { var _again = true; _function: while (_again) { var object = _x3, property = _x4, receiver = _x5; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x3 = parent; _x4 = property; _x5 = receiver; _again = true; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _workerJs = require('./worker.js');

var _workerJs2 = _interopRequireDefault(_workerJs);

var slaveCode = 'this._thread = {' + '  methodId : 0,' + '  method   : function () {}' + '};' + 'this.onmessage = function (event) {' + '  if (event.data.methodId !== this._thread.methodId) {' + '    var method = event.data.method;' + '    this._thread.method = Function.apply(null, method.args.concat(method.body));' + '    this._thread.methodId = event.data.methodId;' + '    ' + '    var scripts = event.data.importScripts;' + '    if (scripts.length > 0) {' + '      if (typeof importScripts !== "function") {' + '        throw new Error("importScripts not supported.");' + '      }' + '      importScripts.apply(null, scripts);' + '    }' + '  }' + '  this._thread.method(event.data.parameter, function(result) {' + '    postMessage(result);' + '  });' + '}';

var slaveCodeDataUri = 'data:text/javascript;charset=utf-8,' + encodeURI(slaveCode);

var GenericWorker = (function (_Worker) {
  _inherits(GenericWorker, _Worker);

  function GenericWorker() {
    _classCallCheck(this, GenericWorker);

    _get(Object.getPrototypeOf(GenericWorker.prototype), 'constructor', this).call(this, slaveCodeDataUri);
    this.method = null;
    this.methodId = 0;
    this.importScripts = [];
  }

  _createClass(GenericWorker, [{
    key: 'run',
    value: function run(method) {
      var importScripts = arguments.length <= 1 || arguments[1] === undefined ? [] : arguments[1];

      if (importScripts.length === 0 && this.importScripts.length === 0) {
        // eliminate the case `both are empty array, but different array instances`
        importScripts = this.importScripts;
      }

      if (method === this.method && importScripts === this.importScripts) {
        return this;
      }

      this.method = method;
      this.methodId++;

      return this;
    }
  }, {
    key: 'send',
    value: function send(param) {
      var transferables = arguments.length <= 1 || arguments[1] === undefined ? [] : arguments[1];

      if (!this.method) {
        throw new Error('Call run(<method>) on generic worker before you send().');
      }

      _get(Object.getPrototypeOf(GenericWorker.prototype), 'send', this).call(this, {
        method: this.method,
        methodId: this.methodId,
        importScripts: this.importScripts,
        param: param
      }, transferables);

      return this;
    }
  }]);

  return GenericWorker;
})(_workerJs2['default']);

exports['default'] = GenericWorker;
module.exports = exports['default'];
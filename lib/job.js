'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) arr2[i] = arr[i]; return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _eventemitter3 = require('eventemitter3');

var _eventemitter32 = _interopRequireDefault(_eventemitter3);

var Job = (function (_EventEmitter) {
  _inherits(Job, _EventEmitter);

  function Job(pool) {
    _classCallCheck(this, Job);

    _get(Object.getPrototypeOf(Job.prototype), 'constructor', this).call(this);
    this.pool = pool;
    this.thread = null;

    this.runArgs = [];
    this.clearSendParameter();

    pool.emit('newJob', this);
  }

  _createClass(Job, [{
    key: 'run',
    value: function run() {
      for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }

      if (args.length === 0) {
        throw new Error('Cannot call .run() without arguments.');
      }

      this.runArgs = args;
      return this;
    }
  }, {
    key: 'send',
    value: function send() {
      if (this.runArgs.length === 0) {
        throw new Error('Cannot .send() before .run().');
      }

      for (var _len2 = arguments.length, args = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
        args[_key2] = arguments[_key2];
      }

      if (this.hasSendParameter()) {
        var _clone$clearSendParameter;

        // do not alter this job, clone it and set send param instead
        return (_clone$clearSendParameter = this.clone().clearSendParameter()).send.apply(_clone$clearSendParameter, args);
      }

      this.sendArgs = args;
      this.parameterSet = true;

      this.emit('readyToRun');
      return this;
    }
  }, {
    key: 'executeOn',
    value: function executeOn(thread) {
      var _thread$once$once$run, _thread$once$once;

      (_thread$once$once$run = (_thread$once$once = thread.once('message', this.emit.bind(this, 'done')).once('error', this.emit.bind(this, 'error'))).run.apply(_thread$once$once, _toConsumableArray(this.runArgs))).send.apply(_thread$once$once$run, _toConsumableArray(this.sendArgs));

      this.thread = thread;
      return this;
    }
  }, {
    key: 'promise',
    value: function promise() {
      if (!this.thread) {
        throw new Error('Cannot return promise, since job is not executed.');
      }
      return this.thread.promise();
    }
  }, {
    key: 'clone',
    value: function clone() {
      var clone = new Job(this.pool);

      if (this.runArgs.length > 0) {
        clone.run.apply(clone, _toConsumableArray(this.runArgs));
      }
      if (this.parameterSet) {
        clone.send.apply(clone, _toConsumableArray(this.sendArgs));
      }

      return clone;
    }
  }, {
    key: 'hasSendParameter',
    value: function hasSendParameter() {
      return this.parameterSet;
    }
  }, {
    key: 'clearSendParameter',
    value: function clearSendParameter() {
      this.parameterSet = false;
      this.sendArgs = [];
      return this;
    }
  }]);

  return Job;
})(_eventemitter32['default']);

exports['default'] = Job;
module.exports = exports['default'];
//# sourceMappingURL=job.js.map
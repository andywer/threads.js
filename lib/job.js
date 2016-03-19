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

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

'use strict';

exports.__esModule = true;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _eventemitter3 = require('eventemitter3');

var _eventemitter32 = _interopRequireDefault(_eventemitter3);

var _job = require('./job');

var _job2 = _interopRequireDefault(_job);

var _ = require('./');

var Pool = (function (_EventEmitter) {
  _inherits(Pool, _EventEmitter);

  function Pool() {
    var threads = arguments.length <= 0 || arguments[0] === undefined ? 8 : arguments[0];

    _classCallCheck(this, Pool);

    _EventEmitter.call(this);
    this.threads = Pool.spawn(threads);
    this.idleThreads = this.threads.slice();
    this.jobQueue = [];
    this.lastCreatedJob = null;

    this.on('newJob', this.handleNewJob.bind(this));
  }

  Pool.prototype.run = function run() {
    var _ref;

    return (_ref = new _job2['default'](this)).run.apply(_ref, arguments);
  };

  Pool.prototype.send = function send() {
    var _lastCreatedJob;

    if (!this.lastCreatedJob) {
      throw new Error('Pool.send() called without prior Pool.run(). You need to define what to run first.');
    }

    // this will not alter the last job, but rather clone it and set this params on the new job
    return (_lastCreatedJob = this.lastCreatedJob).send.apply(_lastCreatedJob, arguments);
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
    if (this.jobQueue.length === 0 || this.idleThreads.length === 0) {
      return;
    }

    var job = this.jobQueue.shift();
    var thread = this.idleThreads.shift();

    job.on('done', this.handleJobSuccess.bind(this, thread, job)).on('error', this.handleJobError.bind(this, thread, job));

    job.executeOn(thread);
  };

  Pool.prototype.handleNewJob = function handleNewJob(job) {
    this.lastCreatedJob = job;
    job.on('readyToRun', this.queueJob.bind(this, job)); // triggered by job.send()
  };

  Pool.prototype.handleJobSuccess = function handleJobSuccess(thread, job) {
    for (var _len = arguments.length, responseArgs = Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++) {
      responseArgs[_key - 2] = arguments[_key];
    }

    this.emit.apply(this, ['done', job].concat(responseArgs));
    this.handleJobDone(thread);
  };

  Pool.prototype.handleJobError = function handleJobError(thread, job, error) {
    this.emit('error', job, error);
    this.handleJobDone(thread);
  };

  Pool.prototype.handleJobDone = function handleJobDone(thread) {
    var _this = this;

    this.idleThreads.push(thread);
    this.dequeue();

    if (this.idleThreads.length === this.threads.length) {
      // run deferred to give other job.on('done') handlers time to run first
      setTimeout(function () {
        _this.emit('finished');
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
'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x3, _x4, _x5) { var _again = true; _function: while (_again) { var object = _x3, property = _x4, receiver = _x5; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x3 = parent; _x4 = property; _x5 = receiver; _again = true; desc = parent = undefined; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _async = require('async');

var _async2 = _interopRequireDefault(_async);

var _expectJs = require('expect.js');

var _expectJs2 = _interopRequireDefault(_expectJs);

var _eventemitter3 = require('eventemitter3');

var _eventemitter32 = _interopRequireDefault(_eventemitter3);

var _lib = require('../../lib/');

var spawnedFakeWorkers = 0;

var FakeWorker = (function (_EventEmitter) {
  _inherits(FakeWorker, _EventEmitter);

  function FakeWorker() {
    _classCallCheck(this, FakeWorker);

    _get(Object.getPrototypeOf(FakeWorker.prototype), 'constructor', this).call(this);
    spawnedFakeWorkers++;
  }

  _createClass(FakeWorker, [{
    key: 'run',
    value: function run(runnable) {
      var importScripts = arguments.length <= 1 || arguments[1] === undefined ? [] : arguments[1];

      this.runnable = runnable;
      this.importScripts = importScripts;
      return this;
    }
  }, {
    key: 'send',
    value: function send(parameter) {
      var _this = this;

      var transferables = arguments.length <= 1 || arguments[1] === undefined ? [] : arguments[1];

      this.parameter = parameter;
      this.transferables = transferables;

      setTimeout(function () {
        if (parameter.error) {
          _this.emit('error', parameter.error);
        } else {
          _this.emit('message', parameter);
        }
      }, 0);
      return this;
    }
  }, {
    key: 'kill',
    value: function kill() {
      this.emit('exit');
      return this;
    }
  }]);

  return FakeWorker;
})(_eventemitter32['default']);

function noop() {
  return this;
}

function doTimes(callback, times) {
  var returns = [];

  for (var index = 0; index < times; index++) {
    returns.push(callback());
  }

  return returns;
}

describe('Pool', function () {

  var origSpawn = _lib.Pool.spawn;
  var origDefaultSize = _lib.defaults.pool.size;
  var fixedDefaultSize = 3;

  before(function () {
    _lib.Pool.spawn = function (threadCount) {
      return doTimes(function () {
        return new FakeWorker();
      }, threadCount);
    };
    _lib.defaults.pool.size = fixedDefaultSize;
  });

  beforeEach(function () {
    spawnedFakeWorkers = 0;
  });

  after(function () {
    _lib.Pool.spawn = origSpawn;
    _lib.defaults.pool.size = origDefaultSize;
  });

  it('can be created (w/o arguments)', function () {
    var pool = new _lib.Pool();

    (0, _expectJs2['default'])(pool.threads.length).to.equal(fixedDefaultSize);
    (0, _expectJs2['default'])(pool.idleThreads).to.eql(pool.threads);
    (0, _expectJs2['default'])(spawnedFakeWorkers).to.equal(fixedDefaultSize);
  });

  it('can be created with arguments', function () {
    var pool = new _lib.Pool(5);

    (0, _expectJs2['default'])(pool.threads.length).to.equal(5);
    (0, _expectJs2['default'])(pool.idleThreads).to.eql(pool.threads);
    (0, _expectJs2['default'])(spawnedFakeWorkers).to.equal(5);
  });

  it('can kill', function (done) {
    var pool = new _lib.Pool(5);
    var killedThreads = 0;

    pool.threads.forEach(function (thread) {
      thread.on('exit', function () {
        killedThreads++;
      });
    });

    pool.killAll();

    setTimeout(function () {
      (0, _expectJs2['default'])(killedThreads).to.equal(5);
      done();
    }, 20);
  });

  it('can run jobs', function (done) {
    var pool = new _lib.Pool();
    var calledJobA = 0,
        calledJobB = 0;

    var jobA = pool.run(noop).send({ foo: 1 });
    var jobB = pool.run(noop).send({ foo: 2 });

    pool.on('done', function (job, message) {
      switch (job) {
        case jobA:
          calledJobA++;
          (0, _expectJs2['default'])(message).to.eql({ foo: 1 });
          break;
        case jobB:
          calledJobB++;
          (0, _expectJs2['default'])(message).to.eql({ foo: 2 });
          break;
        default:
          throw new Error('"message" event for unknown job.');
      }
    }).on('finished', function () {
      (0, _expectJs2['default'])(calledJobA).to.equal(1);
      (0, _expectJs2['default'])(calledJobB).to.equal(1);
      done();
    });
  });

  it('can handle errors', function (done) {
    var doneHandled = false,
        errorHandled = false;

    var pool = new _lib.Pool();

    var jobA = pool.run(noop).send({ foo: 'bar' });
    var jobB = pool.run(noop).send({ error: new Error('Something went wrong.') });

    pool.on('done', function (job, message) {
      doneHandled = true;
      (0, _expectJs2['default'])(job).to.equal(jobA);
      (0, _expectJs2['default'])(message).to.eql({ foo: 'bar' });
    }).on('error', function (job, error) {
      errorHandled = true;
      (0, _expectJs2['default'])(job).to.equal(jobB);
      (0, _expectJs2['default'])(error.message).to.eql('Something went wrong.');
    }).on('finished', function () {
      (0, _expectJs2['default'])(doneHandled).to.equal(true);
      (0, _expectJs2['default'])(errorHandled).to.equal(true);
      done();
    });
  });

  it('can queue jobs', function (done) {
    var calledJobA = 0,
        calledJobB = 0,
        calledJobC = 0;
    var calledJobD = 0,
        calledJobE = 0;
    var pool = new _lib.Pool(2);

    var part1 = function part1(partDone) {
      pool.run(noop).send({ foo: 1 }).on('done', function () {
        calledJobA++;
      });
      pool.run(noop).send({ foo: 2 }).on('done', function () {
        calledJobB++;
      });
      pool.run(noop).send({ foo: 3 }).on('done', function () {
        calledJobC++;
      });

      pool.once('finished', function () {
        (0, _expectJs2['default'])(calledJobA).to.equal(1);
        (0, _expectJs2['default'])(calledJobB).to.equal(1);
        (0, _expectJs2['default'])(calledJobC).to.equal(1);
        partDone();
      });
    };

    var part2 = function part2(partDone) {

      pool.run(noop).send({ error: new Error('Will the next job still be handled correctly?') }).on('error', function () {
        calledJobD++;
      });

      pool.run(noop).send({ foo: 4 }).on('done', function () {
        calledJobE++;
      });

      pool.once('finished', function () {
        // expectation: previous handlers have not been triggered again
        (0, _expectJs2['default'])(calledJobA).to.equal(1);
        (0, _expectJs2['default'])(calledJobB).to.equal(1);
        (0, _expectJs2['default'])(calledJobC).to.equal(1);

        (0, _expectJs2['default'])(calledJobD).to.equal(1);
        (0, _expectJs2['default'])(calledJobE).to.equal(1);
        partDone();
      });
    };

    _async2['default'].series([part1, part2], done);
  });

  it('can run a lot of jobs', function (done) {
    var pool = new _lib.Pool(3);
    var calledJob = 0;

    function onDone() {
      calledJob++;
    }

    for (var jobIndex = 0; jobIndex < 50; jobIndex++) {
      pool.run(noop).send({ jobIndex: jobIndex }).on('done', onDone);
    }

    pool.once('finished', function () {
      (0, _expectJs2['default'])(calledJob).to.equal(50);
      done();
    });
  });
});
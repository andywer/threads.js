'use strict';

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) arr2[i] = arr[i]; return arr2; } else { return Array.from(arr); } }

var _expectJs = require('expect.js');

var _expectJs2 = _interopRequireDefault(_expectJs);

var _sinon = require('sinon');

var _sinon2 = _interopRequireDefault(_sinon);

var _eventemitter3 = require('eventemitter3');

var _eventemitter32 = _interopRequireDefault(_eventemitter3);

var _libJob = require('../../lib/job');

var _libJob2 = _interopRequireDefault(_libJob);

var fakeThreadPromise = new Promise(function (resolve) {
  setTimeout(function () {
    resolve(100);
  });
});

function noop() {
  return this;
}

function createFakeThread(response) {
  var thread = new _eventemitter32['default']();

  thread.run = noop;
  thread.promise = function () {
    return fakeThreadPromise;
  };

  if (response.error) {
    thread.send = function () {
      thread.emit('error', response.error);
    };
  } else {
    thread.send = function () {
      thread.emit.apply(thread, ['message'].concat(_toConsumableArray(response.response)));
    };
  }

  ['on', 'once', 'emit', 'run', 'send'].forEach(function (methodName) {
    _sinon2['default'].spy(thread, methodName);
  });

  return thread;
}

describe('Job', function () {
  var pool = undefined;

  beforeEach(function () {
    // fake pool
    pool = new _eventemitter32['default']();
    _sinon2['default'].spy(pool, 'emit');
  });

  it('can be created', function () {
    var job = new _libJob2['default'](pool);

    (0, _expectJs2['default'])(job.sendArgs).to.eql([]);
    _sinon2['default'].assert.calledOnce(pool.emit);
    _sinon2['default'].assert.calledWith(pool.emit, 'newJob', job);
  });

  it('throws on .run() without arguments', function () {
    var job = new _libJob2['default'](pool);

    (0, _expectJs2['default'])(function () {
      job.run();
    }).to.throwError(/Cannot call \.run\(\) without arguments/);
  });

  it('throws on .send() before .run()', function () {
    var job = new _libJob2['default'](pool);

    (0, _expectJs2['default'])(function () {
      job.send();
    }).to.throwError(/Cannot \.send\(\) before \.run\(\)/);
  });

  it('triggers readyToRun event on .send()', function () {
    var job = new _libJob2['default'](pool);
    _sinon2['default'].spy(job, 'emit');

    job.run(noop);
    _sinon2['default'].assert.neverCalledWith(job.emit, 'readyToRun');
    job.send();
    _sinon2['default'].assert.calledWith(job.emit, 'readyToRun');
  });

  it('can be executed', function () {
    var thread = {
      once: noop,
      run: noop,
      send: noop
    };
    var mock = _sinon2['default'].mock(thread);

    var job = new _libJob2['default'](pool);
    var runnable = noop;
    var importScripts = [];
    var param = 'some data';
    var transferables = [];

    mock.expects('run').once().withArgs(runnable, importScripts).returnsThis();
    mock.expects('send').once().withArgs(param, transferables).returnsThis();

    job.run(runnable, importScripts).send(param, transferables).executeOn(thread);

    mock.verify();
  });

  it('triggers done event', function () {
    var thread = createFakeThread({
      response: [{ foo: 'bar' }, 'more data']
    });

    var job = new _libJob2['default'](pool);
    _sinon2['default'].spy(job, 'emit');

    job.run(noop).send().executeOn(thread);

    _sinon2['default'].assert.calledWith(job.emit, 'done', { foo: 'bar' }, 'more data');
  });

  it('triggers error event', function () {
    var error = new Error('Epic fail');
    var thread = createFakeThread({
      error: error
    });

    var job = new _libJob2['default'](pool);
    _sinon2['default'].spy(job, 'emit');

    job.run(noop).send().executeOn(thread);

    _sinon2['default'].assert.calledWith(job.emit, 'error', error);
  });

  it('proxies the promise', function (done) {
    var job = new _libJob2['default'](pool);
    var thread = createFakeThread({
      response: ['foo bar']
    });

    var promise = job.run(noop).send().executeOn(thread).promise();

    Promise.all([promise, fakeThreadPromise]).then(function (results) {
      (0, _expectJs2['default'])(results[0]).to.equal(results[1]);
      done();
    });
  });

  it('Creates a promise even if there is no thread', function () {
    var job = new _libJob2['default'](pool);

    job.run(noop).send();

    (0, _expectJs2['default'])(job.promise() instanceof Promise).to.equal(true);
  });
});
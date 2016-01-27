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

function noop() {
  return this;
}

function createThreadPromise() {
  var _this = this;

  return new Promise(function (resolve, reject) {
    _this.once('message', resolve).once('error', reject);
  });
}

function createFakeThread(response) {
  var thread = new _eventemitter32['default']();

  thread.run = noop;
  thread.promise = createThreadPromise;

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

    (0, _expectJs2['default'])(job.hasSendParameter()).to.equal(false);
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
      send: noop,
      promise: createThreadPromise
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

  it('can clone empty job', function () {
    var job = new _libJob2['default'](pool);
    var clone = job.clone();

    (0, _expectJs2['default'])(clone.runArgs).to.eql(job.runArgs);
    (0, _expectJs2['default'])(clone.sendArgs).to.eql(job.sendArgs);
    (0, _expectJs2['default'])(clone.hasSendParameter()).to.equal(job.hasSendParameter());
  });

  it('can clone with runnable (w/o parameter)', function () {
    var job = new _libJob2['default'](pool);
    var runnable = noop;
    var importScripts = [];

    job.run(runnable, importScripts);
    var clone = job.clone();

    (0, _expectJs2['default'])(clone.runArgs).to.eql(job.runArgs);
    (0, _expectJs2['default'])(clone.sendArgs).to.eql(job.sendArgs);
    (0, _expectJs2['default'])(clone.hasSendParameter()).to.equal(job.hasSendParameter());
  });

  it('can clone with runnable & parameter', function () {
    var job = new _libJob2['default'](pool);
    var runnable = noop;
    var importScripts = [];
    var param = 'some data';
    var transferables = [];

    job.run(runnable, importScripts).send(param, transferables);

    var clone = job.clone();

    (0, _expectJs2['default'])(clone.runArgs).to.eql(job.runArgs);
    (0, _expectJs2['default'])(clone.sendArgs).to.eql(job.sendArgs);
    (0, _expectJs2['default'])(clone.hasSendParameter()).to.equal(job.hasSendParameter());
  });

  it('clones on 2nd .send()', function () {
    var job = new _libJob2['default'](pool);
    var runnable = noop;
    var paramA = { foo: 'bar' };
    var paramB = 'foo bar';

    job.run(runnable).send(paramA);

    var clone = job.send(paramB);

    (0, _expectJs2['default'])(clone).not.to.equal(job);
    (0, _expectJs2['default'])(clone.runArgs).to.eql(job.runArgs);
    (0, _expectJs2['default'])(clone.sendArgs).to.eql([paramB]);
    (0, _expectJs2['default'])(clone.hasSendParameter()).to.equal(true);
    (0, _expectJs2['default'])(job.sendArgs).to.eql([paramA]);
    (0, _expectJs2['default'])(job.hasSendParameter()).to.equal(true);
  });

  it('proxies the promise', function () {
    var job = new _libJob2['default'](pool);
    var thread = createFakeThread({
      response: ['foo bar']
    });

    var promise = job.run(noop).promise();

    job.send().executeOn(thread);

    (0, _expectJs2['default'])(promise).to.be.a(Promise);
  });

  it('returns a promise without .executeOn()', function () {
    var job = new _libJob2['default'](pool);

    job.run(noop).send();

    (0, _expectJs2['default'])(job.promise()).to.be.a(Promise);
  });
});
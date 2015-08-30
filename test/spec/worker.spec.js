'use strict';

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _async = require('async');

var _async2 = _interopRequireDefault(_async);

var _expectJs = require('expect.js');

var _expectJs2 = _interopRequireDefault(_expectJs);

var _sinon = require('sinon');

var _sinon2 = _interopRequireDefault(_sinon);

var _ = require('../../');

var env = typeof window === 'object' ? 'browser' : 'node';

function echoThread(param, done) {
  done(param);
}

function canSendAndReceive(worker, dataToSend, expectToRecv, done) {
  worker.once('message', function (data) {
    (0, _expectJs2['default'])(data).to.eql(expectToRecv);
    done();
  }).send(dataToSend);
}

function canSendAndReceiveEcho(worker, done) {
  var testData = { foo: 'bar' };
  canSendAndReceive(worker, testData, testData, done);
}

describe('Worker', function () {

  before(function () {
    _sinon2['default'].stub(_.config, 'get').returns({
      basepath: {
        node: __dirname + '/../thread-scripts',
        web: '/thread-scripts'
      }
    });
  });

  it('can be spawned', function () {
    var worker = (0, _.spawn)();

    (0, _expectJs2['default'])(worker).to.be.a('object');
    (0, _expectJs2['default'])(worker).to.be.a(_.Worker);
  });

  it('can be killed', function (done) {
    var spy = undefined;
    var worker = (0, _.spawn)();

    // the browser worker owns a worker, the node worker owns a slave
    if (env === 'browser') {
      spy = _sinon2['default'].spy(worker.worker, 'terminate');
    } else {
      spy = _sinon2['default'].spy(worker.slave, 'kill');
    }

    worker.on('exit', function () {
      (0, _expectJs2['default'])(spy.calledOnce).to.be.ok();
      done();
    });
    worker.kill();
  });

  it('can run method (set using spawn())', function (done) {
    var worker = (0, _.spawn)(echoThread);
    canSendAndReceiveEcho(worker, done);
  });

  it('can run method (set using .run())', function (done) {
    var worker = (0, _.spawn)().run(echoThread);
    canSendAndReceiveEcho(worker, done);
  });

  it('can run script (set using spawn())', function (done) {
    var worker = (0, _.spawn)('../thread-scripts/abc-sender.js');
    canSendAndReceive(worker, null, 'abc', done);
  });

  it('can run script (set using .run())', function (done) {
    var worker = (0, _.spawn)(echoThread);
    canSendAndReceiveEcho(worker, done);
  });

  it('can reset thread code', function (done) {
    var worker = (0, _.spawn)();

    // .run(code), .send(data), .run(script), .send(data), .run(code), .send(data)
    _async2['default'].series([function (stepDone) {
      canSendAndReceiveEcho(worker.run(echoThread), stepDone);
    }, function (stepDone) {
      canSendAndReceive(worker.run('../thread-scripts/abc-sender.js'), null, 'abc', stepDone);
    }, function (stepDone) {
      canSendAndReceiveEcho(worker.run(echoThread), stepDone);
    }], done);
  });

  it('can emit error', function (done) {
    var worker = (0, _.spawn)(function () {
      throw new Error('Test message');
    });

    worker.on('error', function (error) {
      (0, _expectJs2['default'])(error.message).to.eql('Test message');
      done();
    });
    worker.send();
  });

  if (env === 'node') {

    it('thread code can use setTimeout, setInterval', function (done) {
      var messageCount = 0;

      var worker = (0, _.spawn)().run(function (param, threadDone) {
        setTimeout(function () {
          setInterval(function () {
            threadDone(true);
          }, 10);
        }, 20);
      }).send().on('message', function (response) {
        messageCount++;
        if (messageCount === 3) {
          worker.kill();
          done();
        }
      });
    });
  }
});
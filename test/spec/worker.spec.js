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
        web: 'http://localhost:9876/base/test/thread-scripts'
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
    var worker = (0, _.spawn)('abc-sender.js');
    canSendAndReceive(worker, null, 'abc', done);
  });

  it('can run script (set using .run())', function (done) {
    var worker = (0, _.spawn)(echoThread);
    canSendAndReceiveEcho(worker, done);
  });

  it('can pass more than one argument as response', function (done) {
    var worker = (0, _.spawn)(function (input, threadDone) {
      threadDone('a', 'b', 'c');
    });
    worker.send().on('message', function (a, b, c) {
      (0, _expectJs2['default'])(a).to.eql('a');
      (0, _expectJs2['default'])(b).to.eql('b');
      (0, _expectJs2['default'])(c).to.eql('c');
      worker.kill();
      done();
    });
  });

  it('can reset thread code', function (done) {
    var worker = (0, _.spawn)();

    // .run(code), .send(data), .run(script), .send(data), .run(code), .send(data)
    _async2['default'].series([function (stepDone) {
      canSendAndReceiveEcho(worker.run(echoThread), stepDone);
    }, function (stepDone) {
      canSendAndReceive(worker.run('abc-sender.js'), null, 'abc', stepDone);
    }, function (stepDone) {
      canSendAndReceiveEcho(worker.run(echoThread), stepDone);
    }], done);
  });

  it('can emit error', function (done) {
    var worker = (0, _.spawn)(function () {
      throw new Error('Test message');
    });

    worker.on('error', function (error) {
      (0, _expectJs2['default'])(error.message).to.match(/^(Uncaught Error: )?Test message$/);
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
      }).send().on('message', function () {
        messageCount++;
        if (messageCount === 3) {
          worker.kill();
          done();
        }
      });
    });
  }

  if (env === 'browser') {

    it('can importScripts()', function (done) {
      var worker = (0, _.spawn)().run(function (input, threadDone) {
        this.importedEcho(input, threadDone);
      }, ['import-me.js']).send('abc').on('message', function (response) {
        (0, _expectJs2['default'])(response).to.eql('abc');
        worker.kill();
        done();
      });
    });

    // TODO: test transferables
  }
});
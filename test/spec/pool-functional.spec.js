'use strict';

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _expectJs = require('expect.js');

var _expectJs2 = _interopRequireDefault(_expectJs);

var _lib = require('../../lib/');

describe('Pool (functional test)', function () {
  var pool = new _lib.Pool();
  var jobs = [],
      promises = [];

  var handler = function handler(input, done) {
    done(input);
  };

  pool.run(handler);

  it('can send data and run promisified', function () {
    for (var i = 0; i < 10; i++) {
      var job = pool.send(i);
      if (jobs.indexOf(job) > -1) {
        throw new Error('pool.send() returns the same job twice');
      }

      jobs.push(job);
      promises.push(job.promise());
    }
  });

  it('responds as expected', function (done) {
    Promise.all(promises).then(function (responses) {
      (0, _expectJs2['default'])(responses.sort()).to.eql([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
      done();
    })['catch'](function (error) {
      done(error);
    });
  });
});
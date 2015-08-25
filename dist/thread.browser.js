require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.spawn = spawn;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _worker = require('./worker');

var _worker2 = _interopRequireDefault(_worker);

function spawn() {
  var url = arguments.length <= 0 || arguments[0] === undefined ? null : arguments[0];

  // TODO: GenericWorker if url === null

  return new _worker2['default']();
}

// TODO: export Pool
},{"./worker":"./worker"}],"./worker":[function(require,module,exports){
/*eslint-env browser*/

'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var Worker = function Worker() {
  _classCallCheck(this, Worker);

  // TODO
  console.log('Browser worker.');
};

exports['default'] = Worker;
module.exports = exports['default'];
},{}]},{},[1]);

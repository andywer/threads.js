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
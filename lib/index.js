'use strict';

exports.__esModule = true;
exports.spawn = spawn;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

require('native-promise-only');

var _config = require('./config');

var _config2 = _interopRequireDefault(_config);

var _defaults = require('./defaults');

var _defaults2 = _interopRequireDefault(_defaults);

var _pool = require('./pool');

var _pool2 = _interopRequireDefault(_pool);

var _worker = require('./worker');

var _worker2 = _interopRequireDefault(_worker);

exports.config = _config2['default'];
exports.defaults = _defaults2['default'];
exports.Pool = _pool2['default'];

function spawn() {
  var runnable = arguments.length <= 0 || arguments[0] === undefined ? null : arguments[0];
  var importScripts = arguments.length <= 1 || arguments[1] === undefined ? [] : arguments[1];

  return new _worker2['default'](runnable, importScripts);
}

exports['default'] = {
  config: _config2['default'],
  defaults: _defaults2['default'],
  Pool: _pool2['default'],
  spawn: spawn,
  Worker: _worker2['default']
};
//# sourceMappingURL=index.js.map

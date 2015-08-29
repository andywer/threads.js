/*
 * This file is only a stub to make './worker' resolve the './worker.node/worker' module.
 * Loading the browser worker into the browser bundle is done in the gulpfile by
 * configuring a browserify override.
 */

'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _workerNodeWorker = require('./worker.node/worker');

var _workerNodeWorker2 = _interopRequireDefault(_workerNodeWorker);

exports['default'] = _workerNodeWorker2['default'];
module.exports = exports['default'];
//# sourceMappingURL=worker.js.map
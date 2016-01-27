/*eslint-env browser, amd, commonjs*/
/*global module*/

'use strict';

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _index = require('./index');

var _index2 = _interopRequireDefault(_index);

if (typeof window === 'object') {
  window.thread = _index2['default'];
}

if (typeof define === 'function') {
  define([], function () {
    return _index2['default'];
  });
} else if (typeof module === 'object') {
  module.exports = _index2['default'];
}
//# sourceMappingURL=bundle.browser.js.map

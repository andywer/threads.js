/*eslint-env browser, amd, commonjs*/
/*global module*/

import threadLib from './index';

if (typeof window === 'object') {
  window.thread = threadLib;
}

if (typeof define === 'function') {
  define([], function() { return threadLib; });
} else if (typeof module === 'object') {
  module.exports = threadLib;
}

/*eslint-env node*/
/*
 * This file is only a stub to make './worker' resolve the './worker.node/worker' module.
 * Loading the browser worker into the browser bundle is done in the gulpfile by
 * configuring a browserify override.
 */

if (typeof process !== 'undefined' && 'pid' in process) {
  module.exports = require('./worker.node/worker');
} else {
  module.exports = require('./worker.browser/worker');
}

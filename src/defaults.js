/*eslint-env node*/
/*
 * This file is only a stub to make './defaults' resolve the './defaults.node' module.
 * Loading the browser defaults into the browser bundle is done in the gulpfile by
 * configuring a browserify override.
 */

if (typeof process !== 'undefined' && 'pid' in process) {
  module.exports = require('./defaults.node');
} else {
  module.exports = require('./defaults.browser');
}

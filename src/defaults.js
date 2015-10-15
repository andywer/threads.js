/*global module, require*/
/*
 * This file is only a stub to make './defaults' resolve the './defaults.node' module.
 * Loading the browser defaults into the browser bundle is done in the gulpfile by
 * configuring a browserify override.
 */

if (typeof window === 'undefined') {
  module.exports = require('./defaults.node');
} else {
  module.exports = require('./defaults.browser');
}

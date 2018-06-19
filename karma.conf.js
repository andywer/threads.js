// Karma configuration

module.exports = function configureKarma(config) {
  config.set({
    // base path that will be used to resolve all patterns (eg. files, exclude)
    basePath: '',

    // frameworks to use
    // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
    frameworks: ['browserify', 'mocha', 'expect'],

    // list of files / patterns to load in the browser
    files: [
      'test/spec-build/*.spec.js',
      { pattern : 'test/thread-scripts/*.js', included : false }
    ],

    // list of files to exclude
    exclude: [
      '**/*.swp'
    ],

    // preprocess matching files before serving them to the browser
    // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
    preprocessors: {
      'test/spec-build/*.spec.js': ['browserify']
    },

    browserify: {
      debug     : true,
      configure(bundle) {
        bundle.on('prebundle', () => {
          bundle.require('./lib/worker.browser/worker.js', { expose : './worker' })   // keep the node worker out of the bundle
        });
      }
    },

    // test results reporter to use
    // possible values: 'dots', 'progress'
    // available reporters: https://npmjs.org/browse/keyword/karma-reporter
    reporters: ['progress'],

    // web server port
    port: 9876,

    // enable / disable colors in the output (reporters and logs)
    colors: true,

    // level of logging
    // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
    logLevel: config.LOG_INFO,

    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: true,

    browserNoActivityTimeout: 10000,

    // start these browsers
    // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
    browsers: ['ChromeHeadlessInsecure', 'Firefox'],

    customLaunchers: {
      ChromeHeadlessInsecure: {
        base: 'ChromeHeadless',
        flags: ['--disable-web-security', '--headless', '--no-sandbox']
      }
    },

    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    singleRun: true
  });
};

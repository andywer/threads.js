/*eslint-env node*/
'use strict';

var gulp       = require('gulp');
var babel      = require('gulp-babel');
var browserify = require('browserify');
var concat     = require('gulp-concat');
var eslint     = require('gulp-eslint');
var karma      = require('karma');
var mocha      = require('gulp-mocha');
var path       = require('path');
var rename     = require('gulp-rename');
var source     = require('vinyl-source-stream');
var sourcemaps = require('gulp-sourcemaps');
var through    = require('through2');
var uglify     = require('gulp-uglify');


function toStringModule() {
  return through.obj(function(file, enc, done) {
    if (file.isBuffer()) {
      var newContents = 'module.exports = ' + JSON.stringify(file.contents.toString(enc)) + ';';
      file.contents = new Buffer(newContents, enc);
    } else if (file.isStream()) {
      throw new Error('Streams are not yet supported.');
    }
    done(null, file);
  });
}

function runKarma(options, done) {
  if (typeof options === 'function') {
    done = options;
    options = {};
  }
  options.configFile = path.join(__dirname, '/karma.conf.js');

  new karma.Server(options, function(exitCode) {
    if (exitCode === 0) {
      done();
    } else {
      done(new Error('Karma quit with exit code ' + exitCode));
    }
  }).start();
}


// Fix for gulp not terminating after mocha finishes
gulp.doneCallback = function (err) {
  process.exit(err ? 1 : 0);          // eslint-disable-line no-process-exit
};


gulp.task('lint', function() {
  return gulp.src(['src/**/*.js', 'src/**/*.js.txt', 'test/spec-src/*.js'])
    .pipe(eslint())
    .pipe(eslint.format())
    .pipe(eslint.failOnError());
});


gulp.task('copy-slave', function() {
  return gulp.src('src/worker.browser/slave.js.txt')
    .pipe(rename('slave.js'))
    .pipe(gulp.dest('dist/'));
});


gulp.task('babel-lib', function() {
  return gulp.src('src/**/*.js')
    .pipe(sourcemaps.init())
    .pipe(babel({ loose : 'all' }))
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest('lib/'));
});

gulp.task('babel-spec', function() {
  return gulp.src('test/spec-src/**/*.js')
    .pipe(babel())
    .pipe(gulp.dest('test/spec'));
});


gulp.task('browser-slave-module', function() {
  return gulp.src('./src/worker.browser/slave.js.txt')
    .pipe(toStringModule())
    .pipe(rename('slave-code.js'))
    .pipe(gulp.dest('./lib/worker.browser/'));
});


gulp.task('browserify-lib', ['babel-lib', 'browser-slave-module'], function() {
  return browserify()
    .add('./lib/bundle.browser.js')

    // overrides, so the node-specific files won't make their way into the bundle
    .require('./lib/worker.browser/worker.js', { expose : './worker' })
    .require('./lib/defaults.browser.js', { expose : './defaults' })
    .bundle()
    .pipe(source('threads.browser.js'))
    .pipe(gulp.dest('dist/'));
});

gulp.task('uglify-lib', ['browserify-lib'], function() {
  return gulp.src('dist/threads.browser.js')
    .pipe(uglify())
    .pipe(concat('threads.browser.min.js'))
    .pipe(gulp.dest('dist/'));
});

gulp.task('uglify-slave', ['copy-slave'], function() {
  return gulp.src('dist/slave.js')
    .pipe(uglify())
    .pipe(concat('slave.min.js'))
    .pipe(gulp.dest('dist/'));
});

gulp.task('uglify', ['uglify-lib', 'uglify-slave']);


gulp.task('test-browser', ['dist', 'babel-spec'], function(done) {
  runKarma(done);
});

gulp.task('test-browser-after-node', ['test-node'], function(done) {
  runKarma(done);
});

gulp.task('test-node', ['dist', 'babel-spec'], function() {
  return gulp.src('test/spec/*.spec.js', { read: false })
    .pipe(mocha());
});


gulp.task('dist', ['lint', 'browserify-lib', 'uglify']);
gulp.task('test', ['test-node', 'test-browser-after-node']);

gulp.task('default', ['dist', 'test']);

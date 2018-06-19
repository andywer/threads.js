/*eslint-env node*/
'use strict';

const gulp       = require('gulp');
const babel      = require('gulp-babel');
const browserify = require('browserify');
const concat     = require('gulp-concat');
const eslint     = require('gulp-eslint');
const karma      = require('karma');
const mocha      = require('gulp-mocha');
const path       = require('path');
const rename     = require('gulp-rename');
const source     = require('vinyl-source-stream');
const sourcemaps = require('gulp-sourcemaps');
const through    = require('through2');
const uglify     = require('gulp-uglify');


function toStringModule() {
  return through.obj((file, enc, done) => {
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

  new karma.Server(options, exitCode => {
    if (exitCode === 0) {
      done();
    } else {
      done(new Error('Karma quit with exit code ' + exitCode));
    }
  }).start();
}


// Fix for gulp not terminating after mocha finishes
gulp.doneCallback = error => {
  process.exit(error ? 1 : 0);          // eslint-disable-line no-process-exit
};


gulp.task('lint', () => {
  return gulp.src(['src/**/*.js', 'src/**/*.js.txt', 'test/spec/*.js'])
    .pipe(eslint())
    .pipe(eslint.format())
    .pipe(eslint.failOnError());
});


gulp.task('copy-slave', () => {
  return gulp.src('src/worker.browser/slave.js.txt')
    .pipe(rename('slave.js'))
    .pipe(gulp.dest('dist/'));
});


gulp.task('babel-lib', () => {
  return gulp.src('src/**/*.js')
    .pipe(sourcemaps.init())
    .pipe(babel())
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest('lib/'));
});

gulp.task('babel-spec', () => {
  return gulp.src('test/spec/**/*.js')
    .pipe(babel())
    .pipe(gulp.dest('test/spec-build'));
});


gulp.task('browser-slave-module', () => {
  return gulp.src('./src/worker.browser/slave.js.txt')
    .pipe(toStringModule())
    .pipe(rename('slave-code.js'))
    .pipe(gulp.dest('./lib/worker.browser/'));
});


gulp.task('browserify-lib', ['babel-lib', 'browser-slave-module'], () => {
  return browserify({ standalone: 'threads' })
    .add('./lib/index.js')

    // overrides, so the node-specific files won't make their way into the bundle
    .require('./lib/worker.browser/worker.js', { expose : './worker' })
    .require('./lib/defaults.browser.js', { expose : './defaults' })
    .bundle()
    .pipe(source('threads.browser.js'))
    .pipe(gulp.dest('dist/'));
});

gulp.task('uglify-lib', ['browserify-lib'], () => {
  return gulp.src('dist/threads.browser.js')
    .pipe(uglify())
    .pipe(concat('threads.browser.min.js'))
    .pipe(gulp.dest('dist/'));
});

gulp.task('uglify-slave', ['copy-slave'], () => {
  return gulp.src('dist/slave.js')
    .pipe(uglify())
    .pipe(concat('slave.min.js'))
    .pipe(gulp.dest('dist/'));
});

gulp.task('uglify', ['uglify-lib', 'uglify-slave']);


gulp.task('test-browser', ['dist', 'babel-spec'], done => {
  runKarma(done);
});

gulp.task('test-browser-after-node', ['test-node'], done => {
  runKarma(done);
});

gulp.task('test-node', ['dist', 'babel-spec'], () => {
  return gulp.src('test/spec-build/*.spec.js', { read: false })
    .pipe(mocha());
});


gulp.task('dist', ['lint', 'browserify-lib', 'uglify']);
gulp.task('test', ['test-node', 'test-browser-after-node']);

gulp.task('default', ['dist', 'test']);

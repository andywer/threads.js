'use strict';

var gulp       = require('gulp');
var babel      = require('gulp-babel');
var browserify = require('browserify');
var concat     = require('gulp-concat');
var eslint     = require('gulp-eslint');
var mocha      = require('gulp-mocha');
var source     = require('vinyl-source-stream');
var sourcemaps = require('gulp-sourcemaps');
var stringify  = require('stringify');
var uglify     = require('gulp-uglify');


// Fix for gulp not terminating after mocha finishes
gulp.doneCallback = function (err) {
  process.exit(err ? 1 : 0);
};


gulp.task('lint', function() {
  return gulp.src('src/**/*.js')
    .pipe(eslint())
    .pipe(eslint.format())
    .pipe(eslint.failOnError());
});


gulp.task('babel-lib', function() {
  return gulp.src('src/**/*.js')
    .pipe(sourcemaps.init())
    .pipe(babel())
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest('lib/'));
});

gulp.task('babel-spec', function() {
  return gulp.src('test/spec-src/**/*.js')
    .pipe(babel())
    .pipe(gulp.dest('test/spec'));
});


gulp.task('browserify-lib', ['babel-lib'], function() {
  return browserify()
    .transform(stringify(['.txt']))
    .add('./lib/bundle.browser.js')
    .require('./src/worker.browser/slave.js.txt', { expose : './slave.js.txt' })
    .require('./lib/worker.browser/worker.js', { expose : './worker' })
    .bundle()
    .pipe(source('thread.browser.js'))
    .pipe(gulp.dest('dist/'));
});

gulp.task('uglify', ['browserify-lib'], function() {
  return gulp.src('dist/thread.browser.js')
    .pipe(uglify())
    .pipe(concat('thread.browser.min.js'))
    .pipe(gulp.dest('dist/'));
});


gulp.task('test', ['dist', 'babel-spec'], function() {
  return gulp.src('test/spec/*.spec.js', { read: false })
    .pipe(mocha());
});


gulp.task('dist', ['lint', 'browserify-lib', 'uglify']);

gulp.task('default', ['dist', 'test']);

'use strict';

var gulp       = require('gulp');
var babel      = require('gulp-babel');
var browserify = require('browserify');
var concat     = require('gulp-concat');
var eslint     = require('gulp-eslint');
var source     = require('vinyl-source-stream');
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


gulp.task('babel', function() {
  return gulp.src('src/**/*.js')
    .pipe(babel())
    .pipe(gulp.dest('lib/'));
});


gulp.task('browserify', ['babel'], function() {
  return browserify('./lib/index.js')
    .require('./lib/worker.browser.js', { expose : './worker' })
    .bundle()
    .pipe(source('thread.browser.js'))
    .pipe(gulp.dest('dist/'));
});


gulp.task('uglify', ['browserify'], function() {
  return gulp.src('dist/thread.browser.js')
    .pipe(uglify())
    .pipe(concat('thread.browser.min.js'))
    .pipe(gulp.dest('dist/'));
});


gulp.task('dist', ['lint', 'browserify', 'uglify']);

gulp.task('default', ['dist']);

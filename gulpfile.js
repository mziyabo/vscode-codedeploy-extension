var del = require('del');
var gulp = require('gulp');
var ts = require('gulp-typescript');
var tsProject = ts.createProject('tsconfig.json');

// Build project
function build(cb) {
    return tsProject.src()
        .pipe(tsProject())
        .js.pipe(gulp.dest('out/src'));
}

// Clean output directory
function clean(cb) {
    return del(["./out/**/*", "./dist/**/*"]);
}

exports.clean = clean;
exports.build = build;

exports.default = gulp.series(clean, build);
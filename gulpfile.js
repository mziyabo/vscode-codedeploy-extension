var del = require('del');
var gulp = require('gulp');
var ts = require('gulp-typescript');
var tsProject = ts.createProject('tsconfig.json');
const nls = require('vscode-nls-dev');
const es = require('event-stream');

// If all VS Code languages are support you can use nls.coreLanguages
const languages = [{ folderName: 'jpn', id: 'ja' }];

const addI18nTask = function () {
    return gulp.src(['package.nls.json'])
        .pipe(nls.createAdditionalLanguageFiles(languages, 'i18n'))
        .pipe(gulp.dest('.'));
};

// Build project
function build(cb) {
    buildNls = true
    return tsProject.src()
    .pipe(tsProject())
    .js.pipe(gulp.dest('out/src'))
    .pipe(buildNls ? nls.rewriteLocalizeCalls() : es.through())
    .pipe(buildNls ? nls.createAdditionalLanguageFiles(languages, 'i18n', 'out') : es.through())
}

// Clean output directory
function clean(cb) {
    return del(["./out/**/*", "./dist/**/*", "package.nls.*.json"]);
}

exports.clean = clean;
exports.build = build;
exports.default = gulp.series(clean, build, addI18nTask);
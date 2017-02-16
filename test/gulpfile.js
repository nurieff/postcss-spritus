var gulp = require('gulp')
  , spritus = require('../index')
  , autoprefixer = require('autoprefixer')
  , precss = require('precss')
  , postcss = require('gulp-postcss');

gulp.task('css', function () {
  return gulp.src('./assets/css/*.css')
    .pipe(postcss([
      precss(),
      spritus(),
      autoprefixer()
    ]))
    .pipe(gulp.dest('./public/css'));
});

gulp.task("default", ['css']);

gulp.task("watch", function () {

  gulp.watch([
    './assets/css/*.css'
  ], ['css']);

});
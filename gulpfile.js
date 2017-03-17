const gulp = require('gulp');
const browserSync = require('browser-sync').create();
const reload = browserSync.reload;

gulp.task('serve', () => {
  browserSync.init({
    notify: false,
    server: {
        baseDir: './'
    }
  });

  gulp.watch('scripts/*').on('change', browserSync.reload);
});

gulp.task('default', ['serve']);

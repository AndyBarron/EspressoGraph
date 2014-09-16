module.exports = function(grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    uglify: {
      options: {
        mangle: true,
        compress: true,
        sourceMap: true,
        preserveComments: 'some',
      },
      build: {
        src: 'src/espressograph.js',
        dest: 'build/espressograph.min.js'
      }
    }
  });
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.registerTask('default', ['uglify']);
};
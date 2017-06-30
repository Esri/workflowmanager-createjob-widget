/* global module */
module.exports = function(grunt) {
  var stemappDir = '/Users/cody7018/Projects/WebAppBuilderForArcGIS/client/stemapp';
  // var appDir = 'D:/arcgis-web-appbuilder-1.2/server/apps/1';

  grunt.initConfig({
    watch: {
      main: {
        files: ['widgets/**'],
        tasks: ['sync'],
        options: {
          spawn: false
        }
      }
    },

    sync: {
      stemApp: {
        files: [{
          // cwd: 'src',
          src: [
            'widgets/**'
          ],
          dest: stemappDir
        }],
        verbose: true // Display log messages when copying files
      },
      libs: {
        files: [{
          // cwd: 'src',
          src: [
            'widgets/WorkflowManagerCreateJobs/exifjs'
          ],
          dest: stemappDir + '/libs'
        }],
        verbose: true // Display log messages when copying files
      }//,
      // app: {
      //   files: [{
      //     // cwd: 'src',
      //     src: [
      //       'widgets/**', 'libs/**'
      //     ],
      //     dest: appDir
      //   }],
      //   verbose: true // Display log messages when copying files
      // }
    }

  });

  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-sync');

  grunt.registerTask('default', ['sync', 'watch']);
};

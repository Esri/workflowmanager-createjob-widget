/* global module */
module.exports = function(grunt) {

  var stemappDir = '/Users/cody7018/Projects/WebAppBuilderForArcGIS/client/stemapp';
  var appDir = '/Users/cody7018/Projects/WebAppBuilderForArcGIS/server/apps/4';
  // var stemappDir = '/c/WebAppBuilderForArcGIS/client/stemapp';
  // var appDir = '/c/WebAppBuilderForArcGIS/server/apps/20';

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
          cwd: 'widgets/WorkflowManagerCreateJobs',
          src: [
            'exifjs/**'
          ],
          dest: stemappDir + '/libs'
        }, {
          cwd: 'widgets/WorkflowManagerCreateJobs/libs',
          src: [
            'workflowmanager/**'
          ],
          dest: stemappDir + '/libs'
        }],
        verbose: true // Display log messages when copying files
      },
      app: {
        files: [{
          // cwd: 'src',
          src: [
            'widgets/**'
          ],
          dest: appDir
        }],
        verbose: true // Display log messages when copying files
      }
    }

  });

  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-sync');

  grunt.registerTask('default', ['sync', 'watch']);
};

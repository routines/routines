'use strict';

module.exports = function(grunt) {

    grunt.loadNpmTasks('grunt-contrib-watch');

    grunt.initConfig({
        regenerator: {
            jspipe: {}
        },
        watch: {
            files: ['./**/*.js'],
            tasks: ['build']
        }
    });

    // Registers and loads tasks
    grunt.loadTasks('tasks');
    grunt.registerTask('default', ['regenerator']);
    grunt.registerTask('dev', ['regenerator', 'watch']);
};

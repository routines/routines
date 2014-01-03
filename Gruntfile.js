'use strict';

module.exports = function(grunt) {

    grunt.loadNpmTasks('grunt-contrib-watch');

    grunt.initConfig({
        regenerator: {
            jspipe: {
//                options: {
//                    input: './src/jspipe.js',
//                    out: './dist/jspipe.es5.js',
//                    regeneratorOptions: {
//                        includeRuntime: true
//                    }
//                }
            }
        },
        watch: {
            files: ['./src/**/*.js'],
            tasks: ['build']
        }
    });

    // Registers and loads tasks
    grunt.loadTasks('tasks');
    grunt.registerTask('default', ['regenerator']);
    grunt.registerTask('dev', ['regenerator', 'watch']);
};

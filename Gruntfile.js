'use strict';

module.exports = function(grunt) {

    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-karma');

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
        },
        karma: {
            options: {
                configFile: 'karma.conf.js'
            },
            unit: {
                browsers: ['PhantomJS']
            }
        }
    });

    // Registers and loads tasks
    grunt.loadTasks('tasks');
    grunt.registerTask('default', ['regenerator']);
    grunt.registerTask('dev', ['regenerator', 'watch']);
    grunt.registerTask('test', ['regenerator', 'karma']);
};

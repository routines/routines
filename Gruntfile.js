'use strict';

module.exports = function(grunt) {

    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-jasmine');
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

        jshint: {
            options: {
                esnext: true
            },

            all: ['src/**/*.js']
        },

        jasmine: {
            src: 'dist/**/*.js',
            options: {
                specs: 'spec/*-spec.js'
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

    grunt.registerTask('default', ['jshint',
                                   'regenerator']);

    grunt.registerTask('dev', ['jshint',
                               'regenerator',
                               'watch']);
    grunt.registerTask('test', ['regenerator', 'karma']);
};

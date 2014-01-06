'use strict';

module.exports = function(grunt) {

    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-jasmine');
    grunt.loadNpmTasks('grunt-karma');
    grunt.loadNpmTasks('grunt-es6-module-transpiler');

    grunt.initConfig({
        regenerator: {
            jspipe: {
                options: {
                    input: './src/jspipe.js',
                    out: './tmp/jspipe.js',
                    regeneratorOptions: {
                        includeRuntime: false
                    }
                }
            }
        },

        jshint: {
            options: {
                esnext: true
            },

            all: ['src/**/*.js']
        },


        transpile: {

            commonjs: {
                type: 'cjs',
                files: [{ src: ['tmp/jspipe.js'],
                          dest: 'dist-es5/commonjs/jspipe.js' },

                        { src: ['src/jspipe.js'],
                          dest: 'dist-es6/commonjs/jspipe.js' }]
            },

            amd: {
                type: 'amd',
                files: [
                    {
                        expand: true,
                        cwd: 'tmp/',
                        src: ['**/*.js'],
                        dest: 'dist-es5/amd/'
                    },
                    {
                        expand: true,
                        cwd: 'src/',
                        src: ['**/*.js'],
                        dest: 'dist-es6/amd/'
                    }
                ]
            }
        },

        browser: {
            es5: {
                options: {
                    src: ['tmp/jspipe.js'],
                    dest: 'dist-es5/jspipe.js',
                    namespace: 'JSPipe'
                }
            },

            es6: {
                options: {
                    src: ['src/jspipe.js'],
                    dest: 'dist-es6/jspipe.js',
                    namespace: 'JSPipe'
                }
            }
        },

        createGeneratorRuntime: {
            options: {
                dest: 'dist-es5/generator-runtime.js'
            }
        },

        jasmine: {
            src: 'dist-es5/jspipe.js',
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
                browsers: ['Chrome']
            }
        }
    });

    // Registers and loads tasks
    grunt.loadTasks('tasks');

    grunt.registerTask('default', ['jshint',
                                   'ensureBuildDirectories',
                                   'regenerator',
                                   'createGeneratorRuntime',
                                   'browser',
                                   'transpile' ]);



    grunt.registerTask('dev', ['jshint',
                               'ensureBuildDirectories',
                               'regenerator',
                               'createGeneratorRuntime',
                               'browser',
                               'transpile',
                               'watch']);
    grunt.registerTask('test', ['regenerator', 'karma']);
};

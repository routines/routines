'use strict';

module.exports = function(grunt) {

    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-jasmine');
    grunt.loadNpmTasks('grunt-es6-module-transpiler');
    grunt.loadNpmTasks('grunt-markdox');

    grunt.initConfig({
        regenerator: {
            jspipe: {
                options: {
                    files: [
                        { src: 'src/jspipe.js', dest: 'tmp/jspipe.js' },
                        { src: 'spec/job-spec.js', dest: 'spec-es5/job-spec.js' },
                        { src: 'spec/pipe-spec.js', dest: 'spec-es5/pipe-spec.js' },
                        { src: 'spec/pipe_producers-spec.js', dest: 'spec-es5/pipe_producers-spec.js' },
                        { src: 'spec/eventpipe-spec.js', dest: 'spec-es5/eventpipe-spec.js' }
                    ],
                    regeneratorOptions: {
                        includeRuntime: false
                    }
                }
            },


            demos: {
                options: {
                    files: [
                        { src: 'demos/web/es6/autocomplete.js', dest: 'demos/web/es5/autocomplete.js' },
                        { src: 'demos/web/es6/jobWaitsForAnother.js', dest: 'demos/web/es5/jobWaitsForAnother.js' },
                        { src: 'demos/web/es6/select.js', dest: 'demos/web/es5/select.js' },
                        { src: 'demos/web/es6/simultaneous-processes.js', dest: 'demos/web/es5/simultaneous-processes.js' }
                        
                    ],
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


        markdox: {
            jspipe: {
                src: 'src/jspipe.js',
                dest: 'docs/jspipe.md'
            }
        },


        jasmine: {
            src: ['dist-es5/generator-runtime.js',
                  'dist-es5/jspipe.js'],
            options: {
                specs: 'spec-es5/*-spec.js'
            }
        },


        watch: {
            files: ['./src/**/*.js'],
            tasks: ['build']
        }

    });

    // Registers and loads tasks
    grunt.loadTasks('tasks');

    grunt.registerTask('build', ['jshint',
                                 'ensureBuildDirectories',
                                 'ensureSpecDirectories',
                                 'regenerator',
                                 'createGeneratorRuntime',
                                 'browser',
                                 'transpile'
                                ]);


    grunt.registerTask('dev', ['build', 'watch']);
    
    grunt.registerTask('default', ['build']);
};

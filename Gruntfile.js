'use strict';

module.exports = function(grunt) {

    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-jasmine');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-es6-module-transpiler');
    grunt.loadNpmTasks('grunt-markdox');

    grunt.initConfig({
        clean: {
            docs: ['docs/']
        },

        regenerator: {
            routines: {
                options: {
                    files: [
                        { src: 'src/routines.js', dest: 'tmp/routines.js' },
                        { src: 'spec/go-spec.js', dest: 'spec-es5/go-spec.js' },
                        { src: 'spec/chan-spec.js', dest: 'spec-es5/chan-spec.js' },
                        { src: 'spec/chan_producers-spec.js', dest: 'spec-es5/chan_producers-spec.js' },
                        { src: 'spec/eventchan-spec.js', dest: 'spec-es5/eventchan-spec.js' },

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
                files: [{ src: ['tmp/routines.js'],
                          dest: 'dist-es5/commonjs/routines.js' },

                        { src: ['src/routines.js'],
                          dest: 'dist-es6/commonjs/routines.js' }]
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
                    src: ['tmp/routines.js'],
                    dest: 'dist-es5/routines.js',
                    namespace: 'Routines'
                }
            },

            es6: {
                options: {
                    src: ['src/routines.js'],
                    dest: 'dist-es6/routines.js',
                    namespace: 'Routines'
                }
            }
        },

        createGeneratorRuntime: {
            options: {
                dest: 'dist-es5/generator-runtime.js'
            }
        },

        jasmine: {
            src: ['dist-es5/generator-runtime.js',
                  'dist-es5/routines.js'],
            options: {
                specs: 'spec-es5/*-spec.js'
            }
        },

        markdox: {
            options: {
                template: 'markdox-template.md.ejs'
            },

            routines: {
                src: 'src/routines.js',
                dest: 'docs/routines.md'
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

    grunt.registerTask('docs', ['clean', 'markdox']);

    grunt.registerTask('default', ['build']);
};

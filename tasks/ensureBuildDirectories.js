var fs = require('fs');

module.exports = function(grunt) {

    grunt.registerTask('ensureBuildDirectories', 'Ensure Build Directories exist', function() {

        
        if (!fs.existsSync('tmp')) {
            fs.mkdirSync('tmp');
        }

        if (!fs.existsSync('dist-es5')) {
            fs.mkdirSync('dist-es5');
        }

        if (!fs.existsSync('dist-es6')) {
            fs.mkdirSync('dist-es6');
        }
    });

};
